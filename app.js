const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

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
    ssl: { rejectUnauthorized: false }
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
    }
}

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
            if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('ER_DUP_ENTRY'))) {
                return res.status(400).json({ mensaje: "El correo electrónico ya se encuentra registrado" });
            }
            return res.status(500).json({ mensaje: "Error al registrar usuario" });
        }
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

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
            if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('ER_DUP_ENTRY'))) {
                return res.status(400).json({ mensaje: "Este modelo de tenis ya existe en el catálogo" });
            }
            return res.status(500).json({ mensaje: "Error al guardar el producto" });
        }
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

app.get('/inventario', (req, res) => {
    const sql = `SELECT i.id, p.modelo, i.talla, i.color, i.cantidad FROM inventario i JOIN productos p ON i.producto_id = p.id`;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/ordenes', (req, res) => {
    const sql = `SELECT o.id, u.nombre AS operario, p.modelo, o.cantidad, o.fecha, o.estado FROM ordenes_produccion o JOIN usuarios u ON o.usuario_id = u.id JOIN productos p ON o.producto_id = p.id ORDER BY o.fecha DESC`;
    pool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/ordenes', (req, res) => {
    const { usuario_id, producto_id, cantidad, talla, color } = req.body;
    if (!usuario_id || !producto_id || !cantidad || !talla || !color) {
        return res.status(400).json({ mensaje: "Faltan campos obligatorios." });
    }

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
                        res.json({ mensaje: "Producción completada con éxito. Stock incrementado." });
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

app.get('/materiaprima', (req, res) => {
    pool.query(`SELECT * FROM materia_prima`, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/materiaprima', (req, res) => {
    const { material, cantidad_stock, unidad_medida } = req.body;
    const sql = `INSERT INTO materia_prima (material, cantidad_stock, unidad_medida) VALUES (?, ?, ?)`;
    pool.query(sql, [material, cantidad_stock, unidad_medida], (err, result) => {
        if (err) return res.status(500).json({ mensaje: "Error al registrar el insumo en la base de datos." });
        res.status(201).json({ mensaje: "Creado", id: result.insertId });
    });
});

app.get('/ping', (req, res) => res.send('🚀 Servidor MySQL en Aiven respondiendo correctamente.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Servidor de producción escuchando en el puerto: ${PORT}`));