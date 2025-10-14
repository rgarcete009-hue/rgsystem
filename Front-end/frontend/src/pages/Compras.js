// src/pages/Compras.js

import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';

// Importa los nuevos componentes que moviste
import ListaCompras from './Compras/ListaCompras';
import FormularioCompra from './Compras/FormularioCompra';
import DetalleCompra from './Compras/DetalleCompra';

const Compras = () => {
  return (
    <div style={{ padding: '20px' }}>
      {/* El <Outlet /> es donde React Router renderizará 
        los componentes de las rutas anidadas (ListaCompras, FormularioCompra, DetalleCompra)
      */}
      <Routes>
        {/* Ruta raíz para /compras - mostrará la lista de compras */}
        <Route index element={<ListaCompras />} /> 
        
        {/* Ruta para crear una nueva compra: /compras/nueva */}
        <Route path="nueva" element={<FormularioCompra />} />
        
        {/* Ruta para ver los detalles de una compra específica: /compras/:id */}
        <Route path=":id" element={<DetalleCompra />} />
        
        {/* Puedes añadir más rutas aquí si necesitas para edición, etc. */}
      </Routes>
      <Outlet /> {/* Aunque <Routes> ya renderiza, Outlet puede ser útil si tienes un layout persistente */}
    </div>
  );
};

export default Compras;