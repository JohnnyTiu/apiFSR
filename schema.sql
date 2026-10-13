-- =====================================================================
-- Base de Datos: farmacia_sanrafa
-- Proyecto Corto #2 - Desarrollo Web: Farmacia San Rafael
-- Motor: MySQL 8.x / MariaDB compatible
-- Codificación: UTF8MB4
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `farmacia_sanrafa` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `farmacia_sanrafa`;

-- Desactivar temporalmente revisión de claves foráneas para recreación segura si se requiere
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `movimientos_inventario`;
DROP TABLE IF EXISTS `detalles_factura`;
DROP TABLE IF EXISTS `facturas`;
DROP TABLE IF EXISTS `lotes`;
DROP TABLE IF EXISTS `productos`;
DROP TABLE IF EXISTS `categorias`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. TABLA: roles
-- Define los privilegios dentro de la plataforma (administrador, empleado)
-- ---------------------------------------------------------------------
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(50) NOT NULL UNIQUE,
  `descripcion` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. TABLA: usuarios
-- Almacena credenciales seguras (bcrypt) y roles del personal
-- ---------------------------------------------------------------------
CREATE TABLE `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol_id` INT NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_usuarios_email` ON `usuarios` (`email`);

-- ---------------------------------------------------------------------
-- 3. TABLA: categorias
-- Clasificación de medicamentos y productos farmacéuticos
-- ---------------------------------------------------------------------
CREATE TABLE `categorias` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL UNIQUE,
  `descripcion` TEXT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. TABLA: productos
-- Catálogo central de productos. Maneja precios con precisión DECIMAL(10,2)
-- ---------------------------------------------------------------------
CREATE TABLE `productos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(150) NOT NULL,
  `descripcion` TEXT NULL,
  `categoria_id` INT NOT NULL,
  `precio_compra` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `precio_venta` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `stock_minimo` INT NOT NULL DEFAULT 10,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_productos_codigo` ON `productos` (`codigo`);
CREATE INDEX `idx_productos_nombre` ON `productos` (`nombre`);

-- ---------------------------------------------------------------------
-- 5. TABLA: lotes
-- Cada producto puede tener múltiples lotes con fecha de caducidad.
-- Soporta la estrategia FEFO (First Expired, First Out).
-- ---------------------------------------------------------------------
CREATE TABLE `lotes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `producto_id` INT NOT NULL,
  `numero_lote` VARCHAR(80) NOT NULL,
  `fecha_vencimiento` DATE NOT NULL,
  `cantidad_inicial` INT NOT NULL,
  `cantidad_actual` INT NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_lotes_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_lotes_cantidades` CHECK (`cantidad_actual` >= 0 AND `cantidad_inicial` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_lotes_vencimiento` ON `lotes` (`fecha_vencimiento`);
CREATE INDEX `idx_lotes_producto` ON `lotes` (`producto_id`);

