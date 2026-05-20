// src/controles/autocontroles.js
const UserModel = require('../modelos/userModel');

const AuthController = {
    // 1. INICIAR SESIÓN
    login: (req, res) => {
        const { correo, contrasena } = req.body;

        if (!correo || !contrasena) {
            return res.status(400).json({ error: 'Por favor, llena todos los campos.' });
        }

        UserModel.buscarPorCorreo(correo, (err, usuario) => {
            if (err) return res.status(500).json({ error: 'Error en el servidor.' });
            if (!usuario) return res.status(401).json({ error: 'El correo o la contraseña son incorrectos.' });

            // Validación directa en texto plano
            if (contrasena !== usuario.contrasena) {
                return res.status(401).json({ error: 'El correo o la contraseña son incorrectos.' });
            }

            // Si todo está bien, respondemos con éxito y sus datos
            return res.status(200).json({
                mensaje: '¡Bienvenido!',
                usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }
            });
        });
    },

    // 2. CREAR USUARIO
    register: (req, res) => {
        const { nombre, correo, contrasena, rol } = req.body;

        if (!nombre || !correo || !contrasena || !rol) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }

        const nuevoUsuario = { nombre, correo, contrasena, rol };

        UserModel.crear(nuevoUsuario, (err, resultado) => {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Este correo ya está registrado.' });
                }
                return res.status(500).json({ error: 'Error al registrar al usuario.' });
            }
            return res.status(201).json({ mensaje: 'Usuario creado con éxito.' });
        });
    }
};

module.exports = AuthController;