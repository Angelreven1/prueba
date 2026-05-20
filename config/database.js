// config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determinamos la ruta física donde se guardará el archivo de la base de datos
const dbPath = path.join(__dirname, '../database/tenis_factory.db');

// Conectamos o creamos el archivo SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar a SQLite:', err.message);
    } else {
        console.log('📦 Conectado exitosamente a la base de datos SQLite.');
        
        // Creamos la tabla de usuarios de forma automática si no existe en el archivo
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            correo TEXT NOT NULL UNIQUE,
            contrasena TEXT NOT NULL,
            rol TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('❌ Error al crear la tabla usuarios:', err.message);
            } else {
                console.log('✅ Tabla "usuarios" verificada/creada con éxito.');
            }
        });
    }
});

module.exports = db;