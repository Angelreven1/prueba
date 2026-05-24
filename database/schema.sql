-- =========================================================================
-- ESTRUCTURA DE LA BASE DE DATOS: SMART SNEAKER MANAGER (MYSQL VERSION)
-- =========================================================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(30) DEFAULT 'user'
);

-- 2. Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20)
);

-- 3. Tabla de Productos (Catálogo de Modelos)
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modelo VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    precio_venta DECIMAL(10, 2) NOT NULL,
    costo_produccion DECIMAL(10, 2) NOT NULL,
    proveedor_id INT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

-- 4. Tabla de Inventario Físico (Variantes de Talla y Color)
CREATE TABLE IF NOT EXISTS inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    talla DECIMAL(3, 1) NOT NULL,
    color VARCHAR(50) NOT NULL,
    cantidad INT DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- 5. Tabla de Materia Prima
CREATE TABLE IF NOT EXISTS materia_prima (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material VARCHAR(100) NOT NULL UNIQUE,
    cantidad_stock INT DEFAULT 0,
    unidad_medida VARCHAR(20) NOT NULL
);

-- 6. Tabla de Recetas de Producto (Insumos por Calzado)
CREATE TABLE IF NOT EXISTS recetas_producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    materia_prima_id INT NOT NULL,
    cantidad_requerida INT NOT NULL,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_prima_id) REFERENCES materia_prima(id) ON DELETE CASCADE
);

-- 7. Tabla de Órdenes de Producción (Lotes)
CREATE TABLE IF NOT EXISTS ordenes_produccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) DEFAULT 'Completado',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);