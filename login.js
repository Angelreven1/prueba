// =========================================================================
// CONFIGURACIÓN DEL FRONTEND - CONEXIÓN CON RENDER
// =========================================================================

// ⚠️ REEMPLAZA ESTA URL POR LA URL EXACTA QUE TE DÉ RENDER AL CREAR EL SERVICIO
const BACKEND_URL = 'https://servidor-tenis.onrender.com';

// 1. DESPERTADOR AUTOMÁTICO
// Se ejecuta inmediatamente cuando la página de GitHub se abre en el navegador
fetch(`${BACKEND_URL}/ping`)
    .then(() => console.log("El servidor de Render ha respondido al estímulo (Despierto)."))
    .catch((err) => console.log("Despertando al servidor en segundo plano...", err));

// 2. ESCUCHA DEL FORMULARIO DE INICIO DE SESIÓN
// Asegúrate de que en tu HTML el formulario tenga el id="form-login"
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault(); // Evita que la página se recargue e interrumpa el proceso

    // Captura los valores escritos por el usuario (Verifica los id de tus <input>)
    const correo = document.getElementById('input-correo').value;
    const contrasena = document.getElementById('input-pass').value;

    // Petición directa a la base de datos en la nube
    fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ correo, contrasena })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Credenciales incorrectas o error en el servidor');
        }
        return res.json();
    })
    .then(data => {
        // Si el servidor valida los datos de tenis_factory.db con éxito
        alert("¡Inicio de sesión correcto!");
        window.location.href = 'inicio.html'; // Te redirige a la página interna de tu proyecto
    })
    .catch(err => {
        // Si el servidor está apagado o las credenciales no existen, activa el texto rojo
        // Asegúrate de tener una etiqueta con id="mensaje-error" en tu HTML
        const errorMensaje = document.getElementById('mensaje-error');
        if (errorMensaje) {
            errorMensaje.innerText = "Error al conectar con el servidor o datos inválidos.";
        }
        console.error("Fallo en la comunicación con el Backend:", err);
    });
});