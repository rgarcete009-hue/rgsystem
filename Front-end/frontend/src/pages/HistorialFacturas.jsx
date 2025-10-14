// src/pages/HistorialFacturas.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import styles from './CSS/HistorialFacturas.module.css';
// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

/* ============ Helpers de formato y correlatividad ============ */
function parseNroFactura(nf) {
  if (!nf) return { serie: '', nro: null, nroStr: '' };
  const s = String(nf).trim();
  const m = s.match(/^(\d{3})-(\d{3})-(\d{1,7})$/);
  if (!m) {
    const m2 = s.match(/^(\d{3})(\d{3})(\d{1,7})$/);
    if (!m2) return { serie: '', nro: null, nroStr: '' };
    const nroNum = parseInt(m2[3], 10);
    return { serie: `${m2[1]}-${m2[2]}`, nro: isNaN(nroNum) ? null : nroNum, nroStr: m2[3].padStart(7, '0') };
  }
  const nroNum = parseInt(m[3], 10);
  return { serie: `${m[1]}-${m[2]}`, nro: isNaN(nroNum) ? null : nroNum, nroStr: m[3].padStart(7, '0') };
}

function compactarRangos(nums, pad = 7) {
  if (!nums.length) return '';
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) { prev = n; continue; }
    ranges.push(start === prev ? String(start).padStart(pad, '0') : `${String(start).padStart(pad, '0')}-${String(prev).padStart(pad, '0')}`);
    start = n; prev = n;
  }
  ranges.push(start === prev ? String(start).padStart(pad, '0') : `${String(start).padStart(pad, '0')}-${String(prev).padStart(pad, '0')}`);
  return ranges.join(', ');
}

function calcularCorrelatividad(ventas) {
  const porSerie = new Map();
  (ventas ?? []).forEach(v => {
    const nf = v.numero_factura ?? v.numero ?? v.nro ?? '';
    const { serie, nro } = parseNroFactura(nf);
    if (!serie || nro == null) return;
    if (!porSerie.has(serie)) porSerie.set(serie, new Set());
    porSerie.get(serie).add(nro);
  });
  const resumen = [];
  for (const [serie, setNums] of porSerie.entries()) {
    const nums = Array.from(setNums).sort((a, b) => a - b);
    const min = nums[0];
    const max = nums[nums.length - 1];
    const encontrados = nums.length;
    const esperados = max - min + 1;
    const faltantesList = [];
    let expected = min;
    for (const n of nums) {
      while (expected < n) { faltantesList.push(expected); expected++; }
      expected = n + 1;
    }
    const faltantes = faltantesList.length;
    const rangos = compactarRangos(faltantesList);
    resumen.push({
      Serie: serie,
      Minimo: min != null ? String(min).padStart(7, '0') : '',
      Maximo: max != null ? String(max).padStart(7, '0') : '',
      Encontrados: encontrados,
      Esperados: esperados,
      Faltantes: faltantes,
      Rangos_Faltantes: rangos,
    });
  }
  return resumen.sort((a, b) => a.Serie.localeCompare(b.Serie));
}

const DEFAULT_PAGE_SIZE = 50;

