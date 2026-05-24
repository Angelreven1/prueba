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
    password: process.env.DB_PASSWORD, 
    database: 'defaultdb',
    port: 21826, 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true, 
    ssl: {
        rejectUnauthorized: false 
    }
});

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
            connection.release(); 
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
// RUTAS DEL LOGIN, REGISTRO Y USUARIOS
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

app.get('/api/usuarios', (req, res) => {
    const sql = 'SELECT id, nombre, correo, rol FROM usuarios ORDER BY id ASC';
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =========================================================================
// RUTAS DE PRODUCTOS E INVENTARIO
// =========================================================================
app.get('/productos', (req, res) => {
    pool.query(`SELECT * FROM productos`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

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
// REGISTRO DE LOTES DE PRODUCCIÓN + GRÁFICA REAL
// =========================================================================
app.get('/api/produccion/resumen-graficas', (req, res) => {
    const sql = `
        SELECT p.modelo, SUM(o.cantidad) AS total_producido 
        FROM ordenes_produccion o
        JOIN productos p ON o.producto_id = p.id
        GROUP BY p.modelo
    `;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const modelos = results.map(r => r.modelo);
        const cantidades = results.map(r => r.total_producido);
        res.json({ modelos, cantidades });
    });
});

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

    pool.query(`SELECT materia_prima_id, cantidad_requerida FROM recetas_producto WHERE producto_id = ?`, [producto_id], (err, ingredientes) => {
        if (err) return res.status(500).json({ mensaje: "Error al consultar la receta del modelo" });

        pool.query(`INSERT INTO ordenes_produccion (usuario_id, producto_id, cantidad) VALUES (?, ?, ?)`, [usuario_id, producto_id, cantidad], (err, result) => {
            if (err) return res.status(500).json({ mensaje: "Error al generar la orden de producción" });

            if (ingredientes && ingredientes.length > 0) {
                ingredientes.forEach(ing => {
                    const totalDescontar = ing.cantidad_requerida * cantidad;
                    pool.query(`UPDATE materia_prima SET cantidad_stock = cantidad_stock - ? WHERE id = ?`, [totalDescontar, ing.materia_prima_id]);
                });
            }

            pool.query(`SELECT id FROM inventario WHERE producto_id = ? AND talla = ? AND color = ?`, [producto_id, talla, color], (err, invRows) => {
                if (err) return res.status(500).json({ mensaje: "Error al verificar stock existente" });

                if (invRows && invRows.length > 0) {
                    pool.query(`UPDATE inventario SET cantidad = cantidad + ? WHERE id = ?`, [cantidad, invRows[0].id], (err) => {
                        if (err) return res.status(500).json({ mensaje: "Error al actualizar stock" });
                        res.status(201).json({ mensaje: "Producción completada con éxito. Stock incrementado." });
                    });
                } else {
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
    pool.query(`SELECT id, material, cantidad_stock, unidad_medida FROM materia_prima`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/materiaprima', (req, res) => {
    const { material, cantidad_stock, unidad_medida } = req.body;
    const sql = `INSERT INTO materia_prima (material, cantidad_stock, unidad_medida) VALUES (?, ?, ?)`;
    pool.query(sql, [material, cantidad_stock, unidad_medida], (err, result) => {
        if (err) return res.status(500).json({ mensaje: `Error de BD: ${err.message}` });
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

// =========================================================================
// 🤖 ENDPOINT DE INTELIGENCIA ARTIFICIAL (GEMINI AI INTEGRADO)
// =========================================================================
app.post('/api/ia/consultar', (req, res) => {
    const { pregunta, usuario } = req.body;

    // Consultamos el estado actual del inventario e insumos para darle contexto real a Gemini
    pool.query('SELECT material, cantidad_stock, unidad_medida FROM materia_prima', (errMateria, insumos) => {
        pool.query('SELECT p.modelo, i.talla, i.color, i.cantidad FROM inventario i JOIN productos p ON i.producto_id = p.id', (errInv, stockFisico) => {
            
            // Creamos un reporte de contexto limpio para inyectarle a la IA
            const contextoInsumos = (insumos || []).map(i => `• ${i.material}: ${i.cantidad_stock} ${i.unidad_medida}`).join('\n');
            const contextoInventario = (stockFisico || []).map(s => `• ${s.modelo} (Talla ${s.talla}, Color ${s.color}): ${s.cantidad} pares`).join('\n');

            const promptCompleto = `
                Eres el asistente virtual de la Fábrica de Tenis Smart Manufacturing.
                El usuario actual autenticado es: ${usuario}.
                
                ESTADO ACTUAL DEL ALMACÉN (DATOS REALES EN VIVO):
                Materia Prima Disponible:
                ${contextoInsumos || 'No hay insumos registrados.'}
                
                Producto Terminado Listo para la Venta:
                ${contextoInventario || 'No hay calzado fabricado en existencias.'}
                
                Pregunta del usuario: "${pregunta}"
                
                Responde de forma concisa, ejecutiva y amigable, basándote estrictamente en los datos numéricos provistos arriba.
            `;

            // Enlace de conexión directa con la API oficial de Gemini Pro
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

            if (!GEMINI_API_KEY) {
                return res.json({ respuesta: "🤖 Hola. El backend está listo, pero la variable GEMINI_API_KEY no está configurada en Render." });
            }

            fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptCompleto }] }]
                })
            })
            .then(response => response.json())
            .then(data => {
                const respuestaIA = data.candidates[0].content.parts[0].text;
                res.json({ respuesta: respuestaIA });
            })
            .catch(error => {
                res.status(500).json({ respuesta: "Ocurrió un inconveniente al conectar con el servicio de Gemini." });
            });
        });
    });
});

app.get('/ping', (req, res) => res.send('🚀 Servidor MySQL en Aiven respondiendo correctamente.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Servidor de producción escuchando en el puerto: ${PORT}`));