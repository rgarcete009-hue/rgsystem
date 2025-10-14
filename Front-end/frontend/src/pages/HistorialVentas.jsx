// Reemplazo completo: src/pages/HistorialVentas.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CSVLink } from 'react-csv';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? process.env.REACT_APP_API_URL_LAN
  : process.env.REACT_APP_API_URL_PUBLIC;

const DEFAULT_PAGE_SIZE = 20;

const HistorialVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cliente, setCliente] = useState('');
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');

  // paginación
  const [page, setPage] = useState(1);                // 1-based
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVentas = async () => {
    try {
      const params = {
        desde: desde || undefined,
        hasta: hasta || undefined,
        cliente_id: cliente || undefined,
        q: q || undefined,
        tipo: tipo || undefined,
        page,
        pageSize
      };
      const url = `${API_BASE_URL}/api/ventas`;
      const { data } = await axios.get(url, { params });

      // Soporta respuesta paginada u array "legacy"
      if (Array.isArray(data)) {
        setVentas(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setVentas(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error al cargar las ventas.');
    }
  };

  useEffect(() => { fetchVentas(); }, []); // carga inicial

  // cuando cambian filtros, resetear a página 1
  useEffect(() => { setPage(1); }, [desde, hasta, cliente, q, tipo, pageSize]);

  useEffect(() => { fetchVentas(); }, [page, pageSize, desde, hasta, cliente, q, tipo]);

  // CSV: exporta la página actual
  const csvData = ventas.map((venta) => ({
    id: venta.id,
    fecha: new Date(venta.fecha).toLocaleString(),
    cliente: venta.cliente ? venta.cliente.nombre : '',
    total: parseFloat(venta.total).toFixed(0),
    metodo_pago: venta.metodo_pago,
    tipo: venta.pedido ? venta.pedido.tipo : 'mostrador',
    repartidor: venta.pedido ? (venta.pedido.delivery_nombre || '') : ''
  }));
  const csvHeaders = [
    { label: 'ID', key: 'id' },
    { label: 'Fecha', key: 'fecha' },
    { label: 'Cliente', key: 'cliente' },
    { label: 'Total', key: 'total' },
    { label: 'Método de Pago', key: 'metodo_pago' },
    { label: 'Tipo', key: 'tipo' },
    { label: 'Repartidor/Contacto', key: 'repartidor' },
  ];

  const start = totalPages > 1 ? (page - 1) * pageSize + 1 : (ventas.length ? 1 : 0);
  const end   = totalPages > 1 ? Math.min(page * pageSize, total) : ventas.length;

  return (
    <div style={{ padding: 16 }}>
      <h2>Historial de Ventas / Reportes</h2>
      <p>Filtrá por fecha, cliente y buscá por teléfono, dirección, referencia o repartidor/contacto (si la venta proviene de un delivery).</p>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0' }}>
        <label>Desde:{' '}
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>Hasta:{' '}
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="ID o nombre del cliente" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (teléfono/dirección/referencia/repartidor)" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="mostrador">Mostrador</option>
          <option value="mesa">Mesa</option>
          <option value="delivery">Delivery</option>
        </select>
        <button style={styles.filterButton} onClick={() => { setPage(1); fetchVentas(); }}>Consultar</button>
      </div>

      {/* Paginación */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#555' }}>
          {totalPages > 1 ? `Mostrando ${start}-${end} de ${total}` : (ventas.length ? `Mostrando ${ventas.length} registros` : 'Sin resultados')}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <label>
            Tamaño página:{' '}
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button disabled={page <= 1} onClick={() => setPage(1)}>«</button>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
          <span>Página {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>

      {error && (<div style={{ color: '#b00020', marginBottom: 8 }}>{error}</div>)}

      {/* Tabla */}
      {ventas.length > 0 ? (
        <table style={styles.table}>
          <thead style={styles.tableHead}>
            <tr>
              <th style={styles.tableCell}>ID</th>
              <th style={styles.tableCell}>Fecha</th>
              <th style={styles.tableCell}>Cliente</th>
              <th style={styles.tableCell}>Total</th>
              <th style={styles.tableCell}>Método</th>
              <th style={styles.tableCell}>Tipo</th>
              <th style={styles.tableCell}>Repartidor/Contacto</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((venta) => (
              <tr key={venta.id}>
                <td style={styles.tableCell}>{venta.id}</td>
                <td style={styles.tableCell}>{new Date(venta.fecha).toLocaleString()}</td>
                <td style={styles.tableCell}>{venta.cliente ? venta.cliente.nombre : ''}</td>
                <td style={styles.tableCell}>Gs. {parseFloat(venta.total).toFixed(0)}</td>
                <td style={styles.tableCell}>{venta.metodo_pago}</td>
                <td style={styles.tableCell}>{venta.pedido ? venta.pedido.tipo : 'mostrador'}</td>
                <td style={styles.tableCell}>{venta.pedido ? (venta.pedido.delivery_nombre || '') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay ventas registradas.</p>
      )}

      {/* Export a CSV (página actual) */}
      <CSVLink
        filename={`historial_ventas_p${page}_size${pageSize}_${Date.now()}.csv`}
        data={csvData}
        headers={csvHeaders}
        separator=";"
        style={styles.exportButton}
      >
        Exportar CSV (página actual)
      </CSVLink>
    </div>
  );
};

const styles = {
  filterButton: { backgroundColor: '#007bff', color: '#fff', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  exportButton: { backgroundColor: '#28a745', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', marginTop: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem', marginBottom: '1rem' },
  tableHead: { backgroundColor: '#f4f4f4' },
  tableCell: { border: '1px solid #ddd', padding: '8px', textAlign: 'center' }
};

export default HistorialVentas;
