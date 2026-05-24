// src/rutas/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controles/autocontroles');

// Ruta para iniciar sesión
router.post('/login', AuthController.login);

// Ruta para crear usuario
router.post('/register', AuthController.register);

module.exports = router;