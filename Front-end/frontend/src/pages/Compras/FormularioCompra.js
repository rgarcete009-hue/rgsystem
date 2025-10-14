import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const FormularioCompra = () => {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [formData, setFormData] = useState({
    proveedor_id: '',
    metodo_pago: 'efectivo',
    usuario_id: 1,
    detalles: [{ producto_id: '', cantidad: 1, precio_unitario: 0 }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proveedoresRes, productosRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/proveedores`),
          fetch(`${API_BASE_URL}/api/productos?activo=true`)
        ]);

        if (!proveedoresRes.ok || !productosRes.ok) {
          throw new Error('Error al cargar datos necesarios (proveedores/productos)');
        }

        const proveedoresData = await proveedoresRes.json();
        const productosData = await productosRes.json();

        setProveedores(proveedoresData);
        setProductos(productosData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetalleChange = (index, e) => {
    const { name, value } = e.target;
    const newDetalles = [...formData.detalles];

    if (name === "producto_id") {
      const selectedProduct = productos.find(p => p.id === parseInt(value));
      newDetalles[index] = {
        ...newDetalles[index],
        [name]: value,
        precio_unitario: selectedProduct ? parseFloat(selectedProduct.precio_costo) : 0
      };
    } else {
      newDetalles[index] = { ...newDetalles[index], [name]: value };
    }
    setFormData((prev) => ({ ...prev, detalles: newDetalles }));
  };

  const addDetalle = () => {
    setFormData((prev) => ({
      ...prev,
      detalles: [...prev.detalles, { producto_id: '', cantidad: 1, precio_unitario: 0 }]
    }));
  };

  const removeDetalle = (index) => {
    const newDetalles = formData.detalles.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, detalles: newDetalles }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage('Registrando compra...');
    setError(null);

    const detallesValidos = formData.detalles.filter(d => d.producto_id && d.cantidad > 0 && d.precio_unitario >= 0);

    if (detallesValidos.length === 0) {
      setError('Debe añadir al menos un producto válido a la compra.');
      setSubmitMessage('');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, detalles: detallesValidos }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      setSubmitMessage(`Compra ID ${result.compraId} registrada exitosamente.`);
      setFormData({
        proveedor_id: '',
        metodo_pago: 'efectivo',
        usuario_id: 1,
        detalles: [{ producto_id: '', cantidad: 1, precio_unitario: 0 }]
      });
      navigate(`/compras/${result.compraId}`);
    } catch (err) {
      setError(`Error al registrar la compra: ${err.message}`);
      setSubmitMessage('');
    }
  };

  if (loading) {
    return <p>Cargando datos para el formulario de compra...</p>;
  }

  if (error && !submitMessage) {
    return <p>Error: {error}</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Registrar Nueva Compra</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>
            Proveedor:
            <select
              name="proveedor_id"
              value={formData.proveedor_id}
              onChange={handleChange}
              required
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="">Seleccione un proveedor</option>
              {proveedores.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label>
            Método de Pago:
            <select
              name="metodo_pago"
              value={formData.metodo_pago}
              onChange={handleChange}
              required
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
            </select>
          </label>
        </div>

        <h3>Detalles de la Compra:</h3>
        {formData.detalles.map((detalle, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
            <h4>Producto #{index + 1}</h4>
            <div>
              <label>
                Producto:
                <select
                  name="producto_id"
                  value={detalle.producto_id}
                  onChange={(e) => handleDetalleChange(index, e)}
                  required
                  style={{ marginLeft: '10px', padding: '5px' }}
                >
                  <option value="">Seleccione un producto</option>
                  {productos.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nombre} (Stock: {prod.stock})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label>
                Cantidad:
                <input
                  type="number"
                  name="cantidad"
                  value={detalle.cantidad}
                  onChange={(e) => handleDetalleChange(index, e)}
                  min="1"
                  required
                  style={{ marginLeft: '10px', padding: '5px' }}
                />
              </label>
            </div>
            <div>
              <label>
                Precio Unitario (Compra):
                <input
                  type="number"
                  name="precio_unitario"
                  value={detalle.precio_unitario}
                  onChange={(e) => handleDetalleChange(index, e)}
                  step="0.01"
                  min="0"
                  required
                  style={{ marginLeft: '10px', padding: '5px' }}
                />
              </label>
            </div>
            {formData.detalles.length > 1 && (
              <button type="button" onClick={() => removeDetalle(index)} style={{ marginTop: '10px' }}>
                Eliminar Producto
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addDetalle}>Añadir Otro Producto</button>

        <button type="submit" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Registrar Compra
        </button>
      </form>
      {submitMessage && <p style={{ color: 'green', marginTop: '10px' }}>{submitMessage}</p>}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

export default FormularioCompra;