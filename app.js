// app.js
const express = require('express');
const path = require('path');
const db = require('./config/database'); // Inicializa tu SQLite de tenis
const authRoutes = require('./src/rutas/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares obligatorios para leer JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta public para que cargue el CSS y el JS
app.use(express.static(path.join(__dirname, 'public')));

// app.js

// 1. Cuando entras a http://localhost:3000 -> Carga el login desde la carpeta views
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'index.html'));
});

// 2. 🔥 LA RUTA CORRECTA: Cuando el navegador pida /inicio.html, Express lo busca dentro de views/
app.get('/inicio.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'inicio.html'));
});

// Enlazar las rutas de la API de autenticación
app.use('/api/auth', authRoutes);

// Levantar el servidor
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`==================================================`);
});