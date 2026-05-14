const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/encomiendas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM encomiendas ORDER BY fecha DESC');
    res.json(result.rows.map(row => ({
        ...row,
        fecha: new Date(row.fecha).toLocaleDateString()
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener encomiendas' });
  }
});

// POST /api/encomiendas
router.post('/', async (req, res) => {
  const { boleta, descripcion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO encomiendas (boleta, descripcion) VALUES ($1, $2) RETURNING *',
      [boleta, descripcion]
    );
    const row = result.rows[0];
    res.json({
        ...row,
        fecha: new Date(row.fecha).toLocaleDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear encomienda' });
  }
});

// DELETE /api/encomiendas/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM encomiendas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar encomienda' });
  }
});

module.exports = router;
