import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Facturacion = () => {
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  useEffect(() => {
    obtenerProductos();
  }, []);

  const obtenerProductos = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/productos');
      setProductos(response.data);
    } catch (error) {
      console.error('Error al cargar productos.');
    }
  };

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      <h1>Facturación</h1>

      <h2>Buscar Producto</h2>
      <input
        type="text"
        placeholder="Buscar producto"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
      />
      <ul>
        {productosFiltrados.map((producto) => (
          <li key={producto.id}>
            {producto.nombre} - ${producto.precio_venta}
            <button onClick={() => setProductoSeleccionado(producto)}>Seleccionar</button>
          </li>
        ))}
      </ul>

      {productoSeleccionado && (
        <div>
          <h2>Producto Seleccionado</h2>
          <p>{productoSeleccionado.nombre} - ${productoSeleccionado.precio_venta}</p>
        </div>
      )}
    </div>
  );
};

export default Facturacion;