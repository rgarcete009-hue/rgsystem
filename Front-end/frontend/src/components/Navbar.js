import React, { useContext, useState, useEffect } from 'react';
import { FaHome, FaCashRegister, FaUsers, FaHistory, FaChartBar, FaTruck, FaBoxOpen, FaCog, FaUserShield, FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../pages/context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsAuthenticated, user } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Theme
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Responsive: detectar ancho y mostrar botón hamburguesa
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  const toggleMenu = () => setMenuOpen(o => !o);
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // Activo si el path actual ES o COMIENZA con el link (para subrutas)
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getLinkStyle = (path) => ({
    ...styles.link,
    ...(isActive(path) ? styles.activeLink : {}),
  });

  const getInitials = (name) => (name ? name.slice(0, 2).toUpperCase() : 'US');

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <span style={styles.logo}>🍕</span>
        <span style={styles.title}>Bar Pizzería</span>
      </div>

      <div style={styles.userInfo}>
        <div style={styles.avatar}>{getInitials(user?.username)}</div>
        <span style={styles.greeting}>
          Hola, <strong>{user?.username || 'Usuario'}</strong>{user?.role ? ` (${user.role})` : ''}
        </span>
        <button onClick={toggleTheme} style={styles.themeButton} title="Cambiar tema">
          {theme === 'light' ? <FaMoon /> : <FaSun />}
        </button>
        {isMobile && (
          <button onClick={toggleMenu} style={styles.hamburger} aria-label="Abrir menú">☰</button>
        )}
      </div>

      <nav
        style={{
          ...styles.navbar,
          ...(isMobile ? (menuOpen ? styles.navOpen : styles.navClosed) : {}),
        }}
      >
        <Link style={getLinkStyle('/')} to="/"><FaHome /> Dashboard</Link>
        <Link style={getLinkStyle('/ventas')} to="/ventas"><FaCashRegister /> Ventas</Link>
       
        <Link style={getLinkStyle('/clientes')} to="/clientes"><FaUsers /> Clientes</Link>
        <Link style={getLinkStyle('/historial-facturas')} to="/historial-facturas"><FaHistory /> Historial</Link>
        <Link style={getLinkStyle('/arqueo')} to="/arqueo"><FaChartBar /> Arqueo</Link>
 
        <Link style={getLinkStyle('/reporte-ventas-diarias')} to="/reporte-ventas-diarias"><FaChartBar /> Reportes</Link>

        {/* ⬇️ Asegurate que la ruta y el link coincidan: /resumen-ventas */}
        <Link style={getLinkStyle('/resumen-ventas')} to="/resumen-ventas"><FaChartBar /> Resumen Ventas</Link>

        {user?.role === 'admin' && (
          <>
            <Link style={getLinkStyle('/productos')} to="/productos"><FaBoxOpen /> Productos</Link>
            <Link style={getLinkStyle('/configuracion-empresa')} to="/configuracion-empresa"><FaCog /> Configuración</Link>
            <Link style={getLinkStyle('/usuarios')} to="/usuarios"><FaUserShield /> Usuarios</Link>
           
          </>
        )}
        <button onClick={handleLogout} style={styles.logoutButton}><FaSignOutAlt /> Cerrar sesión</button>
      </nav>
    </header>
  );
};

const styles = {
  header: {
    background: 'var(--navbar-bg)',
    padding: '0.8rem 1rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 8px rgba(11, 20, 15, 0.2)',
    fontFamily: 'Segoe UI, sans-serif',
    position: 'relative',
    zIndex: 20,
  },
  brand: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontSize: '1.2rem', fontWeight: 'bold' },
  logo: { fontSize: '1.5rem' },
  title: { fontSize: '1.2rem' },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text)' },
  avatar: {
    backgroundColor: '#3498db', color: '#fff', borderRadius: '50%', width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem',
  },
  greeting: { fontSize: '0.95rem' },
  themeButton: { background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' },
  hamburger: { background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' },
  navbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
    transition: 'max-height 0.25s ease, opacity 0.2s ease',
  },
  navClosed: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    background: 'var(--navbar-bg)',
    padding: '0 1rem',
    maxHeight: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  navOpen: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: '100%',
    background: 'var(--navbar-bg)',
    padding: '1rem',
    maxHeight: 500,
    overflow: 'auto',
    opacity: 1,
    boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
  },
  link: {
    color: 'var(--text)',
    padding: '10px 14px',
    textDecoration: 'none',
    fontWeight: 'bold',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    whiteSpace: 'nowrap',
  },
  activeLink: { backgroundColor: '#2980b9', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' },
  logoutButton: {
    padding: '10px 14px', backgroundColor: '#e74c3c', color: '#fff', border: 'none',
    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.3s ease',
  },
};

export default Navbar;
