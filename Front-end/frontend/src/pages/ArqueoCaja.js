// src/pages/ArqueoCaja.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './CSS/Arqueo.module.css';

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const ArqueoCaja = () => {
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

    const [fechaArqueo, setFechaArqueo] = useState('');
    const [arqueoData, setArqueoData] = useState(null);
    const [cajaResumen, setCajaResumen] = useState(null);
    const [cierresRegistrados, setCierresRegistrados] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('success');
    const [loading, setLoading] = useState(false);
    const [loadingCierres, setLoadingCierres] = useState(false);

    const formatearGs = (valor) => {
        const numero = Number(valor || 0);
        return numero.toLocaleString('es-PY', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).replace(/,/g, '');
    };

    useEffect(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setFechaArqueo(`${yyyy}-${mm}-${dd}`);
    }, []);

    useEffect(() => {
        if (fechaArqueo) {
            handleGenerarArqueo();
        }
    }, [fechaArqueo]);

    useEffect(() => {
        fetchCierresRegistrados();
    }, []);

    useEffect(() => {
        if (mensaje) {
            const timer = setTimeout(() => {
                setMensaje('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [mensaje]);

    const handleGenerarArqueo = async () => {
        setLoading(true);
        setMensaje('');
        setArqueoData(null);
        setCajaResumen(null);

        try {
            const arqueoResponse = await axios.get(`${API_BASE_URL}/api/ventas/cierres/arqueo?fecha=${fechaArqueo}`);
            setArqueoData(arqueoResponse.data);

            const cajaResponse = await axios.get(`${API_BASE_URL}/api/caja/resumen-diario?fecha=${fechaArqueo}`);
            setCajaResumen(cajaResponse.data);

            setMensaje('✅ Arqueo y resumen de caja generados exitosamente.');
            setTipoMensaje('success');
        } catch (error) {
            console.error('Error al generar arqueo o resumen de caja:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
            setMensaje(`❌ Error al cargar datos: ${errorMsg}`);
            setTipoMensaje('error');
            setArqueoData(null);
            setCajaResumen(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRegistrarCierreGlobal = async () => {
        if (!arqueoData || arqueoData.ventas_sin_identificacion_cliente.length === 0) {
            setMensaje('⚠️ No hay ventas sin identificación de cliente para registrar el cierre global.');
            setTipoMensaje('warning');
            return;
        }

        if (!window.confirm('¿Está seguro de que desea registrar el cierre global para esta fecha? Esta acción no se puede deshacer y generará el registro oficial de ventas diarias.')) {
            return;
        }

        setLoading(true);
        setMensaje('');
        try {
            const ventasIds = arqueoData.ventas_sin_identificacion_cliente.map(venta => venta.id);

            const cierreData = {
                fecha_cierre: fechaArqueo,
                total_efectivo: arqueoData.totales_por_metodo.efectivo,
                total_tarjeta: arqueoData.totales_por_metodo.tarjeta,
                total_transferencia: arqueoData.totales_por_metodo.transferencia,
                ventas_ids_incluidas: ventasIds,
            };

            const response = await axios.post(`${API_BASE_URL}/api/ventas/cierres/registrar`, cierreData);
            setMensaje(`✅ Cierre global registrado. ID: ${response.data.cierreGlobalId}.`);
            setTipoMensaje('success');
            setArqueoData(null);
            setCajaResumen(null);
            handleGenerarArqueo();
            fetchCierresRegistrados();
        } catch (error) {
            console.error('Error al registrar cierre global:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
            setMensaje(`❌ Error al registrar cierre global: ${errorMsg}`);
            setTipoMensaje('error');
        } finally {
            setLoading(false);
        }
    };

    const fetchCierresRegistrados = async () => {
        setLoadingCierres(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/ventas/cierres?includeDetails=true`);
            setCierresRegistrados(response.data);
        } catch (error) {
            console.error('Error al obtener cierres globales:', error);
            setMensaje(`❌ Error al cargar el historial de cierres: ${error.response?.data?.error || error.message}`);
            setTipoMensaje('error');
            setCierresRegistrados([]);
        } finally {
            setLoadingCierres(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Mensaje global */}
            {mensaje && (
                <div className={`${styles.alert} ${styles[`alert${tipoMensaje.charAt(0).toUpperCase() + tipoMensaje.slice(1)}`]}`}>
                    {mensaje}
                </div>
            )}

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>💰 Arqueo y Cierre Global Diario</h1>
                    <p className={styles.subtitle}>
                        Gestiona los cierres de caja y movimientos diarios
                    </p>
                </div>
            </div>

            {/* Selector de Fecha */}
            <div className={styles.dateCard}>
                <div className={styles.dateGroup}>
                    <label className={styles.label}>📅 Fecha del Arqueo</label>
                    <input
                        type="date"
                        value={fechaArqueo}
                        onChange={(e) => setFechaArqueo(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>
                <button 
                    onClick={handleGenerarArqueo} 
                    className={styles.primaryBtn} 
                    disabled={loading}
                >
                    {loading ? '⏳ Generando...' : '🔄 Generar Arqueo y Resumen'}
                </button>
            </div>

            {/* Resumen del Arqueo de Ventas */}
            {arqueoData && (
                <div className={styles.arqueoCard}>
                    <h2 className={styles.cardTitle}>
                        📊 Resumen del Arqueo de Ventas - {fechaArqueo}
                    </h2>
                    <p className={styles.cardSubtitle}>
                        Ventas "Consumidor Final" no cerradas
                    </p>

                    <div className={styles.totalHero}>
                        <div className={styles.totalLabel}>Total Ventas sin Identificación</div>
                        <div className={styles.totalValue}>Gs. {formatearGs(arqueoData.total_general)}</div>
                    </div>

                    <div className={styles.metodosGrid}>
                        <div className={styles.metodoCard}>
                            <div className={styles.metodoIcon}>💵</div>
                            <div className={styles.metodoContent}>
                                <div className={styles.metodoLabel}>Efectivo</div>
                                <div className={styles.metodoValue}>Gs. {formatearGs(arqueoData.totales_por_metodo.efectivo)}</div>
                            </div>
                        </div>

                        <div className={styles.metodoCard}>
                            <div className={styles.metodoIcon}>💳</div>
                            <div className={styles.metodoContent}>
                                <div className={styles.metodoLabel}>Tarjeta</div>
                                <div className={styles.metodoValue}>Gs. {formatearGs(arqueoData.totales_por_metodo.tarjeta)}</div>
                            </div>
                        </div>

                        <div className={styles.metodoCard}>
                            <div className={styles.metodoIcon}>🏦</div>
                            <div className={styles.metodoContent}>
                                <div className={styles.metodoLabel}>Transferencia</div>
                                <div className={styles.metodoValue}>Gs. {formatearGs(arqueoData.totales_por_metodo.transferencia)}</div>
                            </div>
                        </div>
                    </div>

                    <h3 className={styles.sectionTitle}>📋 Ventas Incluidas en el Arqueo</h3>
                    {arqueoData.ventas_sin_identificacion_cliente.length > 0 ? (
                        <>
                            <div className={styles.tableCard}>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>ID Venta</th>
                                                <th>Factura No.</th>
                                                <th>Total</th>
                                                <th>Método Pago</th>
                                                <th>Fecha/Hora</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {arqueoData.ventas_sin_identificacion_cliente.map(venta => (
                                                <tr key={venta.id}>
                                                    <td>{venta.id}</td>
                                                    <td className={styles.colFactura}>{venta.numero_factura || 'N/A'}</td>
                                                    <td className={styles.colMoney}>Gs. {formatearGs(venta.total)}</td>
                                                    <td>
                                                        <span className={styles[`badge${venta.metodo_pago.charAt(0).toUpperCase() + venta.metodo_pago.slice(1)}`]}>
                                                            {venta.metodo_pago}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(venta.fecha).toLocaleString('es-PY')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={styles.actionRow}>
                                <button 
                                    onClick={handleRegistrarCierreGlobal} 
                                    className={styles.closeBtn} 
                                    disabled={loading}
                                >
                                    {loading ? '⏳ Registrando...' : '🔒 Registrar Cierre Global'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📭</div>
                            <p>No hay ventas sin identificación de cliente pendientes para esta fecha</p>
                        </div>
                    )}
                </div>
            )}

            {/* Movimientos de Caja */}
            {cajaResumen && (
                <div className={styles.cajaCard}>
                    <h2 className={styles.cardTitle}>
                        🏦 Movimientos de Caja del Día - {cajaResumen.fecha}
                    </h2>

                    <div className={styles.cajaResumenGrid}>
                        <div className={styles.cajaResumenItem}>
                            <div className={styles.cajaResumenIcon}>📈</div>
                            <div className={styles.cajaResumenContent}>
                                <div className={styles.cajaResumenLabel}>Total Ingresos</div>
                                <div className={styles.cajaResumenValue}>Gs. {formatearGs(cajaResumen.total_ingresos)}</div>
                            </div>
                        </div>

                        <div className={styles.cajaResumenItem}>
                            <div className={styles.cajaResumenIcon}>📉</div>
                            <div className={styles.cajaResumenContent}>
                                <div className={styles.cajaResumenLabel}>Total Egresos</div>
                                <div className={styles.cajaResumenValue}>Gs. {formatearGs(cajaResumen.total_egresos)}</div>
                            </div>
                        </div>

                        <div className={`${styles.cajaResumenItem} ${styles.saldoNeto}`}>
                            <div className={styles.cajaResumenIcon}>💰</div>
                            <div className={styles.cajaResumenContent}>
                                <div className={styles.cajaResumenLabel}>Saldo Neto</div>
                                <div className={styles.cajaResumenValue}>Gs. {formatearGs(cajaResumen.saldo_neto)}</div>
                            </div>
                        </div>
                    </div>

                    <h3 className={styles.sectionTitle}>📝 Detalle de Movimientos</h3>
                    {cajaResumen.movimientos_detallados && cajaResumen.movimientos_detallados.length > 0 ? (
                        <div className={styles.tableCard}>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Fecha/Hora</th>
                                            <th>Tipo</th>
                                            <th>Monto</th>
                                            <th>Descripción</th>
                                            <th>Venta ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cajaResumen.movimientos_detallados.map((mov) => (
                                            <tr key={mov.id}>
                                                <td>{new Date(mov.fecha).toLocaleString('es-PY')}</td>
                                                <td>
                                                    <span className={mov.tipo === 'ingreso' ? styles.badgeIngreso : styles.badgeEgreso}>
                                                        {mov.tipo === 'ingreso' ? '📈 Ingreso' : '📉 Egreso'}
                                                    </span>
                                                </td>
                                                <td className={styles.colMoney}>Gs. {formatearGs(mov.monto)}</td>
                                                <td>{mov.descripcion}</td>
                                                <td>{mov.venta_id || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📭</div>
                            <p>No hay movimientos de caja para la fecha seleccionada</p>
                        </div>
                    )}
                </div>
            )}

            {/* Historial de Cierres */}
            <div className={styles.historialCard}>
                <h2 className={styles.cardTitle}>📚 Historial de Cierres Globales</h2>
                
                {loadingCierres ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner}></div>
                        <p>Cargando historial de cierres...</p>
                    </div>
                ) : cierresRegistrados.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📋</div>
                        <p>No se encontraron cierres globales registrados</p>
                    </div>
                ) : (
                    <div className={styles.tableCard}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Fecha</th>
                                        <th>Total</th>
                                        <th>Efectivo</th>
                                        <th>Tarjeta</th>
                                        <th>Transferencia</th>
                                        <th>Ventas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cierresRegistrados.map(cierre => (
                                        <tr key={cierre.id}>
                                            <td>{cierre.id}</td>
                                            <td>{new Date(cierre.fecha_cierre).toLocaleDateString('es-PY')}</td>
                                            <td className={styles.colMoney}>Gs. {formatearGs(cierre.total_cierre)}</td>
                                            <td className={styles.colMoney}>Gs. {formatearGs(cierre.total_efectivo)}</td>
                                            <td className={styles.colMoney}>Gs. {formatearGs(cierre.total_tarjeta)}</td>
                                            <td className={styles.colMoney}>Gs. {formatearGs(cierre.total_transferencia)}</td>
                                            <td>
                                                {cierre.detallesDeCierreGlobal && cierre.detallesDeCierreGlobal.length > 0 ? (
                                                    <span className={styles.badgeVentas}>
                                                        {cierre.detallesDeCierreGlobal.length} ventas
                                                    </span>
                                                ) : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Botón de cambio de tema */}
            <button 
                className={styles.themeToggle}
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
                <span>{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>
        </div>
    );
};

export default ArqueoCaja;