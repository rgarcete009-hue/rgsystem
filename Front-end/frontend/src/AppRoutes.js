import React, { useContext } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Ventas from './pages/Ventas';
import Clientes from './pages/Clientes';

import Productos from './pages/Productos';
import HistorialFacturas from './pages/HistorialFacturas';
import ArqueoCaja from './pages/ArqueoCaja';
import ComprasModule from './pages/Compras';

import ConfiguracionEmpresaPage from './pages/ConfiguracionEmpresaPage';
import ReporteVentasDiariasPage from './pages/ReporteVentasDiariasPage';
import ResumenVentas from './pages/ResumenVentas';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios'; // ✅ Solo una vez

import { AuthContext } from './pages/context/AuthContext'; // ✅ Ruta corregida

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated, user } = useContext(AuthContext); // ✅ Corregido
  const hideNavbarRoutes = ['/login'];

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && isAuthenticated && <Navbar />}
      <div style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {!isAuthenticated && (
            <Route path="/" element={<Navigate to="/login" />} />
          )}

          {isAuthenticated && (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/compras/*" element={<ComprasModule />} />
       

              <Route path="/clientes" element={<Clientes />} />
              
              <Route path="/productos" element={<Productos />} />
              <Route path="/historial-facturas" element={<HistorialFacturas />} />
              <Route path="/arqueo" element={<ArqueoCaja />} />
              <Route path="/configuracion-empresa" element={<ConfiguracionEmpresaPage />} />
              <Route path="/reporte-ventas-diarias" element={<ReporteVentasDiariasPage />} />
              <Route path="/resumen-ventas" element={<ResumenVentas />} />
              {user?.role === 'admin' && (
                <Route path="/usuarios" element={<Usuarios />} />
              )}
            </>
          )}

          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} />} />
        </Routes>
      </div>
    </>
  );
}

export default AppRoutes;