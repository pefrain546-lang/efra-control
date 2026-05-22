const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const inventarioRoutes = require('./routes/inventario');
const encomiendaRoutes = require('./routes/encomiendas');
const userRoutes = require('./routes/usuarios');
const equipajeRoutes = require('./routes/equipajes');
const incidenciasRoutes = require('./routes/incidencias');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api', inventarioRoutes);
app.use('/api/encomiendas', encomiendaRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/equipajes', equipajeRoutes);
app.use('/api/incidencias', incidenciasRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Inicializar tablas al arrancar
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventario_actual (
        id SERIAL PRIMARY KEY,
        sistema_data JSONB NOT NULL DEFAULT '[]',
        fisico_data JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventarios_historial (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        fecha_cierre TIMESTAMP DEFAULT NOW(),
        sistema_data JSONB NOT NULL DEFAULT '[]',
        fisico_data JSONB NOT NULL DEFAULT '[]'
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS encomiendas (
        id SERIAL PRIMARY KEY,
        boleta VARCHAR(100) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipajes_sobrantes (
        id SERIAL PRIMARY KEY,
        ticket VARCHAR(100) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidencias (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT NOT NULL,
        estado VARCHAR(20) DEFAULT 'activa',
        fecha_creacion TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'usuario'
      );
    `);
    
    // Semillas de usuarios por defecto
    const userCount = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(userCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO usuarios (username, password, nombre, role) VALUES 
        ('admin', 'admin123', 'Administrador Efra', 'admin'),
        ('usuario', 'user123', 'Usuario Estándar', 'usuario');
      `);
      console.log('👥 Usuarios por defecto creados');
    }

    // Asegurar que siempre haya una fila en inventario_actual
    const exists = await pool.query('SELECT id FROM inventario_actual LIMIT 1');
    if (exists.rows.length === 0) {
      await pool.query("INSERT INTO inventario_actual (sistema_data, fisico_data) VALUES ('[]', '[]')");
    }
    console.log('✅ Tablas listas');
  } catch (err) {
    console.error('❌ Error al inicializar tablas:', err.message);
    process.exit(1);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
  });
});
