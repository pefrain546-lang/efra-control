import { useState, useEffect, useRef } from 'react';
import { Database, ScanLine, FileBarChart, PlusCircle, Trash2, AlertTriangle, CheckCircle, PackageSearch, Upload, Printer, Archive, ChevronDown, ChevronRight, WifiOff } from 'lucide-react';

const API = 'http://localhost:3001/api';
const STORAGE_KEY = 'efra_inventarios_historial';
const CURRENT_KEY = 'efra_inventario_actual';

export default function Inventario() {
  const [activeTab, setActiveTab] = useState('sistema');
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const isFirstLoad = useRef(true);

  // Data States — inicia vacío, se carga desde API
  const [sistemaData, setSistemaData] = useState([]);
  const [fisicoData, setFisicoData] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [historialExpandido, setHistorialExpandido] = useState(null);

  // Input States
  const [pasteInput, setPasteInput] = useState('');
  const [fisicoInput, setFisicoInput] = useState('');
  const [sectionToPrint, setSectionToPrint] = useState(null);

  // Cargar datos al montar desde la API (con fallback a localStorage)
  useEffect(() => {
    Promise.all([
      fetch(`${API}/inventario-actual`).then(r => r.json()),
      fetch(`${API}/historial`).then(r => r.json())
    ]).then(([actual, hist]) => {
      setSistemaData(actual.sistemaData || []);
      setFisicoData(actual.fisicoData || []);
      setHistorial(hist || []);
      setApiOnline(true);
    }).catch(() => {
      // Fallback a localStorage si no hay conexión
      setApiOnline(false);
      try {
        const s = localStorage.getItem(CURRENT_KEY);
        if (s) { const p = JSON.parse(s); setSistemaData(p.sistemaData || []); setFisicoData(p.fisicoData || []); }
        const h = localStorage.getItem(STORAGE_KEY);
        if (h) setHistorial(JSON.parse(h));
      } catch {}
    }).finally(() => setLoading(false));
  }, []);

  // Auto-guardar en PostgreSQL con debounce de 1.5s (solo después de la carga inicial)
  useEffect(() => {
    if (loading || isFirstLoad.current) { isFirstLoad.current = false; return; }
    const timer = setTimeout(() => {
      setSaving(true);
      fetch(`${API}/inventario-actual`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistemaData, fisicoData })
      }).then(() => setApiOnline(true))
        .catch(() => {
          setApiOnline(false);
          localStorage.setItem(CURRENT_KEY, JSON.stringify({ sistemaData, fisicoData }));
        })
        .finally(() => setSaving(false));
    }, 1500);
    return () => clearTimeout(timer);
  }, [sistemaData, fisicoData]);

  useEffect(() => {
    if (sectionToPrint) {
      const timer = setTimeout(() => { window.print(); setSectionToPrint(null); }, 300);
      return () => clearTimeout(timer);
    }
  }, [sectionToPrint]);

  // --- CERRAR INVENTARIO ---
  const handleCerrarInventario = async () => {
    if (!window.confirm('¿Cerrar este inventario y guardarlo en el historial? Se abrirá uno nuevo en blanco.')) return;
    const nombre = prompt('Nombre para este inventario (ej: Inventario Mayo 2026):', `Inventario ${new Date().toLocaleDateString('es-PE')}`);
    if (!nombre) return;
    try {
      const res = await fetch(`${API}/historial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, sistemaData, fisicoData })
      });
      if (!res.ok) throw new Error('Error del servidor');
      const nuevoHist = await fetch(`${API}/historial`).then(r => r.json());
      setHistorial(nuevoHist);
      setSistemaData([]);
      setFisicoData([]);
      setActiveTab('historial');
      alert(`✅ Inventario "${nombre}" guardado en PostgreSQL.`);
    } catch {
      // Fallback a localStorage
      const entrada = { id: Date.now(), nombre, fecha: new Date().toLocaleString('es-PE'), sistemaData, fisicoData };
      const nuevo = [entrada, ...historial];
      setHistorial(nuevo);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevo));
      setSistemaData([]);
      setFisicoData([]);
      localStorage.removeItem(CURRENT_KEY);
      setActiveTab('historial');
      alert(`⚠️ Guardado localmente (sin conexión al servidor).`);
    }
  };

  const handleEliminarDelHistorial = async (id) => {
    if (!window.confirm('¿Eliminar este inventario del historial?')) return;
    try {
      await fetch(`${API}/historial/${id}`, { method: 'DELETE' });
      setHistorial(h => h.filter(x => x.id !== id));
    } catch {
      setHistorial(h => h.filter(x => x.id !== id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historial.filter(x => x.id !== id)));
    }
  };

  // --- LÓGICA DE SISTEMA ---
  const handleParseExcel = () => {
    if (!pasteInput.trim()) return;

    const rows = pasteInput.trim().split('\n');
    const parsedData = [];

    // Asumimos que no hay cabeceras, o si las hay, el usuario las pegó. 
    // Para ser seguros, si la primera fila parece cabecera, la saltamos? 
    // Mejor parseamos todo y si falta una columna requerida lo marcamos como error.

    rows.forEach((row, index) => {
      const columns = row.split('\t').map(col => col.trim());
      // Requerimos al menos las 7 columnas: fecha, tipo boleta, nro boleta, tipo pago, consignado, descripcion, monto
      if (columns.length >= 7) {
        parsedData.push({
          id: `sys-${Date.now()}-${index}`,
          fecha: columns[0],
          tipoBoleta: columns[1],
          nroBoleta: columns[2],
          tipoPago: columns[3],
          consignado: columns[4],
          descripcion: columns[5],
          monto: columns[6]
        });
      }
    });

    setSistemaData([...sistemaData, ...parsedData]);
    setPasteInput('');
    alert(`Se agregaron ${parsedData.length} registros al sistema.`);
  };

  const handleClearSistema = () => {
    if (window.confirm('¿Seguro que deseas borrar toda la data del Sistema?')) {
      setSistemaData([]);
    }
  };

  const handleDeleteSistemaRow = (id) => {
    setSistemaData(sistemaData.filter(item => item.id !== id));
  };

  // --- LÓGICA DE FÍSICO ---
  const handleAddFisico = (e) => {
    e.preventDefault();
    if (!fisicoInput.trim()) return;

    let parsedInput = fisicoInput.trim();
    
    // Autocompletar con ceros si tiene guion
    if (parsedInput.includes('-')) {
      const parts = parsedInput.split('-');
      const numberPart = parts.pop();
      const prefixPart = parts.join('-');
      if (/^\d+$/.test(numberPart) && numberPart.length < 7) {
        parsedInput = `${prefixPart}-${numberPart.padStart(7, '0')}`;
      }
    }

    // Evitar duplicados
    if (fisicoData.includes(parsedInput)) {
      alert('Este número de encomienda ya fue registrado en físico.');
      setFisicoInput('');
      return;
    }

    setFisicoData([...fisicoData, parsedInput]);
    setFisicoInput('');
  };

  const handleDeleteFisicoRow = (nro) => {
    setFisicoData(fisicoData.filter(item => item !== nro));
  };

  const handleClearFisico = () => {
    if (window.confirm('¿Seguro que deseas borrar toda la data de Físico?')) {
      setFisicoData([]);
    }
  };

  // --- LÓGICA DE REPORTE ---
  // Parsear fecha formato DD/MM/YYYY, YYYY-MM-DD o Serial de Excel
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    let d = String(dateStr).trim();
    
    // 1. Si es un número (formato serial de Excel)
    if (/^\d+$/.test(d) && parseInt(d) > 10000) {
      // 25569 es la diferencia en días entre 1-Ene-1900 (Excel) y 1-Ene-1970 (UNIX)
      const excelDays = parseInt(d);
      const jsDate = new Date((excelDays - 25569) * 86400 * 1000);
      // Sumamos un día porque Excel cuenta el año 1900 como bisiesto (bug histórico de Lotus 1-2-3)
      jsDate.setDate(jsDate.getDate() + 1);
      if (!isNaN(jsDate.getTime())) return jsDate;
    }

    // 2. Intentar reemplazar guiones y puntos por slashes
    d = d.replace(/[-.]/g, '/');
    const parts = d.split('/');
    
    if (parts.length === 3) {
      // Si el primer segmento es año (ej: 2023/12/31)
      if (parts[0].length === 4) {
        return new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T00:00:00`);
      }
      // Asumimos DD/MM/YYYY
      return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
    }
    
    // 3. Intento formato estándar nativo
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;

    return new Date(); // Fallback: si falla, asume "hoy" para que no salte como antigua por error.
  };

  const isOlderThan2Months = (dateStr) => {
    const itemDate = parseDate(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - itemDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 60;
  };

  // Cálculos para el reporte
  const faltantes = sistemaData.filter(sysItem => !fisicoData.includes(sysItem.nroBoleta));
  const faltantesPorPagar = faltantes.filter(item => item.tipoPago && item.tipoPago.toLowerCase() === 'pp');
  const sobrantes = fisicoData.filter(fisicoNro => !sistemaData.some(sysItem => sysItem.nroBoleta === fisicoNro));
  const antiguas = sistemaData.filter(sysItem => isOlderThan2Months(sysItem.fecha));

  // Encomiendas que están OK (en ambos lados)
  const okData = sistemaData.filter(sysItem => fisicoData.includes(sysItem.nroBoleta));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* BARRA DE ESTADO DB */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', marginBottom: '-0.5rem' }}>
        {saving ? (
          <span style={{ color: 'var(--primary-color)' }}>⏳ Guardando en PostgreSQL...</span>
        ) : apiOnline ? (
          <span style={{ color: 'var(--success-color)' }}>🟢 PostgreSQL conectado</span>
        ) : (
          <span style={{ color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <WifiOff size={13} /> Sin servidor — usando almacenamiento local
          </span>
        )}
      </div>

      {/* PANTALLA DE CARGA */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Conectando con PostgreSQL...</p>
        </div>
      )}

      {!loading && (<>

      {/* NAVEGACIÓN DE PESTAÑAS */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
        <button
          className="btn"
          style={{
            background: activeTab === 'sistema' ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
            color: activeTab === 'sistema' ? '#000' : 'var(--text-primary)',
            border: activeTab === 'sistema' ? 'none' : '1px solid var(--surface-border)',
            flex: 1
          }}
          onClick={() => setActiveTab('sistema')}
        >
          <Database size={18} style={{ marginRight: '0.5rem' }} /> 1. Sistema
        </button>
        <button
          className="btn"
          style={{
            background: activeTab === 'fisico' ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
            color: activeTab === 'fisico' ? '#000' : 'var(--text-primary)',
            border: activeTab === 'fisico' ? 'none' : '1px solid var(--surface-border)',
            flex: 1
          }}
          onClick={() => setActiveTab('fisico')}
        >
          <ScanLine size={18} style={{ marginRight: '0.5rem' }} /> 2. Físico
        </button>
        <button
          className="btn"
          style={{
            background: activeTab === 'reporte' ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
            color: activeTab === 'reporte' ? '#000' : 'var(--text-primary)',
            border: activeTab === 'reporte' ? 'none' : '1px solid var(--surface-border)',
            flex: 1
          }}
          onClick={() => setActiveTab('reporte')}
        >
          <FileBarChart size={18} style={{ marginRight: '0.5rem' }} /> 3. Reporte
        </button>
        <button
          className="btn"
          style={{
            background: activeTab === 'historial' ? 'var(--primary-color)' : 'rgba(0,0,0,0.2)',
            color: activeTab === 'historial' ? '#000' : 'var(--text-primary)',
            border: activeTab === 'historial' ? 'none' : '1px solid var(--surface-border)',
            flex: 1
          }}
          onClick={() => setActiveTab('historial')}
        >
          <Archive size={18} style={{ marginRight: '0.5rem' }} /> 4. Historial
        </button>
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS */}
      <div className="glass-panel" style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>

        {/* === PESTAÑA: SISTEMA === */}
        {activeTab === 'sistema' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Database color="var(--primary-color)" /> Datos del Sistema
              </h3>
              <span style={{ background: 'rgba(102, 252, 241, 0.1)', color: 'var(--primary-color)', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                Total: {sistemaData.length}
              </span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Pegar datos desde Excel (7 columnas obligatorias: Fecha, Tipo Boleta, Nro Boleta, Tipo Pago, Consignado, Descripcion, Monto)</label>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Pega aquí las filas de tu Excel..."
                style={{ width: '100%', height: '120px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={handleParseExcel} disabled={!pasteInput.trim()}>
                  <Upload size={18} style={{ marginRight: '0.5rem' }} /> Cargar Datos
                </button>
              </div>
            </div>

            {sistemaData.length > 0 && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                  <button onClick={handleClearSistema} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Trash2 size={14} /> Borrar Todo
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-secondary)' }}>
                    <tr>
                      <th style={{ padding: '0.8rem' }}>Fecha</th>
                      <th style={{ padding: '0.8rem' }}>Boleta</th>
                      <th style={{ padding: '0.8rem' }}>Consignado</th>
                      <th style={{ padding: '0.8rem' }}>Descripción</th>
                      <th style={{ padding: '0.8rem' }}>Monto</th>
                      <th style={{ padding: '0.8rem' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sistemaData.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.8rem' }}>{item.fecha}</td>
                        <td style={{ padding: '0.8rem' }}>
                          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{item.nroBoleta}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.tipoBoleta}</div>
                        </td>
                        <td style={{ padding: '0.8rem' }}>{item.consignado}</td>
                        <td style={{ padding: '0.8rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.descripcion}>{item.descripcion}</td>
                        <td style={{ padding: '0.8rem' }}>{item.monto}</td>
                        <td style={{ padding: '0.8rem' }}>
                          <button onClick={() => handleDeleteSistemaRow(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* === PESTAÑA: FÍSICO === */}
        {activeTab === 'fisico' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <ScanLine color="var(--primary-color)" /> Encomiendas Físicas
              </h3>
              <span style={{ background: 'rgba(102, 252, 241, 0.1)', color: 'var(--primary-color)', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                Total: {fisicoData.length}
              </span>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
              <form onSubmit={handleAddFisico} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="fisicoInput" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ingresar Número de Boleta/Encomienda</label>
                  <input
                    id="fisicoInput"
                    type="text"
                    value={fisicoInput}
                    onChange={(e) => setFisicoInput(e.target.value)}
                    placeholder="Ej: B001-0012345"
                    className="input-field"
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={!fisicoInput.trim()}>
                  <PlusCircle size={18} /> Agregar
                </button>
              </form>
            </div>

            {fisicoData.length > 0 && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                  <button onClick={handleClearFisico} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Trash2 size={14} /> Borrar Todo
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {fisicoData.map((nro, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '1px' }}>{nro}</span>
                      <button onClick={() => handleDeleteFisicoRow(nro)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === PESTAÑA: REPORTE === */}
        {activeTab === 'reporte' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <FileBarChart color="var(--primary-color)" /> Resultados del Cruce
              </h3>
              <button className="btn no-print" onClick={handleCerrarInventario}
                style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.4)', color: '#ef5350', width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
                <Archive size={16} style={{ marginRight: '0.4rem' }} /> Cerrar y Guardar Inventario
              </button>
            </div>

            {/* RESUMEN ESTADÍSTICO */}
            {!sectionToPrint && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <CheckCircle size={32} color="var(--success-color)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ color: 'var(--success-color)', margin: '0 0 0.5rem 0' }}>Coinciden (OK)</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{okData.length}</div>
              </div>

              <div style={{ background: 'rgba(255, 75, 75, 0.1)', border: '1px solid rgba(255, 75, 75, 0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <PackageSearch size={32} color="var(--danger-color)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ color: 'var(--danger-color)', margin: '0 0 0.5rem 0' }}>Faltantes en Físico</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{faltantes.length}</div>
              </div>

              <div style={{ background: 'rgba(255, 64, 129, 0.1)', border: '1px solid rgba(255, 64, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <PackageSearch size={32} color="#ff4081" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ color: '#ff4081', margin: '0 0 0.5rem 0' }}>Faltantes PP</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{faltantesPorPagar.length}</div>
              </div>

              <div style={{ background: 'rgba(255, 167, 38, 0.1)', border: '1px solid rgba(255, 167, 38, 0.3)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                <AlertTriangle size={32} color="var(--warning-color)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ color: 'var(--warning-color)', margin: '0 0 0.5rem 0' }}>Sobrantes en Físico</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{sobrantes.length}</div>
              </div>
            </div>
            )}

            {/* LISTAS DETALLADAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              {/* FALTANTES */}
              {(!sectionToPrint || sectionToPrint === 'faltantes') && faltantes.length > 0 && (
                <div>
                  <div style={{ borderBottom: '1px solid rgba(255, 75, 75, 0.3)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ color: 'var(--danger-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PackageSearch size={18} /> Faltantes (Están en Sistema, NO en Almacén)
                    </h4>
                    {!sectionToPrint && (
                      <button className="btn btn-primary no-print" onClick={() => setSectionToPrint('faltantes')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}>
                        <Printer size={14} style={{ marginRight: '0.3rem' }} /> Imprimir
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255, 75, 75, 0.2)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.8rem' }}>Boleta</th>
                          <th style={{ padding: '0.8rem' }}>Consignado</th>
                          <th style={{ padding: '0.8rem' }}>Descripción</th>
                          <th style={{ padding: '0.8rem' }}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faltantes.map((item, idx) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{item.nroBoleta}</td>
                            <td style={{ padding: '0.8rem' }}>{item.consignado}</td>
                            <td style={{ padding: '0.8rem', fontStyle: 'italic', fontSize: '0.85rem' }}>{item.descripcion}</td>
                            <td style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>{item.fecha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* FALTANTES PP */}
              {(!sectionToPrint || sectionToPrint === 'faltantesPP') && faltantesPorPagar.length > 0 && (
                <div>
                  <div style={{ borderBottom: '1px solid rgba(255, 64, 129, 0.3)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ color: '#ff4081', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PackageSearch size={18} /> Faltantes por Pagar (PP)
                    </h4>
                    {!sectionToPrint && (
                      <button className="btn btn-primary no-print" onClick={() => setSectionToPrint('faltantesPP')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto', backgroundColor: '#ff4081', color: '#fff', border: 'none' }}>
                        <Printer size={14} style={{ marginRight: '0.3rem' }} /> Imprimir
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255, 64, 129, 0.2)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.8rem' }}>Boleta</th>
                          <th style={{ padding: '0.8rem' }}>Consignado</th>
                          <th style={{ padding: '0.8rem' }}>Descripción</th>
                          <th style={{ padding: '0.8rem' }}>Monto</th>
                          <th style={{ padding: '0.8rem' }}>Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faltantesPorPagar.map((item, idx) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(255, 64, 129, 0.05)' : 'transparent' }}>
                            <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{item.nroBoleta}</td>
                            <td style={{ padding: '0.8rem' }}>{item.consignado}</td>
                            <td style={{ padding: '0.8rem', fontStyle: 'italic', fontSize: '0.85rem' }}>{item.descripcion}</td>
                            <td style={{ padding: '0.8rem', color: '#ff4081', fontWeight: 'bold' }}>{item.monto}</td>
                            <td style={{ padding: '0.8rem', color: 'var(--text-secondary)' }}>{item.fecha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SOBRANTES */}
              {(!sectionToPrint || sectionToPrint === 'sobrantes') && sobrantes.length > 0 && (
                <div>
                  <div style={{ borderBottom: '1px solid rgba(255, 167, 38, 0.3)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ color: 'var(--warning-color)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} /> Sobrantes (Están en Almacén, NO en Sistema)
                    </h4>
                    {!sectionToPrint && (
                      <button className="btn btn-primary no-print" onClick={() => setSectionToPrint('sobrantes')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}>
                        <Printer size={14} style={{ marginRight: '0.3rem' }} /> Imprimir
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {sobrantes.map((nro, idx) => (
                      <span key={idx} style={{ background: 'rgba(255, 167, 38, 0.1)', border: '1px solid rgba(255, 167, 38, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontWeight: 'bold', color: 'var(--warning-color)', fontSize: '0.9rem' }}>
                        {nro}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ANTIGUAS */}
              {(!sectionToPrint || sectionToPrint === 'antiguas') && antiguas.length > 0 && (
                <div>
                  <div style={{ borderBottom: '1px solid rgba(179, 136, 255, 0.3)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ color: '#b388ff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={18} /> Antiguas (&gt; 2 Meses en Sistema)
                    </h4>
                    {!sectionToPrint && (
                      <button className="btn btn-primary no-print" onClick={() => setSectionToPrint('antiguas')} style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}>
                        <Printer size={14} style={{ marginRight: '0.3rem' }} /> Imprimir
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(179, 136, 255, 0.2)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.8rem' }}>Boleta</th>
                          <th style={{ padding: '0.8rem' }}>Consignado</th>
                          <th style={{ padding: '0.8rem' }}>Descripción</th>
                          <th style={{ padding: '0.8rem' }}>Fecha Recibida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {antiguas.map((item, idx) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(179, 136, 255, 0.05)' : 'transparent' }}>
                            <td style={{ padding: '0.8rem', fontWeight: 'bold' }}>{item.nroBoleta}</td>
                            <td style={{ padding: '0.8rem' }}>{item.consignado}</td>
                            <td style={{ padding: '0.8rem', fontStyle: 'italic', fontSize: '0.85rem' }}>{item.descripcion}</td>
                            <td style={{ padding: '0.8rem', color: '#b388ff', fontWeight: 'bold' }}>{item.fecha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!sectionToPrint && faltantes.length === 0 && sobrantes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--success-color)' }}>
                  <CheckCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p style={{ fontSize: '1.2rem' }}>¡Perfecto! El inventario físico cuadra exactamente con el sistema.</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* === PESTAÑA: HISTORIAL === */}
        {activeTab === 'historial' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Archive color="var(--primary-color)" /> Historial de Inventarios
              </h3>
              <span style={{ background: 'rgba(102,252,241,0.1)', color: 'var(--primary-color)', padding: '0.3rem 0.8rem', borderRadius: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {historial.length} guardado(s)
              </span>
            </div>

            {historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Archive size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>Aún no hay inventarios guardados.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Usa "Cerrar y Guardar Inventario" desde la pestaña Reporte.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {historial.map(inv => (
                  <div key={inv.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', cursor: 'pointer' }}
                      onClick={() => setHistorialExpandido(historialExpandido === inv.id ? null : inv.id)}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{inv.nombre}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Cerrado: {inv.fecha} &nbsp;|&nbsp; {inv.sistemaData.length} en sistema &nbsp;|&nbsp; {inv.fisicoData.length} en físico</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {historialExpandido === inv.id ? <ChevronDown size={18} color="var(--text-secondary)" /> : <ChevronRight size={18} color="var(--text-secondary)" />}
                        <button onClick={(e) => { e.stopPropagation(); handleEliminarDelHistorial(inv.id); }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.2rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {historialExpandido === inv.id && (
                      <div style={{ borderTop: '1px solid var(--surface-border)', padding: '1rem 1.5rem', overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-secondary)' }}>
                            <tr>
                              <th style={{ padding: '0.5rem' }}>Fecha</th>
                              <th style={{ padding: '0.5rem' }}>Nro Boleta</th>
                              <th style={{ padding: '0.5rem' }}>Consignado</th>
                              <th style={{ padding: '0.5rem' }}>Descripción</th>
                              <th style={{ padding: '0.5rem' }}>Tipo Pago</th>
                              <th style={{ padding: '0.5rem' }}>Monto</th>
                              <th style={{ padding: '0.5rem' }}>¿En Físico?</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.sistemaData.map((item, idx) => (
                              <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '0.5rem' }}>{item.fecha}</td>
                                <td style={{ padding: '0.5rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>{item.nroBoleta}</td>
                                <td style={{ padding: '0.5rem' }}>{item.consignado}</td>
                                <td style={{ padding: '0.5rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.descripcion}</td>
                                <td style={{ padding: '0.5rem', color: item.tipoPago?.toLowerCase() === 'pp' ? '#ff4081' : 'var(--text-secondary)', fontWeight: item.tipoPago?.toLowerCase() === 'pp' ? 'bold' : 'normal' }}>{item.tipoPago}</td>
                                <td style={{ padding: '0.5rem' }}>{item.monto}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  {inv.fisicoData.includes(item.nroBoleta)
                                    ? <CheckCircle size={16} color="var(--success-color)" />
                                    : <PackageSearch size={16} color="var(--danger-color)" />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      </>)}

    </div>
  );
}
