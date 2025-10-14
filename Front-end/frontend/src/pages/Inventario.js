import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Inventario = () => {
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [soloBajoStock, setSoloBajoStock] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [entrada, setEntrada] = useState({
    producto_id: '',
    cantidad: '',
    descripcion: ''
  });

  useEffect(() => {
    obtenerStock();
  }, []);

  const obtenerStock = async () => {
    try {
      const response = await axios.get('http://localhost:3000/inventario/stock');
      setProductos(response.data);
    } catch (error) {
      console.error('Error al obtener inventario:', error);
    }
  };

  const handleBuscar = (e) => {
    setFiltro(e.target.value.toLowerCase());
  };

  const productosFiltrados = productos.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(filtro);
    const cumpleStock = soloBajoStock ? p.stock <= 5 : true;
    return coincideNombre && cumpleStock;
  });

  const handleRegistrarEntrada = async () => {
    try {
      await axios.post('http://localhost:3000/inventario/entrada', entrada);
      setMostrarModal(false);
      setEntrada({ producto_id: '', cantidad: '', descripcion: '' });
      obtenerStock();
    } catch (error) {
      alert('Error al registrar entrada');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📦 Inventario</h2>

      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar por nombre"
          onChange={handleBuscar}
          style={{ marginRight: '1rem' }}
        />
        <label>
          <input
            type="checkbox"
            checked={soloBajoStock}
            onChange={() => setSoloBajoStock(!soloBajoStock)}
          />
          {' '}Mostrar solo bajo stock
        </label>
        <button
          style={{ marginLeft: '1rem' }}
          onClick={() => setMostrarModal(true)}
        >
          ➕ Registrar entrada
        </button>
      </div>

      <table
        border="1"
        cellPadding="10"
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Precio Venta</th>
            <th>IVA</th>
            <th>Stock Actual</th>
          </tr>
        </thead>
        <tbody>
          {productosFiltrados.map((producto) => (
            <tr
              key={producto.producto_id}
              style={{
                backgroundColor: producto.stock <= 5 ? '#ffe5e5' : 'white'
              }}
            >
              <td>{producto.producto_id}</td>
              <td>{producto.nombre}</td>
              <td>{producto.precio_venta}</td>
              <td>{producto.iva}</td>
              <td>{producto.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de registro de entrada manual */}
      {mostrarModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              background: 'white',
              padding: 20,
              borderRadius: 10,
              width: 400
            }}
          >
            <h3>➕ Nueva entrada</h3>
            <label>ID Producto: </label>
            <input
              type="number"
              value={entrada.producto_id}
              onChange={(e) =>
                setEntrada({ ...entrada, producto_id: e.target.value })
              }
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <label>Cantidad: </label>
            <input
              type="number"
              value={entrada.cantidad}
              onChange={(e) =>
                setEntrada({ ...entrada, cantidad: e.target.value })
              }
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <label>Descripción: </label>
            <input
              type="text"
              value={entrada.descripcion}
              onChange={(e) =>
                setEntrada({ ...entrada, descripcion: e.target.value })
              }
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            <button onClick={handleRegistrarEntrada} style={{ marginRight: 10 }}>
              Guardar
            </button>
            <button onClick={() => setMostrarModal(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;