const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// =========================================================================
// CONFIGURACIÓN DE CONEXIÓN A MYSQL EN LA NUBE (AIVEN)
// =========================================================================

const pool = mysql.createPool({
    host: 'mysql-2cd04939-smart-tenis.j.aivencloud.com', 
    user: 'avnadmin',
    password: process.env.DB_PASSWORD, // Toma de forma segura la clave configurada en Render
    database: 'defaultdb',
    port: 21826, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true, // Permite que schema.sql ejecute todas las tablas juntas
    ssl: {
        rejectUnauthorized: false // Obligatorio para que Aiven acepte la conexión segura
    }
});

// Verificar conexión en el arranque e inicializar tablas en la nube
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error crítico conectando a MySQL en Aiven:', err.message);
    } else {
        console.log('🚀 Conexión exitosa y segura establecida con MySQL en AivenCloud');
        inicializarBaseDeDatos(connection);
    }
});

function inicializarBaseDeDatos(connection) {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        connection.query(schemaSql, (err) => {
            connection.release(); // Devolver siempre la conexión al pool
            if (err) {
                console.error('❌ Error al estructurar tablas MySQL:', err.message);
            } else {
                console.log('✅ Estructura de tablas MySQL verificada con éxito en la nube de Aiven.');
            }
        });
    } else {
        connection.release();
        console.log('⚠️ No se encontró el archivo database/schema.sql. Se omite la inicialización.');
    }
}

// =========================================================================
// RUTAS DEL LOGIN Y REGISTRO DINÁMICO POR ROLES
// =========================================================================
app.post('/login', (req, res) => {
    const { correo, contrasena } = req.body;
    const sql = `SELECT id, nombre, correo, rol FROM usuarios WHERE correo = ? AND contrasena = ?`;
    pool.query(sql, [correo, contrasena], (err, results) => {
        if (err) return res.status(500).json({ mensaje: "Error interno en el servidor" });
        if (results.length > 0) {
            res.json({ mensaje: "Valido", usuario: results[0] });
        } else {
            res.status(401).json({ mensaje: "Invalido" });
        }
    });
});

