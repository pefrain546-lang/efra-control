import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, Activity, LogOut, Bell, Package, PlusCircle, List, Trash2, LayoutGrid, AlignJustify, Archive, Shield } from 'lucide-react';
import Inventario from './Inventario';
import Configuraciones from './Configuraciones';

const API = 'http://localhost:3001/api/encomiendas';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('grid');
  const [encomiendas, setEncomiendas] = useState([]);
  const [newBoleta, setNewBoleta] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = user.role === 'admin';

  // Cargar encomiendas al montar
  useEffect(() => {
    fetch(API)
      .then(res => {
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        return res.json();
      })
      .then(data => {
        setEncomiendas(data);
        setApiOnline(true);
      })
      .catch(err => {
        console.error("Error cargando encomiendas:", err);
        setApiOnline(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateEncomienda = async (e) => {
    e.preventDefault();
    if (!newBoleta || !newDescripcion) return;

    setSaving(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boleta: newBoleta, descripcion: newDescripcion })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error del servidor: ${res.status}. Asegúrate de haber reiniciado el backend.`);
      }

      const data = await res.json();
      setEncomiendas([data, ...encomiendas]);
      setNewBoleta('');
      setNewDescripcion('');
      setActiveTab('ver-encomiendas');
      alert("✅ Encomienda guardada correctamente en PostgreSQL.");
    } catch (err) {
      console.error("Error creando encomienda:", err);
      alert(`❌ No se pudo guardar: ${err.message}\n\nPor favor, verifica que el servidor backend esté corriendo y lo hayas REINICIADO.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEncomienda = async (id) => {
    if (!window.confirm('¿Eliminar esta encomienda?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setEncomiendas(encomiendas.filter(e => e.id !== id));
    } catch (err) {
      console.error("Error eliminando encomienda:", err);
    }
  };
  return (
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity size={28} />
          <span>Efra Control</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ background: activeTab === 'dashboard' ? 'rgba(102, 252, 241, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'dashboard' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'crear-encomienda' ? 'active' : ''}`}
            onClick={() => setActiveTab('crear-encomienda')}
            style={{ background: activeTab === 'crear-encomienda' ? 'rgba(102, 252, 241, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'crear-encomienda' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <PlusCircle size={20} />
            <span>Crear Encomienda</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'ver-encomiendas' ? 'active' : ''}`}
            onClick={() => setActiveTab('ver-encomiendas')}
            style={{ background: activeTab === 'ver-encomiendas' ? 'rgba(102, 252, 241, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'ver-encomiendas' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <List size={20} />
            <span>Ver Encomiendas</span>
          </button>
          
          {isAdmin && (
            <>
              <button
                className={`nav-item ${activeTab === 'inventario' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventario')}
                style={{ background: activeTab === 'inventario' ? 'rgba(102, 252, 241, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'inventario' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', marginTop: '0.5rem' }}
              >
                <Archive size={20} />
                <span>Inventario</span>
              </button>
              <button
                className={`nav-item ${activeTab === 'configuraciones' ? 'active' : ''}`}
                onClick={() => setActiveTab('configuraciones')}
                style={{ background: activeTab === 'configuraciones' ? 'rgba(102, 252, 241, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'configuraciones' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <Shield size={20} />
                <span>Configuraciones</span>
              </button>
            </>
          )}
        </nav>

        <button className="nav-item logout-btn" onClick={onLogout} style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left' }}>
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>Panel de Control</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Bienvenido de nuevo, {user.nombre || user.username}</p>
          </div>

          <div className="user-profile">
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <Bell size={24} />
            </button>
            <div className="avatar">
              {(user.nombre || user.username || '?').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        {activeTab === 'dashboard' && (
          <>
            <section className="stats-grid">
              <div 
                className="stat-card glass-panel delay-1 animate-fade-in" 
                onClick={() => setActiveTab('ver-encomiendas')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="stat-info">
                  <h3>Encomiendas en terminal</h3>
                  <div className="value">{encomiendas.length}</div>
                </div>
                <div className="stat-icon">
                  <Package size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel delay-2 animate-fade-in">
                <div className="stat-info">
                  <h3>Sesiones Activas</h3>
                  <div className="value">42</div>
                </div>
                <div className="stat-icon">
                  <Activity size={24} />
                </div>
              </div>

              <div className="stat-card glass-panel delay-3 animate-fade-in">
                <div className="stat-info">
                  <h3>Ingresos Hoy</h3>
                  <div className="value">$4,521</div>
                </div>
                <div className="stat-icon" style={{ color: 'var(--success-color)', background: 'rgba(0, 230, 118, 0.1)' }}>
                  <Activity size={24} />
                </div>
              </div>
            </section>

            <section className="glass-panel delay-4 animate-fade-in" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Actividad Reciente</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                  <span>Nuevo usuario registrado:Efraín</span>
                  <span>Hace 5 min</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--surface-border)' }}>
                  <span>Actualización del sistema completada</span>
                  <span>Hace 1 hora</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0' }}>
                  <span>Reporte mensual generado</span>
                  <span>Hace 3 horas</span>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'crear-encomienda' && (
          <section className="glass-panel animate-fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={24} color="var(--primary-color)" /> Crear Nueva Encomienda
            </h3>
            <form onSubmit={handleCreateEncomienda}>
              <div className="input-group">
                <label htmlFor="boleta">Número de Boleta</label>
                <input
                  id="boleta"
                  type="text"
                  className="input-field"
                  placeholder="Ej: BOL-00123"
                  value={newBoleta}
                  onChange={(e) => setNewBoleta(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="descripcion">Descripción de la Encomienda</label>
                <textarea
                  id="descripcion"
                  className="input-field"
                  placeholder="Ej: Caja mediana, contiene electrónicos. Frágil."
                  rows="4"
                  value={newDescripcion}
                  onChange={(e) => setNewDescripcion(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: '1rem', opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Activity className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Package size={18} style={{ marginRight: '0.5rem' }} />
                    Guardar Encomienda
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'ver-encomiendas' && (
          <section className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <List size={24} color="var(--primary-color)" /> Lista de Encomiendas
              </h3>

              {encomiendas.length > 0 && (
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{ background: viewMode === 'grid' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'grid' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                    title="Vista en Tarjetas"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{ background: viewMode === 'list' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'list' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                    title="Vista en Lista"
                  >
                    <AlignJustify size={18} />
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Activity className="animate-spin" size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>Cargando encomiendas desde PostgreSQL...</p>
              </div>
            ) : encomiendas.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Package size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>No hay encomiendas registradas aún.</p>
                <button
                  className="btn btn-primary"
                  style={{ maxWidth: '250px', margin: '1.5rem auto 0' }}
                  onClick={() => setActiveTab('crear-encomienda')}
                >
                  <PlusCircle size={18} /> Crear la primera
                </button>
              </div>
            ) : (
              viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {encomiendas.map(enc => (
                    <div key={enc.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Boleta</span>
                          <h4 style={{ color: 'var(--primary-color)', fontSize: '1.2rem', margin: '0.2rem 0' }}>{enc.boleta}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteEncomienda(enc.id)}
                          style={{ background: 'rgba(255, 75, 75, 0.1)', border: 'none', color: 'var(--danger-color)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                          title="Eliminar encomienda"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Descripción</span>
                        <p style={{ color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{enc.descripcion}</p>
                      </div>
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Registrado: {enc.fecha}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--surface-border)', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <div>Nº Boleta</div>
                    <div>Descripción</div>
                    <div>Fecha Registro</div>
                    <div>Acción</div>
                  </div>
                  {encomiendas.map((enc, index) => (
                    <div
                      key={enc.id}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '1rem', padding: '1rem 1.5rem', alignItems: 'center', borderBottom: index < encomiendas.length - 1 ? '1px solid var(--surface-border)' : 'none', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{enc.boleta}</div>
                      <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={enc.descripcion}>{enc.descripcion}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{enc.fecha}</div>
                      <div>
                        <button
                          onClick={() => handleDeleteEncomienda(enc.id)}
                          style={{ background: 'transparent', border: '1px solid rgba(255, 75, 75, 0.3)', color: 'var(--danger-color)', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                          title="Eliminar encomienda"
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,75,75,0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        )}

        {isAdmin && activeTab === 'inventario' && (
          <Inventario />
        )}

        {isAdmin && activeTab === 'configuraciones' && (
          <Configuraciones />
        )}
      </main>
    </div>
  );
}
