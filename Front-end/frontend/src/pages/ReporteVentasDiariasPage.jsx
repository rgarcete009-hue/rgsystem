// src/pages/ReporteVentasDiariasPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CSVLink } from 'react-csv';
import styles from './CSS/ReporteVentasDiariasPage.module.css';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? process.env.REACT_APP_API_URL_LAN
  : process.env.REACT_APP_API_URL_PUBLIC;

const DEFAULT_PAGE_SIZE = 50;

const ReporteVentasDiariasPage = () => {
  // ============ TEMA OSCURO/CLARO ============
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  // ============================================

  // filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cliente, setCliente] = useState('');
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // datos / ui
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // para cancelar requests
  const abortRef = useRef(null);

  // defecto: hoy
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    setDesde(hoy);
    setHasta(hoy);
  }, []);

  // reset a pag 1 cuando cambian filtros o pagesize
  useEffect(() => { setPage(1); }, [desde, hasta, cliente, tipo, q, pageSize]);

  useEffect(() => {
    if (!desde || !hasta) return;
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, desde, hasta, cliente, tipo, q]);

  async function fetchVentas() {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true); setErr('');
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/ventas`, {
        params: {
          desde, hasta,
          cliente_id: cliente || undefined,
          q: q || undefined,
          tipo: tipo || undefined,
          page, pageSize
        },
        signal: ctrl.signal
      });

      if (Array.isArray(data)) {
        setVentas(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setVentas(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      if (axios.isCancel(e)) return;
      console.error('Error fetch ventas:', e);
      setErr(e?.response?.data?.error || e?.message || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }

  // CSV (página actual)
  const csvHeaders = useMemo(() => ([
    { label: 'ID', key: 'id' },
    { label: 'Fecha', key: 'fecha' },
    { label: 'Cliente', key: 'cliente' },
    { label: 'Total', key: 'total' },
    { label: 'Método de Pago', key: 'metodo_pago' },
    { label: 'Tipo', key: 'tipo' },
    { label: 'Repartidor/Contacto', key: 'repartidor' },
    { label: 'Factura', key: 'numero_factura' },
  ]), []);

  const csvData = useMemo(() => ventas.map(v => ({
    id: v.id,
    fecha: new Date(v.fecha).toLocaleString('es-PY'),
    cliente: v.cliente ? v.cliente.nombre : '',
    total: Number(v.total ?? 0).toFixed(0),
    metodo_pago: v.metodo_pago,
    tipo: v.pedido ? v.pedido.tipo : 'mostrador',
    repartidor: v.pedido ? (v.pedido.delivery_nombre || '') : '',
    numero_factura: v.numero_factura || ''
  })), [ventas]);

  // Exportar TODO
  const [exporting, setExporting] = useState(false);
  const [csvAllBlobUrl, setCsvAllBlobUrl] = useState(null);
  
  async function exportAllCsv() {
    setExporting(true); setCsvAllBlobUrl(null);
    try {
      const allRows = [];
      let curPage = 1;
      const limit = 1000;
      
      while (true) {
        const { data } = await axios.get(`${API_BASE_URL}/api/ventas`, {
          params: { 
            desde, hasta, 
            cliente_id: cliente || undefined, 
            q: q || undefined, 
            tipo: tipo || undefined, 
            page: curPage, 
            pageSize: limit 
          }
        });
        const rows = Array.isArray(data) ? data : (data.data || []);
        allRows.push(...rows);
        const totalPagesSrv = Array.isArray(data) ? 1 : (data.totalPages || 1);
        if (Array.isArray(data)) break;
        if (curPage >= totalPagesSrv) break;
        curPage += 1;
      }
      
      const header = csvHeaders.map(h => h.label).join(';') + '\n';
      const lines = allRows.map(v => ([
        v.id,
        new Date(v.fecha).toLocaleString('es-PY'),
        v.cliente ? v.cliente.nombre : '',
        Number(v.total ?? 0).toFixed(0),
        v.metodo_pago,
        v.pedido ? v.pedido.tipo : 'mostrador',
        v.pedido ? (v.pedido.delivery_nombre || '') : '',
        v.numero_factura || ''
      ].map(cell => String(cell).replace(/;/g, ',')).join(';'))).join('\n');
      
      const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      setCsvAllBlobUrl(url);
    } catch (e) {
      console.error('Export all error:', e);
      alert('No se pudo exportar el total. Probá con un rango más acotado.');
    } finally {
      setExporting(false);
    }
  }

  const start = totalPages > 1 ? (page - 1) * pageSize + 1 : (ventas.length ? 1 : 0);
  const end = totalPages > 1 ? Math.min(page * pageSize, total) : ventas.length;

  const formatGs = (n) => Number(n || 0).toLocaleString('es-PY');

  // Calcular totales
  const totalMostrado = useMemo(() => 
    ventas.reduce((sum, v) => sum + Number(v.total || 0), 0)
  , [ventas]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📊 Reporte de Ventas Diarias</h1>
          <p className={styles.subtitle}>
            Filtrá por fechas, cliente y búsqueda libre con paginación optimizada
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Desde</label>
            <input 
              type="date" 
              value={desde} 
              onChange={(e) => setDesde(e.target.value)} 
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Hasta</label>
            <input 
              type="date" 
              value={hasta} 
              onChange={(e) => setHasta(e.target.value)} 
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Cliente</label>
            <input 
              value={cliente} 
              onChange={(e) => setCliente(e.target.value)} 
              placeholder="ID o nombre del cliente" 
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Teléfono, dirección, referencia..."
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Tipo</label>
            <select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value)}
              className={styles.select}
            >
              <option value="">Todos</option>
              <option value="mostrador">Mostrador</option>
              <option value="mesa">Mesa</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>
        </div>

        <div className={styles.actionsRow}>
          <button 
            onClick={() => { setPage(1); fetchVentas(); }} 
            className={styles.primaryBtn}
            disabled={loading}
          >
            {loading ? '⏳ Cargando...' : '🔍 Consultar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {err && <div className={styles.alertError}>{err}</div>}

      {/* Resumen */}
      {ventas.length > 0 && (
        <div className={styles.summaryCard}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Total en Página</span>
            <span className={styles.summaryValue}>Gs. {formatGs(totalMostrado)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Registros</span>
            <span className={styles.summaryValue}>{ventas.length}</span>
          </div>
        </div>
      )}

      {/* Paginación superior */}
      <div className={styles.paginationBar}>
        <div className={styles.paginationInfo}>
          {loading
            ? '⏳ Cargando...'
            : totalPages > 1
              ? `Mostrando ${start}-${end} de ${total} registros`
              : (ventas.length ? `${ventas.length} registros` : 'Sin resultados')}
        </div>

        <div className={styles.paginationControls}>
          <label className={styles.pageSizeLabel}>
            Tamaño:
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(Number(e.target.value))} 
              disabled={loading}
              className={styles.pageSizeSelect}
            >
              {[10, 20, 50, 100, 200, 500].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className={styles.paginationButtons}>
            <button 
              disabled={loading || page <= 1} 
              onClick={() => setPage(1)}
              className={styles.pageBtn}
              title="Primera página"
            >
              ⏮️
            </button>
            <button 
              disabled={loading || page <= 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={styles.pageBtn}
              title="Anterior"
            >
              ◀️
            </button>
            <span className={styles.pageIndicator}>
              Página {page} / {totalPages}
            </span>
            <button 
              disabled={loading || page >= totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={styles.pageBtn}
              title="Siguiente"
            >
              ▶️
            </button>
            <button 
              disabled={loading || page >= totalPages} 
              onClick={() => setPage(totalPages)}
              className={styles.pageBtn}
              title="Última página"
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {ventas.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Método</th>
                  <th>Tipo</th>
                  <th>Repartidor</th>
                  <th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(v => {
                  const tipoOp = v.pedido ? v.pedido.tipo : 'mostrador';
                  return (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td>{new Date(v.fecha).toLocaleString('es-PY')}</td>
                      <td>{v.cliente ? v.cliente.nombre : '—'}</td>
                      <td className={styles.colMoney}>Gs. {formatGs(v.total)}</td>
                      <td>{v.metodo_pago}</td>
                      <td>
                        <span className={styles[`badge${tipoOp.charAt(0).toUpperCase() + tipoOp.slice(1)}`]}>
                          {tipoOp}
                        </span>
                      </td>
                      <td>{v.pedido ? (v.pedido.delivery_nombre || '—') : '—'}</td>
                      <td className={styles.colNumero}>{v.numero_factura || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <p>No hay ventas registradas en el rango seleccionado</p>
        </div>
      ) : null}

      {/* Exportar CSV */}
      {ventas.length > 0 && (
        <div className={styles.exportCard}>
          <h3 className={styles.exportTitle}>📥 Exportar Datos</h3>
          <div className={styles.exportActions}>
            <CSVLink
              filename={`reporte_ventas_p${page}_size${pageSize}_${Date.now()}.csv`}
              data={csvData}
              headers={csvHeaders}
              separator=";"
              className={styles.csvLink}
            >
              📄 Exportar CSV (página actual)
            </CSVLink>

            <button 
              onClick={exportAllCsv} 
              disabled={exporting || loading} 
              className={styles.exportAllBtn}
            >
              {exporting ? '⏳ Exportando todo...' : '📦 Exportar TODO (paginado)'}
            </button>
            
            {csvAllBlobUrl && (
              <a 
                href={csvAllBlobUrl} 
                download={`reporte_ventas_full_${Date.now()}.csv`} 
                className={styles.downloadLink}
              >
                ✅ Descargar CSV completo
              </a>
            )}
          </div>
        </div>
      )}

      
    </div>
  );
};

export default ReporteVentasDiariasPage;