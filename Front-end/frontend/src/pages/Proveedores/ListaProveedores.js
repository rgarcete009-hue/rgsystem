import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Proveedores.css'; // Asegúrate de tener estilos específicos para proveedores

// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const ListaProveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/proveedores`);
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        setProveedores(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProveedores();
  }, []);

  if (loading) {
    return <p>Cargando proveedores...</p>;
  }

  if (error) {
    return <p>Error al cargar los proveedores: {error}</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Listado de Proveedores</h2>
      <Link to="/proveedores/nuevo" style={{ marginBottom: '20px', display: 'inline-block' }}>
        <button>Registrar Nuevo Proveedor</button>
      </Link>
      {proveedores.length === 0 ? (
        <p>No hay proveedores registrados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Nombre</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Contacto</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Teléfono</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Email</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>RUC</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((prov) => (
              <tr key={prov.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{prov.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{prov.nombre}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{prov.contacto || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{prov.telefono || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{prov.email || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{prov.ruc || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <Link to={`/proveedores/${prov.id}`}>Ver Detalles</Link>
                  {/* Puedes añadir un botón de editar y eliminar aquí */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ListaProveedores;