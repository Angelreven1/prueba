// src/modelos/userModel.js
const db = require('../../config/database');

const UserModel = {
    // Para el Login: Buscar usuario por correo
    buscarPorCorreo: (correo, callback) => {
        const query = `SELECT * FROM usuarios WHERE correo = ?`;
        db.get(query, [correo], (err, row) => {
            if (err) return callback(err, null);
            return callback(null, row);
        });
    },

    // Para el Registro: Crear nuevo usuario
    crear: (nuevoUsuario, callback) => {
        const { nombre, correo, contrasena, rol } = nuevoUsuario;
        const query = `INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?, ?, ?, ?)`;
        
        db.run(query, [nombre, correo, contrasena, rol], function(err) {
            if (err) return callback(err, null);
            return callback(null, { id: this.lastID });
        });
    }
};

module.exports = UserModel;