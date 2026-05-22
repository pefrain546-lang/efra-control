const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todas las incidencias activas (o todas)
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query;
    let query = 'SELECT * FROM incidencias ORDER BY fecha_creacion DESC';
    let values = [];
    
    if (estado) {
      query = 'SELECT * FROM incidencias WHERE estado = $1 ORDER BY fecha_creacion DESC';
      values = [estado];
    }
    
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error del servidor al obtener incidencias' });
  }
});

// Crear una nueva incidencia
router.post('/', async (req, res) => {
  try {
    const { titulo, descripcion } = req.body;
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'Título y descripción son requeridos' });
    }
    
    const result = await pool.query(
      'INSERT INTO incidencias (titulo, descripcion, estado) VALUES ($1, $2, $3) RETURNING *',
      [titulo, descripcion, 'activa']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al crear la incidencia' });
  }
});

// Resolver una incidencia
router.put('/:id/resolver', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE incidencias SET estado = $1 WHERE id = $2 RETURNING *',
      ['resuelta', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al resolver la incidencia' });
  }
});

// Eliminar una incidencia
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM incidencias WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }
    
    res.json({ message: 'Incidencia eliminada exitosamente' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Error al eliminar la incidencia' });
  }
});

module.exports = router;
