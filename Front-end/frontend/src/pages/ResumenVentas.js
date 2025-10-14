// src/pages/ResumenVentas.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './CSS/ResumenVentas.module.css';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? process.env.REACT_APP_API_URL_LAN
  : process.env.REACT_APP_API_URL_PUBLIC;

const ResumenVentas = () => {
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

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const hoy = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    // por defecto: hoy
    setDesde(hoy);
    setHasta(hoy);
  }, [hoy]);

  const consultar = async () => {
    if (!desde || !hasta) { 
      setErr('Elegí un rango de fechas.'); 
      return; 
    }
    setLoading(true);
    setErr('');
    try {
      const url = `${API_BASE_URL}/api/ventas/resumen`;
      const { data } = await axios.get(url, { params: { desde, hasta } });
      setData(data);
    } catch (e) {
      console.error(e);
      setErr('Error al consultar el resumen. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatGs = (n) => Number(n || 0).toLocaleString('es-PY');

  const renderKVList = (obj) => {
    const entries = Object.entries(obj || {});
    if (!entries.length) {
      return (
        <div className={styles.emptyData}>
          <span>📊</span>
          <p>Sin datos disponibles</p>
        </div>
      );
    }
    return (
      <ul className={styles.kvList}>
        {entries.map(([k, v]) => (
          <li key={k} className={styles.kvItem}>
            <span className={styles.kvLabel}>{k}</span>
            <strong className={styles.kvValue}>Gs. {formatGs(v)}</strong>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📊 Resumen de Ventas</h1>
          <p className={styles.subtitle}>
            Obtené totales por rango de fechas, desglosados por método de pago y tipo de operación
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
              onChange={e => setDesde(e.target.value)} 
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Hasta</label>
            <input 
              type="date" 
              value={hasta} 
              onChange={e => setHasta(e.target.value)} 
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actionsRow}>
          <button 
            onClick={consultar} 
            className={styles.primaryBtn}
            disabled={loading}
          >
            {loading ? '⏳ Consultando...' : '🔍 Consultar'}
          </button>
        </div>
      </div>

      {/* Error */}
      {err && <div className={styles.alertError}>{err}</div>}

      {/* Contenido */}
      {!data ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📈</div>
          <h3>Listo para analizar</h3>
          <p>Elegí un rango de fechas y presioná "Consultar" para ver el resumen</p>
        </div>
      ) : (
        <>
          {/* Card Principal - Totales Destacados */}
          <div className={styles.heroCard}>
            <div className={styles.heroHeader}>
              <div className={styles.heroIcon}>💰</div>
              <div>
                <h2 className={styles.heroTitle}>Total General</h2>
                <p className={styles.heroSubtitle}>
                  {data.rango.desde} → {data.rango.hasta}
                </p>
              </div>
            </div>
            
            <div className={styles.heroStats}>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatValue}>
                  Gs. {formatGs(data.total_general)}
                </div>
                <div className={styles.heroStatLabel}>Ingresos Totales</div>
              </div>
              
              <div className={styles.heroStatDivider}></div>
              
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatValue}>
                  {data.cantidad_ventas}
                </div>
                <div className={styles.heroStatLabel}>Ventas Realizadas</div>
              </div>
              
              <div className={styles.heroStatDivider}></div>
              
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatValue}>
                  Gs. {formatGs(data.ticket_promedio)}
                </div>
                <div className={styles.heroStatLabel}>Ticket Promedio</div>
              </div>
            </div>
          </div>

          {/* Grid de Cards - Desglose */}
          <div className={styles.cardsGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>💳</div>
                <h3 className={styles.cardTitle}>Por Método de Pago</h3>
              </div>
              <div className={styles.cardBody}>
                {renderKVList(data.por_metodo)}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>🏪</div>
                <h3 className={styles.cardTitle}>Por Tipo de Operación</h3>
              </div>
              <div className={styles.cardBody}>
                {renderKVList(data.por_tipo)}
              </div>
            </div>
          </div>

          {/* Métricas Adicionales */}
          <div className={styles.metricsCard}>
            <h3 className={styles.metricsTitle}>📈 Métricas del Período</h3>
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>📅</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricLabel}>Período</div>
                  <div className={styles.metricValue}>
                    {new Date(data.rango.desde).toLocaleDateString('es-PY')} - {new Date(data.rango.hasta).toLocaleDateString('es-PY')}
                  </div>
                </div>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>🎯</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricLabel}>Ventas por Día</div>
                  <div className={styles.metricValue}>
                    {(() => {
                      const days = Math.ceil((new Date(data.rango.hasta) - new Date(data.rango.desde)) / (1000 * 60 * 60 * 24)) + 1;
                      return (data.cantidad_ventas / days).toFixed(1);
                    })()}
                  </div>
                </div>
              </div>

              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>💵</div>
                <div className={styles.metricContent}>
                  <div className={styles.metricLabel}>Ingresos por Día</div>
                  <div className={styles.metricValue}>
                    Gs. {formatGs((() => {
                      const days = Math.ceil((new Date(data.rango.hasta) - new Date(data.rango.desde)) / (1000 * 60 * 60 * 24)) + 1;
                      return Math.round(data.total_general / days);
                    })())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Botón de cambio de tema */}
      
    </div>
  );
};

export default ResumenVentas;