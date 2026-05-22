import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Edit, Save, X, Shield, User } from 'lucide-react';


const API = 'http://localhost:3001/api/usuarios';

export default function Configuraciones() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  // Formulario nuevo/edición
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombre: '',
    role: 'usuario'
  });


  const fetchUsuarios = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setUsuarios(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API}/${editingId}` : API;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setFormData({ username: '', password: '', nombre: '', role: 'usuario' });
        setEditingId(null);
        fetchUsuarios();
        alert(editingId ? 'Usuario actualizado' : 'Usuario creado');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      fetchUsuarios();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: '', // Dejar vacío para no cambiar si no se desea
      nombre: user.nombre,
      role: user.role
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h2 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Shield color="var(--primary-color)" /> Configuración del Sistema
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* FORMULARIO */}
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
            {editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label>Nombre Completo</label>
              <input 
                type="text" className="input-field" 
                value={formData.nombre} 
                onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                required 
              />
            </div>
            <div className="input-group">
              <label>Usuario</label>
              <input 
                type="text" className="input-field" 
                value={formData.username} 
                onChange={(e) => setFormData({...formData, username: e.target.value})} 
                required 
              />
            </div>
            <div className="input-group">
              <label>Contraseña {editingId && '(dejar vacío para mantener)'}</label>
              <input 
                type="password" className="input-field" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                required={!editingId}
              />
            </div>
            <div className="input-group">
              <label>Rol</label>
              <select 
                className="input-field" 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="usuario">Usuario Estándar</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <Save size={18} /> {editingId ? 'Actualizar' : 'Crear'}
              </button>
              {editingId && (
                <button type="button" className="btn" onClick={() => {setEditingId(null); setFormData({username:'', password:'', nombre:'', role:'usuario'})}}>
                  <X size={18} /> Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LISTA */}
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Usuarios Registrados</h3>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {usuarios.map(u => (
                <div key={u.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--surface-border)' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{u.nombre} <span style={{ fontSize: '0.7rem', background: u.role === 'admin' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: u.role === 'admin' ? '#000' : '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px' }}>{u.role.toUpperCase()}</span></div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{u.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startEdit(u)} style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(u.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
