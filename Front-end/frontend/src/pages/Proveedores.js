// src/pages/Proveedores.js

import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import './Proveedores/Proveedores.css'; // Asegúrate de tener estilos específicos para proveedores

// Importa los componentes de proveedores
import ListaProveedores from './Proveedores/ListaProveedores';
import FormularioProveedor from './Proveedores/FormularioProveedor';
import DetalleProveedor from './Proveedores/DetalleProveedor';

const Proveedores = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Routes>
        {/* Ruta raíz para /proveedores - mostrará la lista de proveedores */}
        <Route index element={<ListaProveedores />} /> 
        
        {/* Ruta para crear un nuevo proveedor: /proveedores/nuevo */}
        <Route path="nuevo" element={<FormularioProveedor />} />
        
        {/* Ruta para ver los detalles de un proveedor específico: /proveedores/:id */}
        <Route path=":id" element={<DetalleProveedor />} />
        
        {/* Puedes añadir más rutas aquí si necesitas para edición, etc. */}
      </Routes>
      <Outlet />
    </div>
  );
};

export default Proveedores;