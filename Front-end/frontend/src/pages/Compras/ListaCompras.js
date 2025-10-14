import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const HistorialFacturas = () => {
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const formatearGs = (valor) => {
    return Number(valor).toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const fetchVentas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ventas`, {
        params: { desde, hasta, includeDetails: true, includeClient: true }
      });
      setVentas(response.data);
    } catch (err) {
      console.error("Error al cargar las ventas:", err);
      setError('Error al cargar las ventas. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleAnularVenta = async (ventaId) => {
    if (!window.confirm(`¿Estás seguro de que quieres anular la factura #${ventaId}? Esta acción devolverá el stock de los productos.`)) {
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/api/ventas/${ventaId}/anular`);
      setVentas(prevVentas =>
        prevVentas.map(venta =>
          venta.id === ventaId ? { ...venta, estado: 'anulado' } : venta
        )
      );
      alert(`Factura #${ventaId} anulada con éxito y stock devuelto.`);
    } catch (err) {
      console.error("Error al anular la venta:", err);
      const errorMessage = err.response && err.response.data && err.response.data.message
        ? err.response.data.message
        : 'Error al anular la factura. Por favor, intente de nuevo.';
      alert(errorMessage);
      setError(errorMessage);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Historial de Facturas</h1>
      <p style={styles.subtitle}>Consulta y gestiona todas las ventas registradas, incluyendo la anulación de facturas.</p>
      <div style={styles.filtersContainer}>
        <label style={styles.filterLabel}>
          Desde:&nbsp;
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            style={styles.filterInput}
          />
        </label>
        &nbsp;&nbsp;
        <label style={styles.filterLabel}>
          Hasta:&nbsp;
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            style={styles.filterInput}
          />
        </label>
        &nbsp;&nbsp;
        <button onClick={fetchVentas} style={styles.button}>
          Consultar
        </button>
      </div>

      {error && <p style={styles.errorMessage}>{error}</p>}

      {loading ? (
        <p>Cargando historial de facturas...</p>
      ) : ventas.length > 0 ? (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.tableCell}>ID</th>
                <th style={styles.tableCell}>Fecha</th>
                <th style={styles.tableCell}>Total</th>
                <th style={styles.tableCell}>Método de Pago</th>
                <th style={styles.tableCell}>Cliente (RUC)</th>
                <th style={styles.tableCell}>Estado</th>
                <th style={styles.tableCell}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id} style={venta.estado === 'anulado' ? styles.anuladoRow : {}}>
                  <td style={styles.tableCell}>{venta.id}</td>
                  <td style={styles.tableCell}>{new Date(venta.fecha).toLocaleString()}</td>
                  <td style={styles.tableCell}>{formatearGs(venta.total)}</td>
                  <td style={styles.tableCell}>{venta.metodo_pago}</td>
                  <td style={styles.tableCell}>{venta.cliente ? `${venta.cliente.nombre} (${venta.cliente.ruc})` : 'N/A'}</td>
                  <td style={styles.tableCell}>{venta.estado ? venta.estado.toUpperCase() : 'ACTIVO'}</td>
                  <td style={styles.tableCell}>
                    <button
                      onClick={() =>
                        window.open(
                          `${API_BASE_URL}/api/factura/${venta.id}`,
                          '_blank'
                        )
                      }
                      style={{ ...styles.actionButton, marginRight: '10px' }}
                    >
                      Ver Factura
                    </button>
                    <button
                      onClick={() => handleAnularVenta(venta.id)}
                      style={venta.estado === 'anulado' ? styles.disabledButton : styles.anularButton}
                      disabled={venta.estado === 'anulado'}
                    >
                      {venta.estado === 'anulado' ? 'Anulada' : 'Anular Factura'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No hay ventas registradas en el rango de fechas seleccionado.</p>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    backgroundColor: '#f9f9f9',
    minHeight: 'calc(100vh - 60px)',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '1rem',
    color: '#333',
  },
  subtitle: {
    fontSize: '1.1rem',
    marginBottom: '1.5rem',
    color: '#555',
  },
  filtersContainer: {
    marginBottom: '1.5rem',
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    fontSize: '1rem',
    color: '#333',
  },
  filterInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    padding: '8px 15px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#0056b3',
    },
  },
  errorMessage: {
    color: 'red',
    backgroundColor: '#ffe0e0',
    border: '1px solid #ffb3b3',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  tableWrapper: {
    overflowX: 'auto',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px',
  },
  tableHeader: {
    backgroundColor: '#e9ecef',
  },
  tableCell: {
    border: '1px solid #dee2e6',
    padding: '12px',
    textAlign: 'left',
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#218838',
    },
  },
  anularButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#c82333',
    },
  },
  disabledButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'not-allowed',
    fontSize: '0.9rem',
    opacity: 0.7,
  },
  anuladoRow: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    textDecoration: 'line-through',
    fontStyle: 'italic',
  }
};

export default HistorialFacturas;