app.post('/register', (req, res) => {
    const { nombre, correo, contrasena, rol } = req.body;
    const sql = `INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?, ?, ?, ?)`;
    pool.query(sql, [nombre, correo, contrasena, rol || 'user'], (err, result) => {
        if (err) {
            if (err.message.includes('ER_DUP_ENTRY')) {
                return res.status(400).json({ mensaje: "El correo electrónico ya se encuentra registrado" });
            }
            return res.status(500).json({ mensaje: "Error al registrar usuario" });
        }
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

// =========================================================================
// RUTAS DE PRODUCTOS (CATÁLOGO DE MODELOS)
// =========================================================================
app.get('/productos', (req, res) => {
    pool.query(`SELECT * FROM productos`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/productos', (req, res) => {
    const { modelo, descripcion, precio_venta, costo_produccion, proveedor_id } = req.body;
    const sql = `INSERT INTO productos (modelo, descripcion, precio_venta, costo_produccion, proveedor_id) VALUES (?, ?, ?, ?, ?)`;
    pool.query(sql, [modelo, descripcion, precio_venta, costo_produccion, proveedor_id || null], (err, result) => {
        if (err) {
            if (err.message.includes('ER_DUP_ENTRY')) {
                return res.status(400).json({ mensaje: "Este modelo de tenis ya existe en el catálogo" });
            }
            return res.status(500).json({ mensaje: "Error al guardar el producto" });
        }
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

// =========================================================================
// RUTAS DE INVENTARIO (VARIANTES DISPONIBLES)
// =========================================================================
app.get('/inventario', (req, res) => {
    const sql = `
        SELECT i.id, p.modelo, i.talla, i.color, i.cantidad 
        FROM inventario i 
        JOIN productos p ON i.producto_id = p.id
    `;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =========================================================================
// REGISTRO DE LOTES DE PRODUCCIÓN + AUTOMATIZACIÓN DE STOCK E INSUMOS
// =========================================================================
app.get('/ordenes', (req, res) => {
    const sql = `
        SELECT o.id, u.nombre AS operario, p.modelo, o.cantidad, o.fecha, o.estado 
        FROM ordenes_produccion o 
        JOIN usuarios u ON o.usuario_id = u.id 
        JOIN productos p ON o.producto_id = p.id 
        ORDER BY o.fecha DESC
    `;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/ordenes', (req, res) => {
    const { usuario_id, producto_id, cantidad, talla, color } = req.body;

    // 1. Obtener la receta del calzado para saber qué consume
    pool.query(`SELECT materia_prima_id, cantidad_requerida FROM recetas_producto WHERE producto_id = ?`, [producto_id], (err, ingredientes) => {
        if (err) return res.status(500).json({ mensaje: "Error al consultar la receta del modelo" });

        // 2. Insertar el nuevo lote de producción
        pool.query(`INSERT INTO ordenes_produccion (usuario_id, producto_id, cantidad) VALUES (?, ?, ?)`, [usuario_id, producto_id, cantidad], (err, result) => {
            if (err) return res.status(500).json({ mensaje: "Error al generar la orden de producción" });

            // 3. Descontar la materia prima de forma proporcional a la cantidad fabricada
            if (ingredientes && ingredientes.length > 0) {
                ingredientes.forEach(ing => {
                    const totalDescontar = ing.cantidad_requerida * cantidad;
                    pool.query(`UPDATE materia_prima SET cantidad_stock = cantidad_stock - ? WHERE id = ?`, [totalDescontar, ing.materia_prima_id]);
                });
            }

            // 4. Sumar el lote fabricado al inventario físico (Variantes de talla y color)
            pool.query(`SELECT id FROM inventario WHERE producto_id = ? AND talla = ? AND color = ?`, [producto_id, talla, color], (err, invRows) => {
                if (err) return res.status(500).json({ mensaje: "Error al verificar stock existente" });

                if (invRows && invRows.length > 0) {
                    // Si ya existe ese modelo en esa talla y color, aumentamos las piezas
                    pool.query(`UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?`, [cantidad, invRows[0].id], (err) => {
                        if (err) return res.status(500).json({ mensaje: "Error al actualizar stock" });
                        res.status(201).json({ mensaje: "Producción completada con éxito. Stock incrementado." });
                    });
                } else {
                    // Si es una variante totalmente nueva, abrimos el registro físico
                    pool.query(`INSERT INTO inventario (producto_id, talla, color, cantidad) VALUES (?, ?, ?, ?)`, [producto_id, talla, color, cantidad], (err) => {
                        if (err) return res.status(500).json({ mensaje: "Error al registrar nueva variante" });
                        res.status(201).json({ mensaje: "Producción completada con éxito. Variante nueva añadida." });
                    });
                }
            });
        });
    });
});

// =========================================================================
// RUTAS DE MATERIA PRIMA
// =========================================================================
app.get('/materiaprima', (req, res) => {
    pool.query(`SELECT * FROM materia_prima`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ✨ LA RUTA QUE FALTABA: Lista para guardar y atrapar cualquier error limpiamente ✨
app.post('/materiaprima', (req, res) => {
    const { material, cantidad_stock, unidad_medida } = req.body;
    
    // Intentamos guardar con la columna 'nombre'
    const sql = `INSERT INTO materia_prima (nombre, cantidad_stock, unidad_medida) VALUES (?, ?, ?)`;
    
    pool.query(sql, [material, cantidad_stock, unidad_medida], (err, result) => {
        if (err) {
            console.error("❌ Error en MySQL:", err.message);
            
            // Si el error dice que la columna 'nombre' no existe, probamos automáticamente con 'material'
            if (err.message.includes("Unknown column 'nombre'")) {
                const sqlFallback = `INSERT INTO materia_prima (material, cantidad_stock, unidad_medida) VALUES (?, ?, ?)`;
                return pool.query(sqlFallback, [material, cantidad_stock, unidad_medida], (errFallback, resultFallback) => {
                    if (errFallback) {
                        return res.status(500).json({ mensaje: `Error de BD: ${errFallback.message}` });
                    }
                    return res.status(201).json({ mensaje: "Creado", id: resultFallback.insertId });
                });
            }
            
            // Si es otro error (como que falta una llave), lo mandamos en JSON limpio para que el frontend no reviente
            return res.status(500).json({ mensaje: `Error de Base de Datos: ${err.message}` });
        }
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

// Ruta de diagnóstico rápido
app.get('/ping', (req, res) => res.send('🚀 Servidor MySQL en Aiven respondiendo correctamente.'));

// Inicialización del puerto compatible con Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Servidor de producción escuchando en el puerto: ${PORT}`));