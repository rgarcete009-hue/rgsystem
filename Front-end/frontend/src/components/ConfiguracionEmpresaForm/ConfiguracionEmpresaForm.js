import React, { useEffect, useMemo, useState } from 'react';
import '././.././ConfiguracionEmpresaForm/ConfiguracionEmpresaForm.css';

// URL base según entorno (igual que el original)
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const ConfiguracionEmpresaForm = () => {
  // ====== Estado del formulario ======
  const [config, setConfig] = useState({
    nombreEmpresa: '',
    actividadPrincipal: '',
    otrasActividades: '',
    direccion: '',
    localidad: '',
    ruc: '',
    telefono: '',
    timbradoNo: '',
    timbradoValidoDesde: '',
    timbradoValidoHasta: '',
    prefijoFactura: '',
    ultimoCorrelativoFactura: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // ====== Tema: 'light' | 'dark' | 'system' ======
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  // Resuelve el tema efectivo cuando está en "system"
  const effectiveTheme = useMemo(() => {
    if (theme !== 'system') return theme;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = effectiveTheme;

    // Si está en "system", escucha cambios del SO
    let mm;
    if (theme === 'system' && window.matchMedia) {
      mm = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        root.dataset.theme = mm.matches ? 'dark' : 'light';
      };
      mm.addEventListener?.('change', handler);
      return () => mm.removeEventListener?.('change', handler);
    }
  }, [effectiveTheme, theme]);

  const changeTheme = (next) => {
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  // ====== Cargar configuración ======
  useEffect(() => {
    const fetchConfiguracion = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/configuracion`);
        if (!response.ok) {
          if (response.status === 404) {
            setMessage('No hay configuración de empresa. Por favor, ingrese los datos.');
            setConfig({
              nombreEmpresa: '',
              actividadPrincipal: '',
              otrasActividades: '',
              direccion: '',
              localidad: '',
              ruc: '',
              telefono: '',
              timbradoNo: '',
              timbradoValidoDesde: '',
              timbradoValidoHasta: '',
              prefijoFactura: '',
              ultimoCorrelativoFactura: 0,
            });
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        data.timbradoValidoDesde = data.timbradoValidoDesde ? data.timbradoValidoDesde.split('T')[0] : '';
        data.timbradoValidoHasta = data.timbradoValidoHasta ? data.timbradoValidoHasta.split('T')[0] : '';

        setConfig(data);
        setMessage('Configuración cargada exitosamente.');
      } catch (err) {
        setError(err.message || 'Error desconocido al cargar la configuración.');
        setMessage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfiguracion();
  }, []);

  // ====== Handlers ======
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/configuracion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      data.timbradoValidoDesde = data.timbradoValidoDesde ? data.timbradoValidoDesde.split('T')[0] : '';
      data.timbradoValidoHasta = data.timbradoValidoHasta ? data.timbradoValidoHasta.split('T')[0] : '';

      setConfig(data);
      setMessage('Configuración guardada exitosamente.');
    } catch (err) {
      setError(err.message || 'Error desconocido al guardar la configuración.');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // ====== UI ======
  if (loading && !config?.nombreEmpresa && !message) {
    return <div className="loading">Cargando configuración…</div>;
  }

  return (
    <div className="config-shell">
      <div className="config-card" role="region" aria-labelledby="config-title">
        {/* Header */}
        <header className="config-header">
          <div>
            <h1 id="config-title" className="config-title">Configuración de la Empresa</h1>
            <p className="config-subtitle">Ajustes fiscales, timbrado y numeración de facturas</p>
          </div>

          <div className="theme-switch" role="group" aria-label="Selector de tema">
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => changeTheme('light')}
              title="Modo claro"
            >☀️ Claro</button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => changeTheme('dark')}
              title="Modo oscuro"
            >🌙 Oscuro</button>
            <button
              type="button"
              aria-pressed={theme === 'system'}
              onClick={() => changeTheme('system')}
              title="Seguir tema del sistema"
            >💻 Sistema</button>
          </div>
        </header>

        {/* Mensajes */}
        {error && (
          <div className="alert error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        {message && !error && (
          <div className="alert success" role="status" aria-live="polite">
            {message}
          </div>
        )}

        {/* Body / Form */}
        <div className="config-body">
          <form onSubmit={handleSubmit} noValidate>
            {/* Sección: Datos de la empresa */}
            <fieldset className="section">
              <legend className="section-title">Datos de la empresa</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="nombreEmpresa">Nombre de la Empresa</label>
                  <input
                    type="text"
                    id="nombreEmpresa"
                    name="nombreEmpresa"
                    value={config.nombreEmpresa}
                    onChange={handleChange}
                    autoComplete="organization"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ruc">R.U.C.</label>
                  <input
                    type="text"
                    id="ruc"
                    name="ruc"
                    value={config.ruc}
                    onChange={handleChange}
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="direccion">Dirección</label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    value={config.direccion}
                    onChange={handleChange}
                    autoComplete="street-address"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="localidad">Localidad</label>
                  <input
                    type="text"
                    id="localidad"
                    name="localidad"
                    value={config.localidad}
                    onChange={handleChange}
                    autoComplete="address-level2"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={config.telefono}
                    onChange={handleChange}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+595 ..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="actividadPrincipal">Actividad Principal</label>
                  <input
                    type="text"
                    id="actividadPrincipal"
                    name="actividadPrincipal"
                    value={config.actividadPrincipal}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="otrasActividades">Otras Actividades (una por línea)</label>
                  <textarea
                    id="otrasActividades"
                    name="otrasActividades"
                    value={config.otrasActividades}
                    onChange={handleChange}
                    rows={4}
                  />
                  <div className="form-hint">Ej.: “Delivery”, “Mostrador”, etc.</div>
                </div>
              </div>
            </fieldset>

            {/* Sección: Timbrado */}
            <fieldset className="section" style={{ marginTop: 16 }}>
              <legend className="section-title">Timbrado</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="timbradoNo">Número de Timbrado</label>
                  <input
                    type="text"
                    id="timbradoNo"
                    name="timbradoNo"
                    value={config.timbradoNo}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="timbradoValidoDesde">Válido desde</label>
                  <input
                    type="date"
                    id="timbradoValidoDesde"
                    name="timbradoValidoDesde"
                    value={config.timbradoValidoDesde}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="timbradoValidoHasta">Válido hasta</label>
                  <input
                    type="date"
                    id="timbradoValidoHasta"
                    name="timbradoValidoHasta"
                    value={config.timbradoValidoHasta}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </fieldset>

            {/* Sección: Facturación */}
            <fieldset className="section" style={{ marginTop: 16 }}>
              <legend className="section-title">Facturación</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="prefijoFactura">Prefijo Factura (ej. 001-001)</label>
                  <input
                    type="text"
                    id="prefijoFactura"
                    name="prefijoFactura"
                    value={config.prefijoFactura}
                    onChange={handleChange}
                    inputMode="numeric"
                    pattern="^\d{3}-\d{3}$"
                    required
                  />
                  <div className="form-hint">Formato: Sucursal-Punto (3 dígitos)-(3 dígitos)</div>
                </div>

                <div className="form-group">
                  <label htmlFor="ultimoCorrelativoFactura">Último correlativo</label>
                  <input
                    type="number"
                    id="ultimoCorrelativoFactura"
                    name="ultimoCorrelativoFactura"
                    value={config.ultimoCorrelativoFactura}
                    onChange={handleChange}
                    required
                    min={0}
                  />
                </div>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar configuración'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                Volver arriba
              </button>
              
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionEmpresaForm;