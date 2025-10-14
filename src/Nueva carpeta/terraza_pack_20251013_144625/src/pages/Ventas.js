// src/pages/Ventas.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import styles from './CSS/Ventas.module.css';
import { useRefresh } from './context/RefreshContext';

/* ===================== API base ====================== */
const API_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN + '/api'
    : process.env.REACT_APP_API_URL_PUBLIC + '/api';

/* ==================== (Resto de utilidades impresora y helpers igual que tu archivo) ==================== */
// — Para mantener breve el patch, se asume que todo tu bloque de ESC/POS, QZ, utils, hooks (useScanner, etc.) permanece igual —
// Copiá el contenido original completo de tu archivo aquí encima de los cambios si preferís un reemplazo total.

function normalizeTxt(s = '') { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }

const Ventas = () => {
  const { triggerRefresh } = useRefresh();

  /* Estado general */
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [venta, setVenta] = useState({ cliente_id: '', detalles: [] });
  const [mensaje, setMensaje] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [procesando, setProcesando] = useState(false);

  /* Buscadores */
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [cantidadProducto, setCantidadProducto] = useState(1);

  /* Modo/pedido */
  const [modo, setModo] = useState('mostrador'); // 'mostrador' | 'mesa' | 'terraza' | 'delivery'
  const [mesas, setMesas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [pedidoId, setPedidoId] = useState(null);
  const [deliveryData, setDeliveryData] = useState({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
  const [deliveryActivos, setDeliveryActivos] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/clientes`).then((r) => setClientes(r.data)).catch(e => console.error(e));
    axios.get(`${API_URL}/productos`).then((r) => setProductos(r.data)).catch(e => console.error(e));
  }, []);

  // Cargar/ordenar mesas al cambiar a modo mesa/terraza
  useEffect(() => {
    if (modo === 'mesa' || modo === 'terraza') {
      axios.get(`${API_URL}/mesas`, { params: { tipo: modo === 'terraza' ? 'terraza' : 'mesa', sector: modo === 'terraza' ? 'terraza' : undefined } })
        .then((r) => {
          const ordenadas = r.data.sort((a, b) => {
            const numA = parseInt(a.nombre.match(/\d+/)?.[0] ?? '0', 10);
            const numB = parseInt(b.nombre.match(/\d+/)?.[0] ?? '0', 10);
            return numA - numB;
          });
          const lista = (modo === 'terraza')
            ? ordenadas.filter(m => String(m.sector || '').toLowerCase() === 'terraza')
            : ordenadas.filter(m => String(m.sector || '').toLowerCase() !== 'terraza');
          setMesas(lista);
        })
        .catch((e) => console.error(e));
    }
  }, [modo]);

  // Refresco periódico de mesas ocupadas (mesa/terraza)
  useEffect(() => {
    if (modo !== 'mesa' && modo !== 'terraza') return;
    const t = setInterval(async () => {
      try {
        const m = await axios.get(`${API_URL}/mesas`, { params: { tipo: modo === 'terraza' ? 'terraza' : 'mesa', sector: modo === 'terraza' ? 'terraza' : undefined } });
        const ord = m.data.sort((a, b) => {
          const numA = parseInt(a.nombre.replace(/[^0-9]/g, ''), 10) || 0;
          const numB = parseInt(b.nombre.replace(/[^0-9]/g, ''), 10) || 0;
          return numA - numB;
        });
        const lista = (modo === 'terraza')
          ? ord.filter(x => String(x.sector || '').toLowerCase() === 'terraza')
          : ord.filter(x => String(x.sector || '').toLowerCase() !== 'terraza');
        setMesas(lista);
      } catch {}
    }, 8000);
    return () => clearInterval(t);
  }, [modo]);

  async function abrirOMantenerPedidoTerraza(mesa) {
    try {
      setMesaSeleccionada(mesa);
      if (mesa.pedido_abierto_id) {
        const pid = mesa.pedido_abierto_id;
        setPedidoId(pid);
        const { data } = await axios.get(`${API_URL}/pedidos/${pid}/detalles`);
        setVenta((prev) => ({ ...prev, detalles: data.map(d => ({ producto_id: d.producto_id, nombre: d.nombre, cantidad: d.cantidad, precio_unitario: d.precio_unitario, subtotal: d.subtotal })) }));
        setMensaje(`Pedido Terraza abierto: ${pid.slice(0, 8)}…`);
        return pid;
      } else {
        const { data } = await axios.post(`${API_URL}/pedidos`, { tipo: 'terraza', mesa_id: mesa.id, cliente_id: venta.cliente_id ?? null });
        setPedidoId(data.id);
        setVenta((prev) => ({ ...prev, detalles: [] }));
        setMensaje(`Pedido Terraza creado: ${data.id.slice(0, 8)}…`);
        try {
          const resp = await axios.get(`${API_URL}/mesas`, { params: { tipo: 'terraza', sector: 'terraza' } });
          const ord = resp.data.sort((a, b) => {
            const numA = parseInt(a.nombre.replace(/[^0-9]/g, ''), 10) || 0;
            const numB = parseInt(b.nombre.replace(/[^0-9]/g, ''), 10) || 0;
            return numA - numB;
          });
          setMesas(ord.filter(x => String(x.sector || '').toLowerCase() === 'terraza'));
        } catch {}
        return data.id;
      }
    } catch (e) {
      const msg = e?.response?.data?.message ?? e.message;
      setMensaje(`Error al abrir pedido Terraza: ${msg}`);
      return null;
    }
  }

  // ——— Resto del componente se mantiene igual que tu archivo, salvo los dos puntos de integración abajo ———

  async function handleRegistrarVenta() {
    // ... tu lógica actual ... (solo cambiamos la rama de refresco)
    // después de registrar y de imprimir ticket:
    if (modo === 'mesa' || modo === 'terraza') {
      try {
        const m = await axios.get(`${API_URL}/mesas`, { params: { tipo: modo === 'terraza' ? 'terraza' : 'mesa', sector: modo === 'terraza' ? 'terraza' : undefined } });
        const ord = m.data.sort((a, b) => {
          const numA = parseInt(a.nombre.replace(/[^0-9]/g, ''), 10) || 0;
          const numB = parseInt(b.nombre.replace(/[^0-9]/g, ''), 10) || 0;
          return numA - numB;
        });
        const lista = (modo === 'terraza')
          ? ord.filter(x => String(x.sector || '').toLowerCase() === 'terraza')
          : ord.filter(x => String(x.sector || '').toLowerCase() !== 'terraza');
        setMesas(lista);
      } catch (e) { console.warn('No se pudo refrescar mesas', e); }
      setMesaSeleccionada(null);
      setPedidoId(null);
      setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
    }
  }

  async function handleCancelarVenta() {
    // ... tu confirm actual ...
    // tras cancelar el pedido en backend:
    if (modo === 'mesa' || modo === 'terraza') {
      try {
        const m = await axios.get(`${API_URL}/mesas`, { params: { tipo: modo === 'terraza' ? 'terraza' : 'mesa', sector: modo === 'terraza' ? 'terraza' : undefined } });
        const ord = m.data.sort((a, b) => {
          const numA = parseInt(a.nombre.replace(/[^0-9]/g, ''), 10) || 0;
          const numB = parseInt(b.nombre.replace(/[^0-9]/g, ''), 10) || 0;
          return numA - numB;
        });
        const lista = (modo === 'terraza')
          ? ord.filter(x => String(x.sector || '').toLowerCase() === 'terraza')
          : ord.filter(x => String(x.sector || '').toLowerCase() !== 'terraza');
        setMesas(lista);
      } catch {}
      setMesaSeleccionada(null);
    }
  }

  // Render: agregá la pestaña Terraza y el panel Terraza donde van tus tabs/panels.
  return null; // Este archivo es un patch parcial: integra estos bloques en tu Ventas.js completo
};

export default Ventas;
