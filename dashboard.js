const BACKEND_URL = 'https://servidor-tenis.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('usuario_nombre') || 'Usuario';
    const rol = (localStorage.getItem('usuario_rol') || '').toLowerCase(); 

    const infoUsuario = document.getElementById('nombre-usuario');
    if (infoUsuario) {
        infoUsuario.innerText = `${nombre} (${rol.toUpperCase()})`;
    }

    if (rol === 'admin') {
        document.getElementById('dashboard-admin').style.display = 'block';
        initDashboardAdmin();
    } else if (rol === 'user' || rol === 'cliente') { 
        document.getElementById('dashboard-user').style.display = 'block';
        initDashboardUser();
    } else {
        alert(`Sesión no válida. El rol detectado fue: "${rol}". Redirigiendo al login...`);
        window.location.href = 'index.html'; 
    }

    const formLote = document.getElementById('form-nuevo-lote');
    if (formLote) formLote.addEventListener('submit', registrarLoteBaseDatos);

    const formPersonal = document.getElementById('form-nuevo-personal');
    if (formPersonal) formPersonal.addEventListener('submit', registrarPersonalBaseDatos);

    const formMateria = document.getElementById('form-nueva-materia');
    if (formMateria) formMateria.addEventListener('submit', registrarMateriaBaseDatos);
});

function initDashboardUser() {
    document.getElementById('user-prod-dia').innerText = "180 pares"; 
}

async function initDashboardAdmin() {
    document.getElementById('admin-alertas').innerText = "2 (Suela Goma, Hilo Blanco)";
    try {
        await fetch(`${BACKEND_URL}/ordenes`);
        const fechasSimuladas = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const produccionSimulada = [120, 150, 95, 210, 180]; 
        construirGrafica(fechasSimuladas, produccionSimulada);
    } catch (error) {
        const fechasSimuladas = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const produccionSimulada = [120, 150, 95, 210, 180]; 
        construirGrafica(fechasSimuladas, produccionSimulada);
    }
}

function construirGrafica(etiquetas, datosValores) {
    const ctx = document.getElementById('graficaProduccionAdmin').getContext('2d');
    new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: etiquetas, 
            datasets: [{
                label: 'Lotes de Calzado Producidos (Pares)',
                data: datosValores, 
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)', 'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 99, 132, 0.6)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function abrirModalLote() { document.getElementById('modal-lote').style.display = 'flex'; }
function cerrarModalLote() { document.getElementById('modal-lote').style.display = 'none'; document.getElementById('form-nuevo-lote').reset(); }

function abrirModalPersonal() { document.getElementById('modal-personal').style.display = 'flex'; }
function cerrarModalPersonal() { document.getElementById('modal-personal').style.display = 'none'; document.getElementById('form-nuevo-personal').reset(); }

function abrirModalMateria() { document.getElementById('modal-materia').style.display = 'flex'; }
function cerrarModalMateria() { document.getElementById('modal-materia').style.display = 'none'; document.getElementById('form-nueva-materia').reset(); }

function registrarLoteBaseDatos(e) {
    e.preventDefault();
    const payloadLote = {
        producto_id: parseInt(document.getElementById('lote-producto').value),
        talla: parseFloat(document.getElementById('lote-talla').value),
        color: document.getElementById('lote-color').value.trim(),
        cantidad: parseInt(document.getElementById('lote-cantidad').value),
        usuario_id: parseInt(localStorage.getItem('usuario_id')) || 1 
    };

    fetch(`${BACKEND_URL}/ordenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadLote)
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error en el servidor.');
        return data;
    })
    .then(data => {
        alert('🎉 ¡Lote registrado con éxito! El stock se actualizó en MySQL.');
        cerrarModalLote();
    })
    .catch(err => { alert(`❌ Error al insertar orden: ${err.message}`); });
}

function registrarPersonalBaseDatos(e) {
    e.preventDefault();
    const payloadPersonal = {
        nombre: document.getElementById('personal-nombre').value.trim(),
        correo: document.getElementById('personal-correo').value.trim(),
        contrasena: document.getElementById('personal-contrasena').value,
        rol: document.getElementById('personal-rol').value
    };

    fetch(`${BACKEND_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadPersonal)
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al guardar.');
        return data;
    })
    .then(data => {
        alert('🎉 ¡Colaborador dado de alta exitosamente!');
        cerrarModalPersonal();
    })
    .catch(err => { alert(`❌ Error al registrar colaborador: ${err.message}`); });
}

function registrarMateriaBaseDatos(e) {
    e.preventDefault();
    const payloadMateria = {
        material: document.getElementById('materia-nombre').value.trim(),
        cantidad_stock: parseInt(document.getElementById('materia-stock').value),
        unidad_medida: document.getElementById('materia-unidad').value.trim()
    };

    fetch(`${BACKEND_URL}/materiaprima`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadMateria)
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensaje || 'Error al guardar insumo.');
        return data;
    })
    .then(data => {
        alert('🎉 ¡Insumo registrado con éxito!');
        cerrarModalMateria();
    })
    .catch(err => { alert(`❌ Error al guardar insumo: ${err.message}`); });
}

function cerrarSesion() { localStorage.clear(); window.location.href = 'index.html'; }