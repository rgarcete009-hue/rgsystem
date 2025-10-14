import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const DetalleCompra = () => {
  const { id } = useParams();
  const [compra, setCompra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompra = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/compras/${id}?includeProveedor=true&includeDetails=true`
        );
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        setCompra(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompra();
  }, [id]);

  if (loading) {
    return <p>Cargando detalles de la compra...</p>;
  }

  if (error) {
    return <p>Error al cargar los detalles de la compra: {error}</p>;
  }

  if (!compra) {
    return <p>Compra no encontrada.</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Detalles de Compra #{compra.id}</h2>
      <p><strong>Proveedor:</strong> {compra.proveedorAsociado ? compra.proveedorAsociado.nombre : 'N/A'}</p>
      <p><strong>Fecha:</strong> {new Date(compra.fecha).toLocaleDateString()}</p>
      <p><strong>Total:</strong> {parseFloat(compra.total).toFixed(2)}</p>
      <p><strong>Método de Pago:</strong> {compra.metodo_pago}</p>
      <p><strong>Estado:</strong> {compra.estado}</p>
      <p><strong>Registrada por Usuario ID:</strong> {compra.usuario_id || 'N/A'}</p>

      <h3>Productos Comprados:</h3>
      {compra.detallesDeCompra && compra.detallesDeCompra.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9f9f9' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Producto</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Cantidad</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Precio Unitario</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {compra.detallesDeCompra.map((detalle) => (
              <tr key={detalle.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {detalle.productoComprado ? detalle.productoComprado.nombre : 'N/A'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{detalle.cantidad}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{parseFloat(detalle.precio_unitario).toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{(detalle.cantidad * parseFloat(detalle.precio_unitario)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay detalles de productos para esta compra.</p>
      )}

      <Link to="/compras" style={{ display: 'inline-block', marginTop: '20px' }}>
        <button>Volver al Listado de Compras</button>
      </Link>
    </div>
  );
};

export default DetalleCompra;