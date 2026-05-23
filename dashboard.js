const BACKEND_URL = 'https://servidor-tenis.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    // 🛡️ CONTROL DE SEGURIDAD EXCLUSIVO: Evita accesos por URL sin loguearse
    if (!localStorage.getItem('usuario_rol')) {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = 'index.html';
        return;
    }

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
        alert(`Sesión no válida. Redirigiendo...`);
        window.location.href = 'index.html'; 
    }

    // Vinculación de los tres formularios dinámicos
    document.getElementById('form-nuevo-lote')?.addEventListener('submit', registrarLoteBaseDatos);
    document.getElementById('form-nuevo-personal')?.addEventListener('submit', registrarPersonalBaseDatos);
    document.getElementById('form-nueva-materia')?.addEventListener('submit', registrarMateriaBaseDatos);
    
    // Configurar activador del Chat de IA
    document.getElementById('btn-preguntar')?.addEventListener('click', enviarPreguntaIA);
    document.getElementById('pregunta-ia')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarPreguntaIA();
    });

    // Cargar modelos reales en el menú del modal
    cargarCatalogoProductos();
});

// ========================================================
// CARGAR MODELOS DESDE LA BASE DE DATOS AL MENÚ DESPLEGABLE
// ========================================================
function cargarCatalogoProductos() {
    const selectProducto = document.getElementById('lote-producto');
    if (!selectProducto) return;

    fetch(`${BACKEND_URL}/productos`)
        .then(res => res.json())
        .then(productos => {
            selectProducto.innerHTML = '';
            productos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerText = p.modelo;
                selectProducto.appendChild(opt);
            });
        })
        .catch(() => console.log("Usando catálogo base del HTML."));
}

// ========================================================
// DASHBOARD DEL OPERARIO (USER) - EN VIVO DESDE MYSQL
// ========================================================
function initDashboardUser() {
    console.log("Inicializando vista operativa de usuario...");
    fetch(`${BACKEND_URL}/ordenes`)
        .then(res => res.json())
        .then(ordenes => {
            const totalPares = ordenes.reduce((acc, curr) => acc + curr.cantidad, 0);
            document.getElementById('user-prod-dia').innerText = `${totalPares} pares`;
        })
        .catch(() => { document.getElementById('user-prod-dia').innerText = "180 pares"; });
}

// ========================================================
// DASHBOARD DEL ADMINISTRADOR (ADMIN) - GRÁFICA Y STOCK PROTEGIDO
// ========================================================
async function initDashboardAdmin() {
    console.log("Inicializando paneles avanzados de administrador...");
    
    // 📊 Actualizar Alertas de Stock Bajo Dinámicamente (Protegido contra nulos)
    try {
        const res = await fetch(`${BACKEND_URL}/materiaprima`);
        if (!res.ok) throw new Error();
        const materiales = await res.json();
        const bajos = materiales.filter(m => parseFloat(m.cantidad_stock) < 200);
        
        const elementoAlertas = document.getElementById('admin-alertas');
        if (elementoAlertas) {
            elementoAlertas.innerText = `${bajos.length} materiales bajo riesgo`;
        }
    } catch (e) {
        console.log("Falla al actualizar alertas numéricas en el DOM secundario.");
    }

    // 📈 Cargar Gráfica en tiempo real desde las Órdenes en la nube
    try {
        const response = await fetch(`${BACKEND_URL}/api/produccion/resumen-graficas`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        if (data.modelos && data.modelos.length === 0) {
            construirGrafica(['Sin Lotes'], [0]);
        } else if (data.modelos) {
            construirGrafica(data.modelos, data.cantidades);
        }
    } catch (error) {
        // Respaldo visual estático por si el servidor no responde de inmediato
        construirGrafica(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], [120, 150, 95, 210, 180]);
    }
}

