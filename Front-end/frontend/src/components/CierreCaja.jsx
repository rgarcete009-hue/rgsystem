// Ventas.jsx (o la página de Ventas que uses)
import React, { useState } from 'react';
import axios from 'axios';
// Importa o copia el componente CierreCaja
import CierreCaja from './CierreCaja'; // Asegúrate que la ruta sea correcta

const Ventas = () => {
  // Aquí ya debe existir la lógica y componentes relacionados con el registro de ventas
  // ...

  // Nuevo estado para mostrar/ocultar el cierre de caja
  const [mostrarCierre, setMostrarCierre] = useState(false);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Registro de Ventas</h1>
      {/* Aquí iría el resto de la UI de ventas */}
      
      {/* Botón para alternar la vista de cierre de caja */}
      <button 
        onClick={() => setMostrarCierre(!mostrarCierre)}
        style={{
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          padding: '10px 20px',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}
      >
        {mostrarCierre ? "Ocultar Cierre de Caja" : "Mostrar Cierre de Caja"}
      </button>

      {/* Si mostrarCierre es verdadero, se renderiza el componente CierreCaja */}
      {mostrarCierre && <CierreCaja />}

      {/* Resto de la interfaz de ventas */}
    </div>
  );
};

export default Ventas;