-- ---------------------------------------------------------------------
-- 6. TABLA: movimientos_inventario
-- Bitácora de auditoría para ajustes manuales, entradas y salidas
-- ---------------------------------------------------------------------
CREATE TABLE `movimientos_inventario` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `producto_id` INT NOT NULL,
  `lote_id` INT NULL,
  `usuario_id` INT NOT NULL,
  `tipo_movimiento` ENUM('ENTRADA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'REVERSION_ANULACION') NOT NULL,
  `cantidad` INT NOT NULL,
  `justificacion` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_mov_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_mov_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_mov_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. TABLA: facturas
-- Registro principal de ventas emitidas y anuladas
-- ---------------------------------------------------------------------
CREATE TABLE `facturas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `numero_factura` VARCHAR(50) NOT NULL UNIQUE,
  `usuario_id` INT NOT NULL,
  `cliente_nombre` VARCHAR(150) NOT NULL DEFAULT 'Consumidor Final',
  `cliente_nit` VARCHAR(25) NOT NULL DEFAULT 'CF',
  `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `impuesto` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `estado` ENUM('EMITIDA', 'ANULADA') NOT NULL DEFAULT 'EMITIDA',
  `fecha_emision` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_anulacion` TIMESTAMP NULL,
  `usuario_anulacion_id` INT NULL,
  `motivo_anulacion` VARCHAR(255) NULL,
  CONSTRAINT `fk_facturas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_facturas_usuario_anulacion` FOREIGN KEY (`usuario_anulacion_id`) REFERENCES `usuarios` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_facturas_numero` ON `facturas` (`numero_factura`);
CREATE INDEX `idx_facturas_estado` ON `facturas` (`estado`);

-- ---------------------------------------------------------------------
-- 8. TABLA: detalles_factura
-- Almacena cada línea facturada ligada al lote específico del cual se descontó
-- Esto garantiza una reversión exacta si la factura es anulada.
-- ---------------------------------------------------------------------
CREATE TABLE `detalles_factura` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `factura_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `lote_id` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(10, 2) NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  CONSTRAINT `fk_detalles_factura` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalles_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_detalles_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_detalles_cantidad` CHECK (`cantidad` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- DATOS SEMILLA PARA PRUEBAS Y FUNCIONAMIENTO INICIAL
-- =====================================================================

-- Roles
INSERT INTO `roles` (`id`, `nombre`, `descripcion`) VALUES
(1, 'administrador', 'Acceso total al sistema, reportes, usuarios y configuración'),
(2, 'empleado', 'Acceso operativo para ventas, facturación y consulta de inventario');

-- Usuarios Iniciales (Contraseñas hasheadas con bcrypt salt rounds 10)
-- admin@farmaciasanrafa.com -> Admin123*
-- empleado@farmaciasanrafa.com -> Empleado123*
INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password_hash`, `rol_id`, `activo`) VALUES
(1, 'Administrador San Rafael', 'admin@farmaciasanrafa.com', '$2b$10$72S.l225zuDbRYN7LC8RoOdouaPGyUrY.XXkZtASt9E3I2q3UuTky', 1, 1),
(2, 'Carlos Empleado', 'empleado@farmaciasanrafa.com', '$2b$10$dx7ome43xXvYlnXkwYdJcutjeI3fcVybCCUPEoyfoLu2fE4q3emKK', 2, 1);

-- Categorías
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'Analgésicos y Antipiréticos', 'Medicamentos para aliviar dolor y reducir la fiebre', 1),
(2, 'Antibióticos', 'Tratamiento de infecciones bacterianas con receta médica', 1),
(3, 'Antiinflamatorios', 'Alivio de la inflamación muscular y articular', 1),
(4, 'Antihistamínicos', 'Tratamiento de alergias y síntomas respiratorios', 1),
(5, 'Cuidado Personal y Primeros Auxilios', 'Material de curación y cuidado general', 1);

-- Productos
INSERT INTO `productos` (`id`, `codigo`, `nombre`, `descripcion`, `categoria_id`, `precio_compra`, `precio_venta`, `stock_minimo`, `activo`) VALUES
(1, 'MED-001', 'Paracetamol 500mg (Caja x 20 tabletas)', 'Alivio eficaz de dolor leve a moderado y fiebre', 1, 12.50, 22.00, 15, 1),
(2, 'MED-002', 'Ibuprofeno 400mg (Caja x 10 cápsulas)', 'Antiinflamatorio no esteroideo para dolores musculares', 3, 15.00, 26.50, 10, 1),
(3, 'MED-003', 'Amoxicilina 500mg (Frasco x 30 cápsulas)', 'Antibiótico de amplio espectro', 2, 35.00, 58.00, 8, 1),
(4, 'MED-004', 'Loratadina 10mg (Caja x 10 tabletas)', 'Antialérgico sin producir somnolencia', 4, 8.00, 15.00, 12, 1),
(5, 'MED-005', 'Alcohol Etílico 70% (Frasco 500ml)', 'Antiséptico y desinfectante de uso externo', 5, 10.00, 18.00, 20, 1),
(6, 'MED-006', 'Aspirina 100mg Protect (Caja x 30)', 'Ácido acetilsalicílico cardioprotector', 1, 18.00, 32.00, 10, 1);

-- Lotes iniciales con fechas de vigencia y próximos a vencer
-- Permite validar en el sistema la detección de lotes próximos a vencer y FEFO
INSERT INTO `lotes` (`id`, `producto_id`, `numero_lote`, `fecha_vencimiento`, `cantidad_inicial`, `cantidad_actual`, `activo`) VALUES
-- Paracetamol: 2 lotes (uno vence pronto, otro en fecha lejana)
(1, 1, 'LOT-PAR-2026A', DATE_ADD(CURDATE(), INTERVAL 45 DAY), 50, 35, 1),
(2, 1, 'LOT-PAR-2027B', DATE_ADD(CURDATE(), INTERVAL 365 DAY), 60, 60, 1),
-- Ibuprofeno: 1 lote
(3, 2, 'LOT-IBU-2026C', DATE_ADD(CURDATE(), INTERVAL 180 DAY), 40, 25, 1),
-- Amoxicilina: 1 lote con stock bajo para alertas
(4, 3, 'LOT-AMX-2026D', DATE_ADD(CURDATE(), INTERVAL 90 DAY), 10, 5, 1),
-- Loratadina: 1 lote
(5, 4, 'LOT-LOR-2027A', DATE_ADD(CURDATE(), INTERVAL 240 DAY), 50, 45, 1),
-- Alcohol: 1 lote
(6, 5, 'LOT-ALC-2028A', DATE_ADD(CURDATE(), INTERVAL 600 DAY), 80, 70, 1),
-- Aspirina: 1 lote
(7, 6, 'LOT-ASP-2026B', DATE_ADD(CURDATE(), INTERVAL 120 DAY), 30, 20, 1);

-- Registro inicial de movimientos de inventario por carga inicial
INSERT INTO `movimientos_inventario` (`producto_id`, `lote_id`, `usuario_id`, `tipo_movimiento`, `cantidad`, `justificacion`) VALUES
(1, 1, 1, 'ENTRADA', 50, 'Carga inicial de inventario'),
(1, 2, 1, 'ENTRADA', 60, 'Carga inicial de inventario'),
(2, 3, 1, 'ENTRADA', 40, 'Carga inicial de inventario'),
(3, 4, 1, 'ENTRADA', 10, 'Carga inicial de inventario'),
(4, 5, 1, 'ENTRADA', 50, 'Carga inicial de inventario'),
(5, 6, 1, 'ENTRADA', 80, 'Carga inicial de inventario'),
(6, 7, 1, 'ENTRADA', 30, 'Carga inicial de inventario');
