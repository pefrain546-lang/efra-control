import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Settings, Activity, LogOut, Bell, Package, PlusCircle, List, Trash2, LayoutGrid, AlignJustify, Archive, Shield, Lock, Truck, Briefcase } from 'lucide-react';
import Inventario from './Inventario';
import Configuraciones from './Configuraciones';

const API = 'http://localhost:3001/api/encomiendas';

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('grid');
  const [encomiendas, setEncomiendas] = useState([]);
  const [newBoleta, setNewBoleta] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [equipajes, setEquipajes] = useState([]);
  const [newEquipajeTicket, setNewEquipajeTicket] = useState('');
  const [newEquipajeDesc, setNewEquipajeDesc] = useState('');
  const [savingEquipaje, setSavingEquipaje] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const [incidencias, setIncidencias] = useState([]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [newIncidenciaTitulo, setNewIncidenciaTitulo] = useState('');
  const [newIncidenciaDesc, setNewIncidenciaDesc] = useState('');
  const [savingIncidencia, setSavingIncidencia] = useState(false);

  const isAdmin = user.role === 'admin';

  // Cargar datos al montar
  useEffect(() => {
    const fetchEncomiendas = fetch(API).then(res => res.json());
    const fetchEquipajes = fetch('http://localhost:3001/api/equipajes').then(res => res.json());
    const fetchIncidencias = fetch('http://localhost:3001/api/incidencias').then(res => res.json());

    Promise.all([fetchEncomiendas, fetchEquipajes, fetchIncidencias])
      .then(([encomiendasData, equipajesData, incidenciasData]) => {
        setEncomiendas(encomiendasData);
        setEquipajes(equipajesData);
        setIncidencias(incidenciasData || []);
        setApiOnline(true);

        // Generar notificaciones para incidencias activas
        const activas = (incidenciasData || []).filter(inc => inc.estado === 'activa');
        if (activas.length > 0) {
          setNotifications(prev => [
            ...activas.map(inc => ({
              id: `inc-${inc.id}`,
              text: `Recordatorio: Incidencia activa - ${inc.titulo}`,
              type: 'incidencia',
              read: false,
              desc: inc.descripcion
            })),
            ...prev
          ]);
        }
      })
      .catch(err => {
        console.error("Error cargando datos:", err);
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
      setNotifications(prev => [{ id: Date.now(), text: `Nueva encomienda creada: ${newBoleta}`, type: 'encomienda', read: false, desc: newDescripcion }, ...prev]);
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

  const handleCreateEquipaje = async (e) => {
    e.preventDefault();
    if (!newEquipajeTicket || !newEquipajeDesc) return;

    setSavingEquipaje(true);
    try {
      const res = await fetch('http://localhost:3001/api/equipajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: newEquipajeTicket, descripcion: newEquipajeDesc })
      });

      if (!res.ok) throw new Error("Error al guardar el equipaje");

      const data = await res.json();
      setEquipajes([data, ...equipajes]);
      setNotifications(prev => [{ id: Date.now(), text: `Nuevo equipaje sobrante registrado (Ticket: ${newEquipajeTicket})`, type: 'equipaje', read: false, desc: newEquipajeDesc }, ...prev]);
      setNewEquipajeTicket('');
      setNewEquipajeDesc('');
      alert("✅ Equipaje sobrante guardado correctamente.");
    } catch (err) {
      console.error("Error creando equipaje:", err);
      alert("❌ No se pudo guardar el equipaje.");
    } finally {
      setSavingEquipaje(false);
    }
  };

  const handleDeleteEquipaje = async (id) => {
    if (!window.confirm('¿Confirmas que este equipaje fue entregado/retirado?')) return;
    try {
      await fetch(`http://localhost:3001/api/equipajes/${id}`, { method: 'DELETE' });
      setEquipajes(equipajes.filter(e => e.id !== id));
    } catch (err) {
      console.error("Error eliminando equipaje:", err);
    }
  };

  const handleCreateIncidencia = async (e) => {
    e.preventDefault();
    if (!newIncidenciaTitulo || !newIncidenciaDesc) return;

    setSavingIncidencia(true);
    try {
      const res = await fetch('http://localhost:3001/api/incidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: newIncidenciaTitulo, descripcion: newIncidenciaDesc })
      });

      if (!res.ok) throw new Error("Error al guardar la incidencia");

      const data = await res.json();
      setIncidencias([data, ...incidencias]);
      setNotifications(prev => [{ id: `inc-${data.id}`, text: `Nueva incidencia: ${data.titulo}`, type: 'incidencia', read: false, desc: data.descripcion }, ...prev]);
      setNewIncidenciaTitulo('');
      setNewIncidenciaDesc('');
      alert("✅ Incidencia registrada correctamente.");
    } catch (err) {
      console.error("Error creando incidencia:", err);
      alert("❌ No se pudo guardar la incidencia.");
    } finally {
      setSavingIncidencia(false);
    }
  };

  const handleResolveIncidencia = async (id) => {
    if (!window.confirm('¿Marcar esta incidencia como resuelta?')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/incidencias/${id}/resolver`, { method: 'PUT' });
      if (res.ok) {
        const data = await res.json();
        setIncidencias(incidencias.map(inc => inc.id === id ? data : inc));
        setNotifications(prev => prev.filter(n => n.id !== `inc-${id}`));
      }
    } catch (err) {
      console.error("Error resolviendo incidencia:", err);
    }
  };

  const handleDeleteIncidencia = async (id) => {
    if (!window.confirm('¿Eliminar esta incidencia permanentemente?')) return;
    try {
      await fetch(`http://localhost:3001/api/incidencias/${id}`, { method: 'DELETE' });
      setIncidencias(incidencias.filter(inc => inc.id !== id));
    } catch (err) {
      console.error("Error eliminando incidencia:", err);
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="EF Logo" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)' }} />
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ background: activeTab === 'dashboard' ? 'rgba(30, 107, 214, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'dashboard' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'crear-encomienda' ? 'active' : ''}`}
            onClick={() => setActiveTab('crear-encomienda')}
            style={{ background: activeTab === 'crear-encomienda' ? 'rgba(30, 107, 214, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'crear-encomienda' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <PlusCircle size={20} />
            <span>Crear Encomienda</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'ver-encomiendas' ? 'active' : ''}`}
            onClick={() => setActiveTab('ver-encomiendas')}
            style={{ background: activeTab === 'ver-encomiendas' ? 'rgba(30, 107, 214, 0.1)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', color: activeTab === 'ver-encomiendas' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <List size={20} />
            <span>Ver Encomiendas</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'inventario' ? 'active' : ''}`}
            onClick={() => isAdmin ? setActiveTab('inventario') : alert('🔒 Acceso Restringido: Solo administradores pueden acceder al Inventario.')}
            style={{ 
              background: activeTab === 'inventario' ? 'rgba(30, 107, 214, 0.1)' : 'transparent', 
              border: 'none', 
              width: '100%', 
              textAlign: 'left', 
              color: activeTab === 'inventario' ? 'var(--primary-color)' : 'var(--text-secondary)', 
              cursor: isAdmin ? 'pointer' : 'not-allowed', 
              marginTop: '0.5rem',
              opacity: isAdmin ? 1 : 0.6
            }}
          >
            <Archive size={20} />
            <span>Inventario</span>
            {!isAdmin && <Lock size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>
          <button
            className={`nav-item ${activeTab === 'configuraciones' ? 'active' : ''}`}
            onClick={() => isAdmin ? setActiveTab('configuraciones') : alert('🔒 Acceso Restringido: Solo administradores pueden acceder a Configuraciones.')}
            style={{ 
              background: activeTab === 'configuraciones' ? 'rgba(30, 107, 214, 0.1)' : 'transparent', 
              border: 'none', 
              width: '100%', 
              textAlign: 'left', 
              color: activeTab === 'configuraciones' ? 'var(--primary-color)' : 'var(--text-secondary)', 
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.6
            }}
          >
            <Shield size={20} />
            <span>Configuraciones</span>
            {!isAdmin && <Lock size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
          </button>
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

          <div className="user-profile" style={{ position: 'relative' }} ref={notificationsRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={24} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger-color)', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: '50px', right: '50px', width: '320px', zIndex: 100, padding: '1.2rem', background: 'rgba(11,12,16,0.95)', border: '1px solid var(--surface-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.8rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={16} color="var(--primary-color)" /> Notificaciones
                  </h4>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                      style={{ background: 'rgba(30, 107, 214, 0.1)', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: '2rem 0' }}>No tienes notificaciones nuevas</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          if (notif.type === 'incidencia') setActiveTab('incidencias');
                          else if (notif.type === 'equipaje') setActiveTab('equipajes-sobrantes');
                          else if (notif.type === 'encomienda') setActiveTab('ver-encomiendas');
                          setShowNotifications(false);
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        }}
                        style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.8rem', background: notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(30, 107, 214, 0.1)', borderRadius: '8px', borderLeft: notif.read ? '3px solid transparent' : '3px solid var(--primary-color)', transition: 'background 0.2s', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(30, 107, 214, 0.1)'}
                      >
                        <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', color: 'var(--primary-color)' }}>
                          {notif.type === 'equipaje' ? <Briefcase size={16} /> : notif.type === 'incidencia' ? <Bell size={16} /> : <Package size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: '1.4' }}>{notif.text}</p>
                          {notif.desc && (
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {notif.desc}
                            </p>
                          )}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>Ahora mismo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

              <div 
                className="stat-card glass-panel delay-2 animate-fade-in"
                onClick={() => setActiveTab('equipajes-sobrantes')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="stat-info">
                  <h3>Equipajes sobrantes</h3>
                  <div className="value">{equipajes.length}</div>
                </div>
                <div className="stat-icon" style={{ color: 'var(--success-color)', background: 'rgba(0, 230, 118, 0.1)' }}>
                  <Briefcase size={24} />
                </div>
              </div>

              <div 
                className="stat-card glass-panel delay-3 animate-fade-in"
                onClick={() => setActiveTab('incidencias')}
                style={{ cursor: 'pointer', transition: 'transform 0.2s', border: incidencias.filter(i => i.estado === 'activa').length > 0 ? '1px solid var(--danger-color)' : '1px solid rgba(255,255,255,0.05)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="stat-info">
                  <h3>Incidencias Activas</h3>
                  <div className="value" style={{ color: incidencias.filter(i => i.estado === 'activa').length > 0 ? 'var(--danger-color)' : 'inherit' }}>
                    {incidencias.filter(i => i.estado === 'activa').length}
                  </div>
                </div>
                <div className="stat-icon" style={{ color: incidencias.filter(i => i.estado === 'activa').length > 0 ? 'var(--danger-color)' : '#ffca28', background: incidencias.filter(i => i.estado === 'activa').length > 0 ? 'rgba(255, 75, 75, 0.1)' : 'rgba(255, 202, 40, 0.1)' }}>
                  <Bell size={24} />
                </div>
              </div>
            </section>

            <div style={{ marginTop: 'auto' }}>
              <section className="glass-panel" style={{ background: 'rgba(0, 0, 0, 0.5)', padding: '1.5rem 2rem', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px 20px 0 0', borderBottom: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem' }}>
                    <Activity size={18} color="var(--primary-color)" /> Actividad Reciente
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                    Actualizado ahora mismo
                  </div>
                </div>

                <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="stat-card glass-panel delay-4 animate-fade-in" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem 1.2rem', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <div className="stat-info">
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nuevo usuario</h4>
                      <div className="value" style={{ fontSize: '1rem', marginTop: '0.1rem' }}>Efraín</div>
                    </div>
                    <div className="stat-icon" style={{ width: '32px', height: '32px', background: 'rgba(30, 107, 214, 0.05)' }}>
                      <Users size={16} />
                    </div>
                  </div>

                  <div className="stat-card glass-panel delay-5 animate-fade-in" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem 1.2rem', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <div className="stat-info">
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sistema</h4>
                      <div className="value" style={{ fontSize: '1rem', marginTop: '0.1rem' }}>Actualizado</div>
                    </div>
                    <div className="stat-icon" style={{ width: '32px', height: '32px', background: 'rgba(30, 107, 214, 0.05)' }}>
                      <Settings size={16} />
                    </div>
                  </div>

                  <div className="stat-card glass-panel delay-6 animate-fade-in" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem 1.2rem', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <div className="stat-info">
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reporte</h4>
                      <div className="value" style={{ fontSize: '1rem', marginTop: '0.1rem' }}>Generado</div>
                    </div>
                    <div className="stat-icon" style={{ width: '32px', height: '32px', background: 'rgba(30, 107, 214, 0.05)' }}>
                      <List size={16} />
                    </div>
                  </div>
                </div>

                <footer style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', opacity: 0.8 }}>
                  <p>App Web elaborada por <strong style={{ color: 'var(--primary-color)' }}>Palomino Fernandez Efrain</strong> • © 2026 Ef Control • v1.0.0</p>
                </footer>
              </section>
            </div>
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

        {activeTab === 'equipajes-sobrantes' && (
          <section className="animate-fade-in">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={24} color="var(--primary-color)" /> Gestión de Equipajes Sobrantes
            </h3>

            {/* Formulario para agregar equipaje */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Registrar Equipaje</h4>
              <form onSubmit={handleCreateEquipaje} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Número de Ticket (Ej: T-0098)"
                    value={newEquipajeTicket}
                    onChange={(e) => setNewEquipajeTicket(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: '2', minWidth: '300px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Descripción (Ej: Maleta negra grande, marca Samsonite)"
                    value={newEquipajeDesc}
                    onChange={(e) => setNewEquipajeDesc(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: 'auto' }}
                  disabled={savingEquipaje}
                >
                  {savingEquipaje ? 'Guardando...' : 'Registrar'}
                </button>
              </form>
            </div>

            {/* Lista de equipajes */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Equipajes en resguardo ({equipajes.length})</h4>
              </div>

              {equipajes.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Briefcase size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p>No hay equipajes sobrantes registrados actualmente.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
                  {equipajes.map((eq) => (
                    <div key={eq.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>TICKET</span>
                          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: '0' }}>{eq.ticket}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteEquipaje(eq.id)}
                          style={{ background: 'rgba(30, 107, 214, 0.1)', border: 'none', color: 'var(--primary-color)', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', fontWeight: 'bold' }}
                          title="Marcar como entregado/retirado"
                          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-color)'; e.currentTarget.style.color = '#000'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(30, 107, 214, 0.1)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
                        >
                          Entregar
                        </button>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0', lineHeight: '1.4' }}>{eq.descripcion}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                        Registrado: {new Date(eq.fecha).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'incidencias' && (
          <section className="animate-fade-in">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={24} color="var(--danger-color)" /> Gestión de Incidencias
            </h3>

            {/* Formulario para agregar incidencia */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Nueva Incidencia / Recordatorio</h4>
              <form onSubmit={handleCreateIncidencia} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Título (Ej: Encomienda BOL-0102 no llega)"
                    value={newIncidenciaTitulo}
                    onChange={(e) => setNewIncidenciaTitulo(e.target.value)}
                    required
                  />
                </div>
                <div style={{ flex: '2', minWidth: '300px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Descripción (Detalles del seguimiento)"
                    value={newIncidenciaDesc}
                    onChange={(e) => setNewIncidenciaDesc(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: 'auto', background: 'var(--danger-color)' }}
                  disabled={savingIncidencia}
                >
                  {savingIncidencia ? 'Guardando...' : 'Crear Recordatorio'}
                </button>
              </form>
            </div>

            {/* Lista de incidencias */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Registro de Incidencias</h4>
              </div>

              {incidencias.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Bell size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p>No hay incidencias registradas. Todo en orden.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', padding: '1.5rem' }}>
                  {incidencias.map((inc) => (
                    <div key={inc.id} style={{ background: inc.estado === 'activa' ? 'rgba(255, 75, 75, 0.05)' : 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: inc.estado === 'activa' ? '1px solid var(--danger-color)' : '1px solid var(--surface-border)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: inc.estado === 'activa' ? 'var(--danger-color)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                            {inc.estado === 'activa' ? '🔴 ACTIVA' : '✅ RESUELTA'}
                          </span>
                          <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: '0', textDecoration: inc.estado === 'resuelta' ? 'line-through' : 'none', opacity: inc.estado === 'resuelta' ? 0.6 : 1 }}>
                            {inc.titulo}
                          </h4>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {inc.estado === 'activa' && (
                            <button
                              onClick={() => handleResolveIncidencia(inc.id)}
                              style={{ background: 'rgba(0, 230, 118, 0.1)', border: 'none', color: 'var(--success-color)', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem', fontWeight: 'bold' }}
                              title="Marcar como resuelta"
                            >
                              Resolver
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteIncidencia(inc.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', opacity: 0.6 }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0', lineHeight: '1.4', opacity: inc.estado === 'resuelta' ? 0.6 : 1 }}>{inc.descripcion}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                        Creado: {new Date(inc.fecha_creacion).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