const HistorialFacturas = () => {
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

  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // export & correlatividad
  const [exporting, setExporting] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [alertaCorrel, setAlertaCorrel] = useState(null);

  // cancelación de requests
  const abortRef = useRef(null);

  // helpers UI
  const formatearGs = (valor) =>
    Number(valor).toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  const formatearFechaLocal = (f) => (f ? new Date(f).toLocaleString('es-PY') : '');
  const formatearFechaISO = (f) => {
    if (!f) return '';
    const d = new Date(f);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // por defecto: hoy
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    setDesde(hoy);
    setHasta(hoy);
  }, []);

  // reset a página 1 si cambian filtros/sizes
  useEffect(() => { setPage(1); }, [desde, hasta, pageSize, q, tipo]);

  // fetch principal (paginado y liviano)
  const fetchVentas = useCallback(async () => {
    if (!desde || !hasta) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError('');
    try {
      const resp = await axios.get(`${API_BASE_URL}/api/ventas`, {
        params: {
          desde, hasta,
          includeClient: true,
          page, pageSize,
          q: q || undefined,
          tipo: tipo || undefined
        },
        signal: ctrl.signal,
      });
      const data = resp.data ?? [];
      if (Array.isArray(data)) {
        setVentas(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setVentas(data.data ?? []);
        setTotal(Number(data.total ?? 0));
        setTotalPages(Number(data.totalPages ?? 1));
      }
      const resumenPage = calcularCorrelatividad(Array.isArray(data) ? data : (data.data ?? []));
      const totalFaltantesPage = resumenPage.reduce((acc, r) => acc + (r.Faltantes ?? 0), 0);
      setAlertaCorrel(totalFaltantesPage > 0 ? { totalFaltantes: totalFaltantesPage, series: resumenPage.length, scope: 'page' } : null);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Error al cargar las ventas:', err);
      setError('Error al cargar las ventas. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, page, pageSize, q, tipo]);

  useEffect(() => { fetchVentas(); }, [fetchVentas]);

  // ANULAR
  const handleAnularVenta = async (ventaId) => {
    if (!window.confirm(`¿Anular la factura #${ventaId}? Esto devolverá el stock.`)) return;
    try {
      await axios.put(`${API_BASE_URL}/api/ventas/${ventaId}/anular`);
      setVentas((prev) => prev.map((v) => (v.id === ventaId ? { ...v, estado: 'anulado' } : v)));
      alert(`Factura #${ventaId} anulada y stock devuelto.`);
    } catch (err) {
      console.error('Error al anular la venta:', err);
      const msg = err.response?.data?.message ?? 'Error al anular la factura.';
      alert(msg);
      setError(msg);
    }
  };

  /* ======================= EXPORTACIÓN & ANALÍTICA ======================= */
  const downloadCSV = (rows, filename) => {
    if (!rows || !rows.length) return;
    const sep = ';';
    const headers = Object.keys(rows[0]);
    const csv =
      headers.join(sep) + '\n' +
      rows
        .map((r) =>
          headers
            .map((h) => {
              let val = r[h] ?? '';
              val = String(val).replace(/"/g, '""');
              return `"${val}"`;
            })
            .join(sep)
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  async function fetchAllVentasRango({ includeDetails = true, includeClient = true } = {}) {
    const all = [];
    let curPage = 1;
    const limit = 1000;
    while (true) {
      const { data } = await axios.get(`${API_BASE_URL}/api/ventas`, {
        params: {
          desde, hasta,
          includeDetails, includeClient,
          page: curPage, pageSize: limit,
          q: q || undefined,
          tipo: tipo || undefined
        }
      });
      const rows = Array.isArray(data) ? data : (data.data ?? []);
      all.push(...rows);
      if (Array.isArray(data)) break;
      const totalPagesSrv = Number(data.totalPages ?? 1);
      if (curPage >= totalPagesSrv) break;
      curPage += 1;
    }
    return all;
  }

  function buildSheetsData(ventasFull) {
    const facturas = (ventasFull ?? []).map((v) => {
      const nf = v.numero_factura ?? v.numero ?? v.nro ?? '';
      const { serie, nro, nroStr } = parseNroFactura(nf);
      const estado = (v.estado ?? 'activo').toUpperCase();
      const anulada = estado === 'ANULADO' ? 'Sí' : 'No';
      return {
        ID: v.id,
        Numero_Factura: nf,
        Serie: serie,
        Correlativo: nro != null ? nroStr : '',
        Fecha: formatearFechaISO(v.fecha),
        Cliente: v.cliente?.nombre ?? '',
        RUC: v.cliente?.ruc ?? '',
        Metodo_Pago: v.metodo_pago ?? v.metodo,
        Tipo: v.pedido ? v.pedido.tipo : 'mostrador',
        Estado: estado,
        Anulada: anulada,
        Total_Gs: Number(v.total ?? 0),
      };
    });

    const detalles = [];
    (ventasFull ?? []).forEach((v) => {
      const nf = v.numero_factura ?? v.numero ?? v.nro ?? '';
      const { serie, nro, nroStr } = parseNroFactura(nf);
      const estado = (v.estado ?? 'activo').toUpperCase();
      const anulada = estado === 'ANULADO' ? 'Sí' : 'No';
      const list = v.detalles ?? v.detallesDeVenta ?? [];
      list.forEach((d) => {
        const prod = d.productoVendido ?? d.producto ?? {};
        detalles.push({
          Venta_ID: v.id,
          Numero_Factura: nf,
          Serie: serie,
          Correlativo: nro != null ? nroStr : '',
          Fecha: formatearFechaISO(v.fecha),
          Producto: prod.nombre ?? d.descripcion ?? '',
          Cantidad: Number(d.cantidad ?? 0),
          Precio_Unitario_Gs: Number(d.precio_unitario ?? 0),
          Subtotal_Gs: Number(d.subtotal ?? 0),
          Impuesto: prod.impuesto ?? d.tasa ?? '',
          Cliente: v.cliente?.nombre ?? '',
          RUC: v.cliente?.ruc ?? '',
          Metodo_Pago: v.metodo_pago ?? v.metodo,
          Tipo: v.pedido ? v.pedido.tipo : 'mostrador',
          Estado: estado,
          Anulada: anulada,
        });
      });
    });

    const contadora = [];
    const ivaResumen = (ventasFull ?? []).map((v) => {
      let IVA5 = 0, IVA10 = 0, GRAV5 = 0, GRAV10 = 0, EXENTO = 0;
      const list = v.detalles ?? v.detallesDeVenta ?? [];
      list.forEach((d) => {
        const subtotal = Number(d.subtotal ?? 0);
        const tasa = Number(d.tasa ?? d.productoVendido?.impuesto ?? d.producto?.impuesto) ?? 10;
        if (tasa === 10) {
          const ivaL = (subtotal * 10) / 110;
          IVA10 += ivaL; GRAV10 += subtotal - ivaL;
        } else if (tasa === 5) {
          const ivaL = (subtotal * 5) / 105;
          IVA5 += ivaL; GRAV5 += subtotal - ivaL;
        } else {
          EXENTO += subtotal;
        }
      });

      const nf = v.numero_factura ?? v.numero ?? v.nro ?? '';
      const { serie, nro, nroStr } = parseNroFactura(nf);
      const estado = (v.estado ?? 'activo').toUpperCase();
      const esAnulada = estado === 'ANULADO';
      const anulada = esAnulada ? 'Sí' : 'No';

      const g10 = Math.round(esAnulada ? 0 : GRAV10);
      const i10 = Math.round(esAnulada ? 0 : IVA10);
      const g5  = Math.round(esAnulada ? 0 : GRAV5);
      const i5  = Math.round(esAnulada ? 0 : IVA5);
      const ex  = Math.round(esAnulada ? 0 : EXENTO);
      const tot = Number(esAnulada ? 0 : (v.total ?? 0));

      const clienteNombre = v.cliente?.nombre ?? '';
      const ruc = v.cliente?.ruc ?? '';
      const clienteYRuc = (clienteNombre || ruc) ? `${clienteNombre}${ruc ? ` (${ruc})` : ''}` : '';
      const metodo = v.metodo_pago ?? v.metodo ?? '';
      const tipoOp = v.pedido ? v.pedido.tipo : 'mostrador';

      contadora.push({
        'Número de factura': nf,
        'Fecha': formatearFechaISO(v.fecha),
        'Cliente y RUC': clienteYRuc,
        'Método de pago': metodo,
        'Tipo': tipoOp,
        'Estado': estado,
        'Anulada': anulada,
        'Gravada 10%': g10,
        'IVA 10%': i10,
        'Gravada 5%': g5,
        'IVA 5%': i5,
        'Exento': ex,
        'Total Gs': tot,
      });

      return {
        Venta_ID: v.id,
        Numero_Factura: nf,
        Serie: serie,
        Correlativo: nro != null ? nroStr : '',
        Fecha: formatearFechaISO(v.fecha),
        Gravada_10: Math.round(GRAV10),
        IVA_10: Math.round(IVA10),
        Gravada_5: Math.round(GRAV5),
        IVA_5: Math.round(IVA5),
        Exento: Math.round(EXENTO),
        Total_Gs: Number(v.total ?? 0),
        Metodo_Pago: v.metodo_pago ?? v.metodo,
        Tipo: v.pedido ? v.pedido.tipo : 'mostrador',
        Estado: estado,
        Anulada: anulada,
        Cliente: v.cliente?.nombre ?? '',
        RUC: v.cliente?.ruc ?? '',
      };
    });

    const correlatividad = calcularCorrelatividad(ventasFull);

    return { contadora, facturas, detalles, ivaResumen, correlatividad };
  }

  const handleExportar = async () => {
    setExporting(true);
    try {
      const ventasFull = await fetchAllVentasRango({ includeDetails: true, includeClient: true });
      if (!ventasFull.length) {
        alert('No hay datos para exportar en el rango seleccionado.');
        return;
      }
      const { contadora, facturas, detalles, ivaResumen, correlatividad } = buildSheetsData(ventasFull);
      const desdeSlug = desde ?? 'inicio';
      const hastaSlug = hasta ?? 'hoy';
      const filenameBase = `Facturas_${desdeSlug}_${hastaSlug}${tipo ? `_tipo_${tipo}` : ''}${q ? '_busqueda' : ''}`;

      if (window.XLSX) {
        const wb = window.XLSX.utils.book_new();
        const ws0 = window.XLSX.utils.json_to_sheet(contadora);
        const ws1 = window.XLSX.utils.json_to_sheet(facturas);
        const ws2 = window.XLSX.utils.json_to_sheet(detalles);
        const ws3 = window.XLSX.utils.json_to_sheet(ivaResumen);
        const ws4 = window.XLSX.utils.json_to_sheet(correlatividad);

        window.XLSX.utils.book_append_sheet(wb, ws0, 'Contadora');
        window.XLSX.utils.book_append_sheet(wb, ws1, 'Facturas');
        window.XLSX.utils.book_append_sheet(wb, ws2, 'Detalles');
        window.XLSX.utils.book_append_sheet(wb, ws3, 'IVA_Resumen');
        window.XLSX.utils.book_append_sheet(wb, ws4, 'Correlatividad');

        window.XLSX.writeFile(wb, `${filenameBase}.xlsx`);
      } else {
        downloadCSV(contadora, `${filenameBase}_CONTADORA.csv`);
        downloadCSV(facturas, `${filenameBase}.csv`);
        downloadCSV(detalles, `${filenameBase}_DETALLES.csv`);
        downloadCSV(ivaResumen, `${filenameBase}_IVA.csv`);
        downloadCSV(correlatividad, `${filenameBase}_CORRELATIVIDAD.csv`);
      }
    } catch (e) {
      console.error('Error al exportar:', e);
      alert('No se pudo exportar. Revisá la consola para más detalles.');
    } finally {
      setExporting(false);
    }
  };

  const handleAnalizarCorrelatividad = async () => {
    setAnalizando(true);
    try {
      const ventasFull = await fetchAllVentasRango({ includeDetails: false, includeClient: false });
      const resumen = calcularCorrelatividad(ventasFull);
      const totalFaltantes = resumen.reduce((acc, r) => acc + (r.Faltantes ?? 0), 0);
      setAlertaCorrel(totalFaltantes > 0 ? { totalFaltantes, series: resumen.length, scope: 'full' } : { totalFaltantes: 0, series: resumen.length, scope: 'full' });
      if (totalFaltantes > 0) {
        alert(`Se detectaron ${totalFaltantes} faltantes en ${resumen.length} serie/s. Exportá el Excel para ver la hoja "Correlatividad".`);
      } else {
        alert('Sin faltantes detectados en el rango seleccionado.');
      }
    } catch (e) {
      console.error('Error en correlatividad:', e);
      alert('No se pudo analizar la correlatividad del rango.');
    } finally {
      setAnalizando(false);
    }
  };

  const ventasOrdenadas = useMemo(() => {
    return [...ventas].sort((a, b) => {
      const pa = parseNroFactura(a.numero_factura ?? a.numero ?? a.nro ?? '');
      const pb = parseNroFactura(b.numero_factura ?? b.numero ?? b.nro ?? '');
      const s = (pa.serie ?? '').localeCompare(pb.serie ?? '');
      if (s !== 0) return s;
      return (pa.nro ?? 0) - (pb.nro ?? 0);
    });
  }, [ventas]);

  const start = totalPages > 1 ? (page - 1) * pageSize + 1 : (ventas.length ? 1 : 0);
  const end = totalPages > 1 ? Math.min(page * pageSize, total) : ventas.length;

  /* ======================= UI ======================= */
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📊 Historial de Facturas</h1>
          <p className={styles.subtitle}>
            Consultá, exportá y verificá la correlatividad de tus comprobantes
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

          <div className={styles.inputGroup}>
            <label className={styles.label}>Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente, teléfono, dirección..."
              className={styles.input}
            />
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

          <button 
            onClick={handleExportar} 
            className={styles.successBtn}
            disabled={exporting || loading}
          >
            {exporting ? '⏳ Exportando...' : '📥 ' + (window.XLSX ? 'Exportar Excel' : 'Exportar CSV')}
          </button>

          <button 
            onClick={handleAnalizarCorrelatividad} 
            className={styles.secondaryBtn}
            disabled={analizando || loading}
          >
            {analizando ? '⏳ Analizando...' : '🔍 Analizar Correlatividad'}
          </button>
        </div>
      </div>

      {/* Alerta correlatividad */}
      {alertaCorrel && (
        <div className={styles.alertWarning}>
          <strong>⚠️ Atención:</strong> Se detectaron {alertaCorrel.totalFaltantes} faltantes{' '}
          (scope: {alertaCorrel.scope === 'full' ? 'rango completo' : 'página actual'}) en {alertaCorrel.series} serie/s.
          {alertaCorrel.scope === 'page' ? ' Podés analizar el rango completo con el botón "Analizar Correlatividad".' : ' Exportá el Excel para ver la hoja Correlatividad.'}
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.alertError}>{error}</div>}

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
      {ventasOrdenadas.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Método</th>
                  <th>Tipo</th>
                  <th>Cliente (RUC)</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasOrdenadas.map((venta) => {
                  const estado = (venta.estado ?? 'ACTIVO').toUpperCase();
                  const esAnulada = estado === 'ANULADO';
                  const nf = venta.numero_factura ?? venta.numero ?? venta.nro ?? '';
                  const tipoOp = venta.pedido ? venta.pedido.tipo : 'mostrador';
                  return (
                    <tr
                      key={venta.id}
                      className={esAnulada ? styles.rowAnulada : ''}
                      title={esAnulada ? 'ANULADA' : 'ACTIVA'}
                    >
                      <td>{venta.id}</td>
                      <td className={styles.colNumero}>{nf || '—'}</td>
                      <td>{formatearFechaLocal(venta.fecha)}</td>
                      <td className={styles.colMoney}>{formatearGs(venta.total)}</td>
                      <td>{venta.metodo_pago}</td>
                      <td>
                        <span className={styles[`badge${tipoOp.charAt(0).toUpperCase() + tipoOp.slice(1)}`]}>
                          {tipoOp}
                        </span>
                      </td>
                      <td>
                        {venta.cliente ? `${venta.cliente.nombre} (${venta.cliente.ruc})` : 'N/A'}
                      </td>
                      <td>
                        <span className={esAnulada ? styles.badgeAnulada : styles.badgeActiva}>
                          {esAnulada ? 'ANULADA' : 'ACTIVA'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() =>
                              window.open(`${API_BASE_URL}/api/factura/${venta.id}?autoprint=1`, '_blank')
                            }
                            className={styles.btnView}
                            title="Ver factura"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleAnularVenta(venta.id)}
                            className={esAnulada ? styles.btnDisabled : styles.btnAnular}
                            disabled={esAnulada}
                            title={esAnulada ? 'Ya anulada' : 'Anular factura'}
                          >
                            {esAnulada ? '✖️' : '🗑️'}
                          </button>
                        </div>
                      </td>
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
          <p>No hay ventas registradas en el rango de fechas seleccionado</p>
        </div>
      ) : null}

      
    </div>
  );
};

export default HistorialFacturas;