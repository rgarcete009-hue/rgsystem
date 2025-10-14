import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const Dashboard = () => {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventasDelDia, setVentasDelDia] = useState(0);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [totalProductos, setTotalProductos] = useState(0);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [errorVentas, setErrorVentas] = useState(null);
  const [errorProductos, setErrorProductos] = useState(null);

  useEffect(() => {
    fetchVentas();
    fetchProductos();
  }, []);

  const formatearGs = (valor) =>
    Number(valor).toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const fetchVentas = async () => {
    setLoadingVentas(true);
    setErrorVentas(null);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/ventas`);
      setVentas(data);
      const hoy = new Date();
      const ventasHoy = data.filter((v) => {
        const f = new Date(v.fecha);
        return (
          f.getFullYear() === hoy.getFullYear() &&
          f.getMonth() === hoy.getMonth() &&
          f.getDate() === hoy.getDate()
        );
      });
      const totalHoy = ventasHoy.reduce((sum, v) => sum + parseFloat(v.total), 0);
      setVentasDelDia(totalHoy);
    } catch (err) {
      console.error(err);
      setErrorVentas('No se pudieron cargar las ventas.');
    } finally {
      setLoadingVentas(false);
    }
  };

  const fetchProductos = async () => {
    setLoadingProductos(true);
    setErrorProductos(null);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/productos`);
      setProductos(data);
      setTotalProductos(data.length);

      const bajoStock = data.filter(
        (p) => !isNaN(p.stock) && !isNaN(p.stock_minimo) && p.stock < p.stock_minimo
      );
      setStockBajoCount(bajoStock.length);
    } catch (err) {
      console.error(err);
      setErrorProductos('No se pudieron cargar los productos.');
    } finally {
      setLoadingProductos(false);
    }
  };

  const aggregateTodaySales = () => {
    const hoy = new Date();
    const ventasHoy = ventas.filter((v) => {
      const f = new Date(v.fecha);
      return (
        f.getFullYear() === hoy.getFullYear() &&
        f.getMonth() === hoy.getMonth() &&
        f.getDate() === hoy.getDate()
      );
    });
    return ventasHoy.reduce((acc, v) => {
      acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + parseFloat(v.total);
      return acc;
    }, {});
  };

  const summary = aggregateTodaySales();
  const totalSummary = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      {/* Header con gradiente */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🍕 Artes y Delicias</h1>
          <p style={styles.subtitle}>Sistema de Facturación y Gestión</p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Tarjetas de estadísticas principales */}
        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, ...styles.statCardPrimary}}>
            <div style={styles.statIcon}>💸</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Ventas del Día</p>
              {loadingVentas ? (
                <div style={styles.skeleton}></div>
              ) : errorVentas ? (
                <p style={styles.errorText}>{errorVentas}</p>
              ) : (
                <p style={styles.statValue}>{formatearGs(ventasDelDia)}</p>
              )}
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardWarning}}>
            <div style={styles.statIcon}>🚨</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Stock Bajo</p>
              {loadingProductos ? (
                <div style={styles.skeleton}></div>
              ) : errorProductos ? (
                <p style={styles.errorText}>{errorProductos}</p>
              ) : (
                <>
                  <p style={styles.statValue}>{stockBajoCount}</p>
                  {stockBajoCount > 0 && (
                    <Link to="/productos?filter=bajo-stock" style={styles.alertLink}>
                      Ver productos →
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardSuccess}}>
            <div style={styles.statIcon}>📦</div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Inventario Total</p>
              {loadingProductos ? (
                <div style={styles.skeleton}></div>
              ) : errorProductos ? (
                <p style={styles.errorText}>{errorProductos}</p>
              ) : (
                <p style={styles.statValue}>{totalProductos}</p>
              )}
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Accesos Rápidos</h2>
          <div style={styles.quickAccessGrid}>
            {[
              { icon: '🛒', title: 'Nueva Venta', link: '/ventas', desc: 'Registrar venta', color: '#27AE60' },
              { icon: '👥', title: 'Clientes', link: '/clientes', desc: 'Administrar clientes', color: '#3498DB' },
              { icon: '📜', title: 'Facturas', link: '/historial-facturas', desc: 'Ver historial', color: '#9B59B6' },
            ].map((item, i) => (
              <Link key={i} to={item.link} style={styles.quickCard}>
                <div style={{...styles.quickIcon, backgroundColor: item.color + '15'}}>
                  <span style={{fontSize: '2rem'}}>{item.icon}</span>
                </div>
                <h3 style={styles.quickTitle}>{item.title}</h3>
                <p style={styles.quickDesc}>{item.desc}</p>
                <div style={styles.quickArrow}>→</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Resumen de recaudación */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💰 Recaudación por Método de Pago</h2>
          <div style={styles.summaryCard}>
            {loadingVentas ? (
              <div style={styles.skeleton}></div>
            ) : errorVentas ? (
              <p style={styles.errorText}>{errorVentas}</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Método de Pago</th>
                      <th style={styles.tableHeader}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary).map(([m, t], idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>{m}</td>
                        <td style={{...styles.tableCell, fontWeight: '600'}}>{formatearGs(t)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={styles.tableFooter}>
                      <td style={{...styles.tableCell, fontWeight: 'bold'}}>Total del Día</td>
                      <td style={{...styles.tableCell, fontWeight: 'bold', color: '#E67E22'}}>
                        {formatearGs(totalSummary)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
  },
  header: {
    background: 'linear-gradient(135deg, #E67E22 0%, #D35400 100%)',
    padding: '2rem 1.5rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#FFF',
    margin: '0 0 0.5rem 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#FFF',
    opacity: 0.95,
    margin: 0,
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    transition: 'all 0.3s ease',
    cursor: 'default',
    borderLeft: '4px solid',
  },
  statCardPrimary: {
    borderLeftColor: '#E67E22',
  },
  statCardWarning: {
    borderLeftColor: '#E74C3C',
  },
  statCardSuccess: {
    borderLeftColor: '#27AE60',
  },
  statIcon: {
    fontSize: '3rem',
    lineHeight: 1,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6C757D',
    margin: '0 0 0.5rem 0',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#212529',
    margin: 0,
  },
  alertLink: {
    display: 'inline-block',
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#E74C3C',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: '1rem',
  },
  quickAccessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  quickCard: {
    backgroundColor: '#FFF',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  quickIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  quickTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#212529',
    margin: '0 0 0.5rem 0',
  },
  quickDesc: {
    fontSize: '0.875rem',
    color: '#6C757D',
    margin: 0,
    flex: 1,
  },
  quickArrow: {
    position: 'absolute',
    bottom: '1rem',
    right: '1rem',
    fontSize: '1.5rem',
    color: '#CED4DA',
    transition: 'all 0.3s ease',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #E9ECEF',
  },
  tableRow: {
    borderBottom: '1px solid #F1F3F5',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '1rem',
    fontSize: '0.9375rem',
    color: '#212529',
  },
  tableFooter: {
    backgroundColor: '#FDF6EC',
    borderTop: '2px solid #E9ECEF',
  },
  skeleton: {
    height: '28px',
    backgroundColor: '#E9ECEF',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: '0.875rem',
    margin: 0,
  },
};

// Agregar animación de hover en JavaScript (si es necesario)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
}

export default Dashboard;