const BACKEND_URL = 'https://servidor-tenis.onrender.com';

fetch(`${BACKEND_URL}/ping`)
    .then(() => console.log("Servidor en la nube conectado con éxito."))
    .catch((err) => console.log("Despertando servidor en Render...", err));

// LÓGICA PARA INICIAR SESIÓN
document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const correo = document.getElementById('input-correo').value;
    const contrasena = document.getElementById('input-pass').value;

    fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena })
    })
    .then(res => {
        if (!res.ok) throw new Error('Credenciales incorrectas');
        return res.json();
    })
    .then(data => {
        alert("¡Inicio de sesión correcto!");
        
        // ========================================================
        // 🚀 SE AGREGA EL ALMACENAMIENTO COMPLETO DE VARIABLES Real
        // ========================================================
        localStorage.setItem('usuario_id', data.usuario.id); // 🌟 ¡Importante para tus órdenes!
        localStorage.setItem('usuario_rol', data.usuario.rol); 
        localStorage.setItem('usuario_nombre', data.usuario.nombre);

        // Ahora sí, redirige a la página dinámica
        window.location.href = 'inicio.html';
    })
    .catch(err => {
        document.getElementById('mensaje-error').innerText = "Error de conexión o credenciales inválidas.";
    });
});

// LÓGICA PARA CREAR USUARIO
document.getElementById('form-registro').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const correo = document.getElementById('reg-correo').value;
    const contrasena = document.getElementById('reg-pass').value;
    const rol = document.getElementById('reg-rol').value;

    fetch(`${BACKEND_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo, contrasena, rol })
    })
    .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.mensaje); });
        return res.json();
    })
    .then(data => {
        alert("¡Usuario creado con éxito!");
        document.getElementById('form-registro').reset();
    })
    .catch(err => {
        document.getElementById('mensaje-error-registro').innerText = err.message;
    });
});

// LÓGICA PARA REGISTRAR PRODUCTO NUEVO
const formTenis = document.getElementById('form-nuevo-tenis');
if (formTenis) {
    formTenis.addEventListener('submit', (e) => {
        e.preventDefault();
        const modelo = document.getElementById('tenis-modelo').value;
        const descripcion = document.getElementById('tenis-desc').value;
        const precio_venta = parseFloat(document.getElementById('tenis-precio').value);
        const costo_produccion = parseFloat(document.getElementById('tenis-costo').value);
        const proveedor_id = document.getElementById('tenis-proveedor').value;

        fetch(`${BACKEND_URL}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelo, descripcion, precio_venta, costo_produccion, proveedor_id: proveedor_id ? parseInt(proveedor_id) : null })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.mensaje); });
            return res.json();
        })
        .then(() => {
            alert("¡Tenis guardado exitosamente!");
            formTenis.reset();
        });
    });
}