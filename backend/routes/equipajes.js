const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los equipajes sobrantes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipajes_sobrantes ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo equipajes:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Crear un nuevo equipaje sobrante
router.post('/', async (req, res) => {
  const { ticket, descripcion } = req.body;
  if (!ticket || !descripcion) {
    return res.status(400).json({ error: 'Ticket y descripción son requeridos' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO equipajes_sobrantes (ticket, descripcion) VALUES ($1, $2) RETURNING *',
      [ticket, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando equipaje:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un equipaje sobrante
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM equipajes_sobrantes WHERE id = $1', [id]);
    res.json({ message: 'Equipaje eliminado' });
  } catch (err) {
    console.error('Error eliminando equipaje:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
