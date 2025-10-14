import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './services/api';
import { AuthContext } from './context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false); // 👁️ Mostrar/ocultar contraseña
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated, setUser } = useContext(AuthContext);

  // Opcional: definí tu logo aquí (archivo en /public)
  const logoSrc = '/logo.svg'; // Cambiá por '/logo192.png' o la ruta que prefieras

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsAuthenticated(true);
      setUser(res.data.user);
    } catch (err) {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Enter también envía (si el foco está en un input)
  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form} onKeyDown={onKeyDown}>

        {/* Logo (si no carga, se muestra un fallback emoji) */}
        <div style={styles.logoWrap}>
          <img
            src={logoSrc}
            onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
            alt="Logo"
            style={styles.logo}
          />
          <span style={styles.logoFallback} role="img" aria-label="logo">🍕</span>
        </div>

        <h1 style={styles.title}>Artes y Delicias</h1>
        <p style={styles.subtitle}>Iniciar sesión</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label} htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            inputMode="text"
            autoComplete="username"
            placeholder="Ingrese su usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="password">Contraseña</label>
          <div style={styles.inputPwdWrapper}>
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...styles.input, ...styles.inputPwd }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              style={styles.eyeBtn}
              aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        {/* Texto pequeño debajo del botón */}
        <p style={styles.brandText}>RG-SYSTEM BAR</p>
      </form>
    </div>
  );
}

const styles = {
  container: {
    background: 'linear-gradient(to right, #ffe5b4, #f8c291)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    padding: '1rem',
  },
  form: {
    backgroundColor: '#fff',
    padding: '2rem 2rem 1.25rem',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
    marginBottom: 4,
    position: 'relative',
  },
  logo: {
    height: 64,
    width: 64,
    objectFit: 'contain',
    display: 'block',
  },
  logoFallback: {
    position: 'absolute',
    fontSize: 40,
    opacity: 0.85,
  },
  title: {
    margin: 0,
    fontSize: '1.7rem',
    color: '#d35400',
    textAlign: 'center',
    letterSpacing: '0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#555',
    textAlign: 'center',
  },
  field: { display: 'flex', flexDirection: 'column', marginTop: 4 },
  label: { marginBottom: '0.35rem', fontWeight: 600, color: '#333', fontSize: '0.95rem' },
  input: {
    padding: '0.8rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color .2s ease, box-shadow .2s ease',
  },
  inputPwdWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputPwd: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    lineHeight: 1,
    opacity: 0.8,
  },
  button: {
    padding: '0.9rem',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.25s ease, transform .05s ease',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.8,
    cursor: 'not-allowed',
  },
  brandText: {
    fontSize: '0.72rem',
    color: '#aaa',
    textAlign: 'center',
    marginTop: '0.6rem',
    fontStyle: 'italic',
    letterSpacing: '1px',
    userSelect: 'none',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.55rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
};

export default Login;
