import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Proveedores.css'; // Asegúrate de tener estilos específicos para proveedores
// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const DetalleProveedor = () => {
  const { id } = useParams();
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProveedor = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/proveedores/${id}`);
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        setProveedor(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProveedor();
  }, [id]);

  if (loading) {
    return <p>Cargando detalles del proveedor...</p>;
  }

  if (error) {
    return <p>Error al cargar los detalles del proveedor: {error}</p>;
  }

  if (!proveedor) {
    return <p>Proveedor no encontrado.</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Detalles de Proveedor #{proveedor.id}</h2>
      <p><strong>Nombre:</strong> {proveedor.nombre}</p>
      <p><strong>Contacto:</strong> {proveedor.contacto || 'N/A'}</p>
      <p><strong>Dirección:</strong> {proveedor.direccion || 'N/A'}</p>
      <p><strong>Teléfono:</strong> {proveedor.telefono || 'N/A'}</p>
      <p><strong>Email:</strong> {proveedor.email || 'N/A'}</p>
      <p><strong>RUC:</strong> {proveedor.ruc || 'N/A'}</p>
      <p><strong>Registrado:</strong> {new Date(proveedor.createdAt).toLocaleDateString()}</p>
      <p><strong>Última Actualización:</strong> {new Date(proveedor.updatedAt).toLocaleDateString()}</p>

      <Link to="/proveedores" style={{ display: 'inline-block', marginTop: '20px' }}>
        <button>Volver al Listado de Proveedores</button>
      </Link>
    </div>
  );
};

export default DetalleProveedor;