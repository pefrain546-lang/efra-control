const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/inventario-actual
router.get('/inventario-actual', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventario_actual ORDER BY id LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({ sistemaData: [], fisicoData: [] });
    }
    res.json({
      sistemaData: result.rows[0].sistema_data,
      fisicoData: result.rows[0].fisico_data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener inventario actual' });
  }
});

// PUT /api/inventario-actual
router.put('/inventario-actual', async (req, res) => {
  const { sistemaData, fisicoData } = req.body;
  try {
    const exists = await pool.query('SELECT id FROM inventario_actual LIMIT 1');
    if (exists.rows.length === 0) {
      await pool.query(
        'INSERT INTO inventario_actual (sistema_data, fisico_data) VALUES ($1, $2)',
        [JSON.stringify(sistemaData), JSON.stringify(fisicoData)]
      );
    } else {
      await pool.query(
        'UPDATE inventario_actual SET sistema_data=$1, fisico_data=$2, updated_at=NOW() WHERE id=$3',
        [JSON.stringify(sistemaData), JSON.stringify(fisicoData), exists.rows[0].id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar inventario actual' });
  }
});

// GET /api/historial
router.get('/historial', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, fecha_cierre, sistema_data, fisico_data FROM inventarios_historial ORDER BY fecha_cierre DESC'
    );
    const rows = result.rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      fecha: new Date(r.fecha_cierre).toLocaleString('es-PE'),
      sistemaData: r.sistema_data,
      fisicoData: r.fisico_data,
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// POST /api/historial  (cierra el inventario actual y lo guarda)
router.post('/historial', async (req, res) => {
  const { nombre, sistemaData, fisicoData } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO inventarios_historial (nombre, sistema_data, fisico_data) VALUES ($1, $2, $3)',
      [nombre, JSON.stringify(sistemaData), JSON.stringify(fisicoData)]
    );
    // Limpiar inventario actual
    await client.query('UPDATE inventario_actual SET sistema_data=$1, fisico_data=$2, updated_at=NOW()', [
      JSON.stringify([]),
      JSON.stringify([]),
    ]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar inventario' });
  } finally {
    client.release();
  }
});

// DELETE /api/historial/:id
router.delete('/historial/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventarios_historial WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar del historial' });
  }
});

module.exports = router;
