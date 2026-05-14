const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/usuarios/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, username, nombre, role FROM usuarios WHERE username = $1 AND password = $2',
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el login' });
  }
});

// GET /api/usuarios (CRUD)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, nombre, role FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST /api/usuarios (Crear)
router.post('/', async (req, res) => {
  const { username, password, nombre, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO usuarios (username, password, nombre, role) VALUES ($1, $2, $3, $4) RETURNING id, username, nombre, role',
      [username, password, nombre, role || 'usuario']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/usuarios/:id (Actualizar)
router.put('/:id', async (req, res) => {
  const { username, password, nombre, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE usuarios SET username=$1, password=COALESCE($2, password), nombre=$3, role=$4 WHERE id=$5 RETURNING id, username, nombre, role',
      [username, password, nombre, role, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/usuarios/:id (Eliminar)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