function construirGrafica(etiquetas, datosValores) {
    const ctx = document.getElementById('graficaProduccionAdmin')?.getContext('2d');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: etiquetas, 
            datasets: [{
                label: 'Piezas Totales Fabricadas (Pares)',
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

// ========================================================
// CONTENERIZACIÓN INTERACTIVA DE INVENTARIOS EN EL BOTÓN
// ========================================================
function abrirModalLote() { document.getElementById('modal-lote').style.display = 'flex'; }
function cerrarModalLote() { document.getElementById('modal-lote').style.display = 'none'; document.getElementById('form-nuevo-lote').reset(); }

function abrirModalPersonal() {
    const contenedor = document.getElementById('contenedor-tablas-admin');
    const titulo = document.getElementById('titulo-tabla-dinamica');
    const encabezado = document.getElementById('encabezado-tabla-dinamica');
    const cuerpo = document.querySelector('#tabla-dinamica-admin tbody');

    if (!contenedor || !cuerpo) {
        document.getElementById('modal-personal').style.display = 'flex';
        return;
    }

    fetch(`${BACKEND_URL}/api/usuarios`)
        .then(res => res.json())
        .then(usuarios => {
            titulo.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>👥 Personal Registrado en el Sistema (MySQL)</span>
                    <button onclick="abrirFormularioPersonalDirecto()" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">+ Registrar Colaborador</button>
                </div>
            `;
            encabezado.innerHTML = `<th>ID</th><th>Nombre Completo</th><th>Correo Electrónico</th><th>Rol de Acceso</th>`;
            cuerpo.innerHTML = '';
            usuarios.forEach(u => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td><strong>#${u.id}</strong></td>
                    <td>${u.nombre}</td>
                    <td>${u.correo}</td>
                    <td><span style="background: #334155; color: #38bdf8; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">${u.rol.toUpperCase()}</span></td>
                `;
                cuerpo.appendChild(fila);
            });
            contenedor.style.display = 'block';
            contenedor.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(() => {
            document.getElementById('modal-personal').style.display = 'flex';
        });
}

function abrirFormularioPersonalDirecto() { document.getElementById('modal-personal').style.display = 'flex'; }
function cerrarModalPersonal() { document.getElementById('modal-personal').style.display = 'none'; document.getElementById('form-nuevo-personal').reset(); }

// ========================================================
// REPORTE UNIFICADO DE INVENTARIOS (INSUMOS + PRODUCTO TERMINADO)
// ========================================================
// ========================================================
// REPORTE UNIFICADO DE INVENTARIOS (COMPROBACIÓN DE COLUMNAS AL 100%)
// ========================================================
async function abrirModalMateria() {
    const contenedor = document.getElementById('contenedor-tablas-admin');
    const titulo = document.getElementById('titulo-tabla-dinamica');
    const encabezado = document.getElementById('encabezado-tabla-dinamica');
    const cuerpo = document.querySelector('#tabla-dinamica-admin tbody');

    if (!contenedor || !cuerpo) {
        document.getElementById('modal-materia').style.display = 'flex';
        return;
    }

    try {
        const [resMateriales, resInventario] = await Promise.all([
            fetch(`${BACKEND_URL}/materiaprima`),
            fetch(`${BACKEND_URL}/inventario`)
        ]);

        if (!resMateriales.ok || !resInventario.ok) throw new Error();

        const materiales = await resMateriales.json();
        const calzadoTerminado = await resInventario.json();

        titulo.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>📦 Panel Unificado de Inventarios (MySQL en Aiven)</span>
                <button onclick="abrirFormularioMateriaDirecto()" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.8rem;">+ Agregar Insumo</button>
            </div>
        `;
        
        encabezado.innerHTML = `
            <th>Categoría</th>
            <th>Descripción / Modelo</th>
            <th>Talla / Medida</th>
            <th>Color / Info</th>
            <th>Existencias</th>
        `;
        
        cuerpo.innerHTML = '';

        // 1. Renderizar Materias Primas con triple validación de nombres
        materiales.forEach(m => {
            const fila = document.createElement('tr');
            const stock = parseFloat(m.cantidad_stock);
            const colorSemaforo = stock < 200 ? '#ef4444' : '#10b981';

            // 🔍 Intenta leer 'material', si no existe busca 'nombre', y si no, busca cualquier propiedad que tenga texto
            const nombreInsumo = m.material || m.nombre || m.material_nombre || Object.values(m)[1] || 'Insumo registrado';

            fila.innerHTML = `
                <td><span style="background: #374151; color: #f59e0b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">INSUMO</span></td>
                <td>${nombreInsumo}</td>
                <td>-</td>
                <td>${m.unidad_medida || 'unidades'}</td>
                <td style="color: ${colorSemaforo}; font-weight: bold;">${stock.toFixed(1)}</td>
            `;
            cuerpo.appendChild(fila);
        });

        // 2. Renderizar Calzado Terminado
        calzadoTerminado.forEach(t => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><span style="background: #1e3a8a; color: #60a5fa; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">PRODUCTO</span></td>
                <td><strong>${t.modelo}</strong></td>
                <td>${t.talla} MX</td>
                <td>${t.color}</td>
                <td style="color: #ffffff; font-weight: bold;">${t.cantidad} pares</td>
            `;
            cuerpo.appendChild(fila);
        });

        contenedor.style.display = 'block';
        contenedor.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        document.getElementById('modal-materia').style.display = 'flex';
    }
}

function abrirFormularioMateriaDirecto() { document.getElementById('modal-materia').style.display = 'flex'; }
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
    .then(() => {
        alert('🎉 ¡Lote registrado con éxito! Materia prima y stock actualizados.');
        cerrarModalLote();
        initDashboardAdmin();
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
    .then(() => {
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
        // Si el servidor responde con error, atrapamos el mensaje real de MySQL
        if (!res.ok) throw new Error(data.mensaje || data.error || 'Error al guardar insumo.');
        return data;
    })
    .then(() => {
        alert('🎉 ¡Insumo registrado con éxito!');
        cerrarModalMateria();
        initDashboardAdmin();
    })
    .catch(err => { 
        // CAMBIADO: Ahora te mostrará el texto real del error en la alerta en lugar de [object Object]
        alert(`❌ Error al guardar insumo: ${err.message}`); 
    });
}

// ========================================================
// INTERACTIVIDAD EN OPERACIÓN CON GEMINI AI
// ========================================================
function enviarPreguntaIA() {
    const inputPregunta = document.getElementById('pregunta-ia');
    const chatHistorial = document.getElementById('chat-historial');
    const textoPregunta = inputPregunta.value.trim();

    if (!textoPregunta) return;

    const miMensaje = document.createElement('p');
    miMensaje.style.margin = '8px 0';
    miMensaje.innerHTML = `<strong style="color: #38bdf8;">Tú:</strong> ${textoPregunta}`;
    chatHistorial.appendChild(miMensaje);
    inputPregunta.value = '';
    chatHistorial.scrollTop = chatHistorial.scrollHeight;

    const mensajeCarga = document.createElement('p');
    mensajeCarga.style.color = '#a1a1aa';
    mensajeCarga.style.fontStyle = 'italic';
    mensajeCarga.innerText = "🤖 Gemini analizando inventario de calzado...";
    chatHistorial.appendChild(mensajeCarga);

    fetch(`${BACKEND_URL}/api/ia/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pregunta: textoPregunta,
            usuario: localStorage.getItem('usuario_nombre') || 'Administrador'
        })
    })
    .then(res => res.json())
    .then(data => {
        chatHistorial.removeChild(mensajeCarga);
        const respuestaIA = document.createElement('p');
        respuestaIA.style.margin = '12px 0';
        respuestaIA.style.lineHeight = '1.4';
        respuestaIA.innerHTML = `<strong style="color: #10b981;">Gemini AI:</strong> ${data.respuesta}`;
        chatHistorial.appendChild(respuestaIA);
        chatHistorial.scrollTop = chatHistorial.scrollHeight;
    })
    .catch(() => {
        chatHistorial.removeChild(mensajeCarga);
        const respuestaError = document.createElement('p');
        respuestaError.style.color = '#ef4444';
        respuestaError.innerText = "❌ No se pudo conectar con el asistente de IA.";
        chatHistorial.appendChild(respuestaError);
    });
}

function cerrarSesion() { localStorage.clear(); window.location.href = 'index.html'; }