-- =========================================================================
-- SCHEMA DEFINITIVO PARA SMART TENNIS MANAGER (SQLite)
-- =========================================================================

-- 1. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    contrasena TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'User'
);

-- 2. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    email TEXT
);

-- 3. TABLA DE CATALOGO DE PRODUCTOS (Modelos de Tenis)
CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modelo TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    precio_venta REAL NOT NULL,
    costo_produccion REAL NOT NULL,
    proveedor_id INTEGER,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

-- 4. TABLA DE INVENTARIO GENERAL (Existencias físicas por Talla/Color)
CREATE TABLE IF NOT EXISTS inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    talla REAL NOT NULL,
    color TEXT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- 5. TABLA DE ÓRDENES DE PRODUCCIÓN (Historial de fabricación)
CREATE TABLE IF NOT EXISTS ordenes_produccion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    fecha TEXT NOT NULL DEFAULT (DATE('now')),
    estado TEXT NOT NULL DEFAULT 'Completado',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- 6. TABLA DE VENTAS (Cabecera del Ticket)
CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nombre TEXT NOT NULL DEFAULT 'Cliente General',
    fecha TEXT NOT NULL DEFAULT (DATE('now')),
    total REAL NOT NULL DEFAULT 0.0
);

-- 7. TABLA DE DETALLE DE VENTAS (Renglones del Ticket)
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    inventario_id INTEGER NOT NULL, -- Conectado a la variante específica (talla/color) de tenis
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (inventario_id) REFERENCES inventario(id)
);