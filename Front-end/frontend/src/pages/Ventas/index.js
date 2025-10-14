import React, { useState, useEffect, useCallback } from 'react';
import { useVentas } from './hooks/useVentas';
import * as api from './api';

import BuscadorProductos from './components/BuscadorProductos';
import BuscadorClientes from './components/BuscadorClientes';
import DetalleVenta from './components/DetalleVenta';
import ResumenVenta from './components/ResumenVenta';
import ResumenCaja from './components/ResumenCaja';
import ToastMessage from './components/ToastMessage';

import styles from '../../components/Ventas.module.css'; // ajustá si tu ruta es distinta

const Ventas = () => {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ventasHoy, setVentasHoy] = useState({ lista: [], totales: {} });
  const [topProductos, setTopProductos] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const venta = useVentas(productos);

  const cargarDatosIniciales = useCallback(async () => {
    try {
      const [resProductos, resClientes, resVentasHoy] = await Promise.all([
        api.getProductos(),
        api.getClientes(),
        api.getVentasHoy(new Date().toISOString().split('T')[0])
      ]);

      setProductos(resProductos.data);
      setClientes(resClientes.data);

      const totales = resVentasHoy.data.reduce((acc, v) => {
        acc.totalGeneral = (acc.totalGeneral || 0) + parseFloat(v.total);
        acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + parseFloat(v.total);
        return acc;
      }, {});
      setVentasHoy({ lista: resVentasHoy.data, totales });

      // Calcular productos más vendidos
      const contador = {};
      resVentasHoy.data.forEach(v => {
        v.detalles.forEach(({ producto_id, cantidad }) => {
          contador[producto_id] = (contador[producto_id] || 0) + cantidad;
        });
      });

      const top = Object.entries(contador)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, cantidad]) => {
          const producto = resProductos.data.find(p => p.id === parseInt(id));
          return {
            nombre: producto?.nombre || `ID ${id}`,
            cantidad
          };
        });

      setTopProductos(top);
    } catch (error) {
      setMensaje({ texto: 'Error al cargar datos iniciales.', tipo: 'error' });
    }
  }, []);

  useEffect(() => {
    cargarDatosIniciales();
  }, [cargarDatosIniciales]);

  const handleRegistrarVenta = async () => {
    if (!venta.cliente) {
      return setMensaje({ texto: 'Error: Por favor, seleccione un cliente.', tipo: 'error' });
    }
    if (venta.detalles.length === 0) {
      return setMensaje({ texto: 'Error: Agregue al menos un producto.', tipo: 'error' });
    }

    const nuevaVenta = {
      cliente_id: venta.cliente.id,
      metodo_pago: venta.metodoPago,
      detalles: venta.detalles.map(({ producto_id, cantidad, precio_unitario }) => ({
        producto_id,
        cantidad,
        precio_unitario,
      })),
    };

    try {
      const res = await api.createVenta(nuevaVenta);
      const { id } = res.data;
      setMensaje({ texto: 'Venta registrada. Abriendo factura...', tipo: 'success' });

      window.open(api.getFacturaUrl(id), '_blank');

      venta.resetVenta();
      cargarDatosIniciales();
    } catch (err) {
      const errorMsg = err.response?.data?.details || err.message;
      setMensaje({ texto: `Error al registrar: ${errorMsg}`, tipo: 'error' });
    }
  };

  const handleAddNuevoCliente = (clienteNuevo) => {
    setClientes(prev => [...prev, clienteNuevo]);
    venta.setCliente(clienteNuevo);
    setMensaje({ texto: 'Cliente agregado y seleccionado.', tipo: 'success' });
  };

  return (
    <div className={styles.ventasContainer}>
      <ToastMessage mensaje={mensaje} setMensaje={setMensaje} />

      <div className={styles.productosSection}>
        <h1 className={styles.mainTitle}>🍕 Registro de Ventas - Artes y Delicias</h1>
        <BuscadorProductos productos={productos} onAddProducto={venta.addProducto} />

        <div className={styles.topProductos}>
          <h3>🔥 Más vendidos hoy</h3>
          <ul>
            {topProductos.map((p, i) => (
              <li key={i}>
                <strong>{p.nombre}</strong>: {p.cantidad} vendidos
              </li>
            ))}
          </ul>
        </div>

        <ResumenCaja totales={ventasHoy.totales} />
      </div>

      <div className={styles.carritoSection}>
        <BuscadorClientes
          clientes={clientes}
          selectedCliente={venta.cliente}
          onSelectCliente={venta.setCliente}
          onAddNuevoCliente={handleAddNuevoCliente}
        />
        <DetalleVenta
          detalles={venta.detalles}
          onRemove={venta.removeProducto}
          onEditCantidad={venta.editCantidadProducto}
        />
        <ResumenVenta
          total={venta.totalVenta}
          metodoPago={venta.metodoPago}
          onMetodoPagoChange={venta.setMetodoPago}
          onRegistrar={handleRegistrarVenta}
          onCancelar={venta.resetVenta}
        />
      </div>
    </div>
  );
};

export default Ventas;