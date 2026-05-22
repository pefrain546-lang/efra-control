-- Script de inicialización de la BD efra_control
-- Ejecutar solo si las tablas no existen (el server.js las crea automáticamente)

CREATE TABLE IF NOT EXISTS inventario_actual (
  id SERIAL PRIMARY KEY,
  sistema_data JSONB NOT NULL DEFAULT '[]',
  fisico_data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventarios_historial (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  fecha_cierre TIMESTAMP DEFAULT NOW(),
  sistema_data JSONB NOT NULL DEFAULT '[]',
  fisico_data JSONB NOT NULL DEFAULT '[]'
);

INSERT INTO inventario_actual (sistema_data, fisico_data)
SELECT '[]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM inventario_actual);

CREATE TABLE IF NOT EXISTS incidencias (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) DEFAULT 'activa',
  fecha_creacion TIMESTAMP DEFAULT NOW()
);
