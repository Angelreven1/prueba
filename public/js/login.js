// public/js/login.js

// ==========================================
// 1. LÓGICA PARA INICIAR SESIÓN (LOGIN)
// ==========================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const correo = document.getElementById('loginCorreo').value;
    const contrasena = document.getElementById('loginContrasena').value;
    const msg = document.getElementById('msgLogin');

    try {
        const respuesta = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            msg.textContent = datos.error;
            msg.style.color = 'red';
        } else {
            // Guardamos los datos de la sesión en el navegador
            sessionStorage.setItem('usuarioNombre', datos.usuario.nombre);
            sessionStorage.setItem('usuarioRol', datos.usuario.rol);

            // Redirección exacta a la ruta que Express ya conoce
            window.location.href = '/views/inicio.html';
        }
    } catch (error) {
        msg.textContent = 'Error al conectar con el servidor.';
        msg.style.color = 'red';
    }
});

// ==========================================
// 2. LÓGICA PARA CREAR USUARIO (REGISTRO)
// ==========================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const nombre = document.getElementById('regNombre').value;
    const correo = document.getElementById('regCorreo').value;
    const contrasena = document.getElementById('regContrasena').value;
    const rol = document.getElementById('regRol').value;
    const msg = document.getElementById('msgRegister');

    try {
        const respuesta = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, correo, contrasena, rol })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            msg.textContent = datos.error;
            msg.style.color = 'red';
        } else {
            msg.textContent = '¡Usuario creado con éxito! Ya puedes iniciar sesión.';
            msg.style.color = 'green';
            document.getElementById('registerForm').reset(); // Limpia el formulario
        }
    } catch (error) {
        msg.textContent = 'Error al conectar con el servidor.';
        msg.style.color = 'red';
    }
});