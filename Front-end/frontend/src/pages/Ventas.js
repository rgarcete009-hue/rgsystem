import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import styles from './CSS/Ventas.module.css';
import { useRefresh } from './context/RefreshContext';

/* ===================== API base ====================== */
const API_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN + '/api'
    : process.env.REACT_APP_API_URL_PUBLIC + '/api';

/* ==================== Utils UI ==================== */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}
function normalizeTxt(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const formatGsPY = (n) => Number(n).toLocaleString('es-PY');

/* ====== Helpers Mesas (unificar lógica por `tipo`) ====== */
function inferirTipoMesa(m) {
  if (m?.tipo === 'normal' || m?.tipo === 'terraza') return m.tipo;
  const n = String(m?.nombre ?? '').toLowerCase();
  if (n.startsWith('t') || n.includes('terraza')) return 'terraza';
  return 'normal';
}
function ordenarMesas(arr) {
  return [...arr].sort((a, b) => {
    const numA = parseInt(String(a.nombre).match(/\d+/)?.[0] ?? '0', 10);
    const numB = parseInt(String(b.nombre).match(/\d+/)?.[0] ?? '0', 10);
    return numA - numB;
  });
}
function splitMesasPorTipo(lista) {
  const normal = (lista || []).filter((m) => inferirTipoMesa(m) === 'normal');
  const terraza = (lista || []).filter((m) => inferirTipoMesa(m) === 'terraza');
  return { normal: ordenarMesas(normal), terraza: ordenarMesas(terraza) };
}

/* ==================== Componente ==================== */
const Ventas = () => {
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

  /* Modal cliente */
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState({ nombre: '', ruc: '' });
  const finalClienteBusqueda = useDebounce(clienteBusqueda, 300);
  const finalProductoBusqueda = useDebounce(productoBusqueda, 300);
  const productoSearchInputRef = useRef(null);
  const clienteSearchInputRef = useRef(null);

  /* ====== Modo/pedido (ahora con terraza) ====== */
  const [modo, setModo] = useState('mostrador');
  const [mesas, setMesas] = useState([]);
  const [mesasTerraza, setMesasTerraza] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [pedidoId, setPedidoId] = useState(null);
  const [deliveryData, setDeliveryData] = useState({
    telefono: '',
    direccion: '',
    referencia: '',
    costo_envio: 0,
    repartidor: '',
  });
  const [deliveryActivos, setDeliveryActivos] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/clientes`)
      .then((r) => setClientes(r.data))
      .catch((e) => console.error(e));
    axios
      .get(`${API_URL}/productos`)
      .then((r) => setProductos(r.data))
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (mensaje) {
      const t = setTimeout(() => setMensaje(''), 5000);
      return () => clearTimeout(t);
    }
  }, [mensaje]);

  // Cargar mesas según el tipo
  useEffect(() => {
    if (modo === 'mesa' || modo === 'terraza') {
      axios
        .get(`${API_URL}/mesas`)
        .then((r) => {
          const { normal, terraza } = splitMesasPorTipo(r.data || []);
          setMesas(normal);
          setMesasTerraza(terraza);
        })
        .catch((e) => console.error(e));
    }
  }, [modo]);

  // Derivar categorías
  useEffect(() => {
    if (!Array.isArray(productos)) {
      setCategorias([]);
      return;
    }
    const unicas = [...new Set(productos.map((p) => p?.categoria).filter(Boolean))];
    unicas.sort((a, b) => String(a).localeCompare(String(b), 'es'));
    setCategorias(unicas);
    if (categoriaFiltro && !unicas.includes(categoriaFiltro)) setCategoriaFiltro('');
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    const q = normalizeTxt(finalProductoBusqueda);
    const base = (Array.isArray(productos) ? productos : []).filter((p) => {
      if (!categoriaFiltro) return true;
      return String(p?.categoria ?? '') === String(categoriaFiltro);
    });
    if (!q) return base;
    const term = q;
    return base
      .filter((p) => {
        const nombre = normalizeTxt(p?.nombre ?? '');
        const codigo = normalizeTxt(p?.codigo ?? '');
        const codigoBarra = normalizeTxt(p?.codigo_barra ?? '');
        const codigoProducto = normalizeTxt(p?.codigo_producto ?? '');
        const barcode = p?.barcode ? String(p.barcode) : '';
        return (
          nombre.includes(term) ||
          (term && codigo.includes(term)) ||
          (term && codigoBarra.includes(term)) ||
          (term && codigoProducto.includes(term)) ||
          (term && barcode.includes(term))
        );
      })
      .sort((a, b) => {
        const A = normalizeTxt(a?.nombre ?? ''),
          Bn = normalizeTxt(b?.nombre ?? '');
        const aS = A.startsWith(term) ? 0 : 1,
          bS = Bn.startsWith(term) ? 0 : 1;
        if (aS !== bS) return aS - bS;
        return A.indexOf(term) - Bn.indexOf(term);
      });
  }, [finalProductoBusqueda, productos, categoriaFiltro]);

  useEffect(() => setActiveIdx(0), [finalProductoBusqueda, productosFiltrados.length]);

  const clientesFiltrados = clientes.filter(({ nombre, ruc }) => {
    const t = finalClienteBusqueda.toLowerCase();
    return (nombre ?? '').toLowerCase().includes(t) || (ruc && ruc.toLowerCase().includes(t));
  });

  const handleSeleccionarCliente = (cliente) => {
    setSelectedCliente(cliente);
    setVenta({ ...venta, cliente_id: cliente.id });
    const text = `${cliente.nombre}${cliente.ruc ? ` - ${cliente.ruc}` : ''}`;
    setClienteBusqueda(text);
  };

  const seleccionarConsumidorFinal = () => {
    const cf = clientes.find(
      (c) =>
        (c.ruc && String(c.ruc).trim() === '0') ||
        (c.nombre && c.nombre.trim().toLowerCase() === 'consumidor final')
    );
    if (!cf) return setMensaje('No se encontró el cliente "Consumidor Final" (RUC 0).');
    handleSeleccionarCliente(cf);
  };

  const handleSeleccionarProducto = (prod) => {
    setSelectedProducto(prod);
    setProductoBusqueda(`${
      prod.nombre
    } - Gs. ${formatGsPY(prod.precio)}`);
    setCantidadProducto(1);
  };

  async function addProductoDirecto(prod, qty = 1) {
    const cantidad = Number(qty);
    if (!prod || isNaN(cantidad) || cantidad <= 0) return setMensaje('Selección o cantidad inválida.');
    const precioUnitario = parseInt(prod.precio, 10);
    if (isNaN(precioUnitario) || precioUnitario < 0) return setMensaje('Precio unitario inválido.');
    if (typeof prod.stock === 'number' && prod.stock < cantidad)
      return setMensaje(`Stock insuficiente para ${prod.nombre}. Stock disponible: ${prod.stock}`);

    setVenta((prev) => {
      const idx = prev.detalles.findIndex((it) => it.producto_id === prod.id);
      if (idx > -1) {
        const newDetalles = prev.detalles.map((it, i) => {
          if (i !== idx) return it;
          const newCant = it.cantidad + cantidad;
          if (typeof prod.stock === 'number' && prod.stock < newCant) {
            setMensaje(`Stock insuficiente para ${prod.nombre} con la nueva cantidad. Stock: ${prod.stock}`);
            return it;
          }
          return { ...it, cantidad: newCant, subtotal: it.precio_unitario * newCant };
        });
        return { ...prev, detalles: newDetalles };
      } else {
        const detalle = {
          producto_id: prod.id,
          nombre: prod.nombre,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal: precioUnitario * cantidad,
        };
        return { ...prev, detalles: [...prev.detalles, detalle] };
      }
    });

    // Modo con pedido: enviar comanda
    if (modo !== 'mostrador') {
      let pid = pedidoId;
      if ((modo === 'mesa' || modo === 'terraza') && mesaSeleccionada && !pid) {
        pid = await abrirOMantenerPedidoMesa(mesaSeleccionada);
        setPedidoId(pid);
      }
      if (modo === 'delivery' && !pid) {
        pid = await abrirOMantenerPedidoDelivery();
        setPedidoId(pid);
      }
      if (pid) {
        try {
          await axios.post(`${API_URL}/pedidos/${pid}/detalles`, {
            items: [
              {
                producto_id: prod.id,
                nombre: prod.nombre,
                cantidad: Number(qty),
                precio_unitario: precioUnitario,
                subtotal: precioUnitario * Number(qty),
              },
            ],
          });
        } catch (e) {
          console.warn('Error enviando comanda', e);
          setMensaje(`No se pudo enviar comanda: ${e?.response?.data?.message ?? e.message}`);
        }
      }
    }

    setMensaje('');
    setProductoBusqueda('');
    setSelectedProducto(null);
    setCantidadProducto(1);
    productoSearchInputRef.current?.focus();
  }

  const handleAddProducto = () => {
    if (!selectedProducto) return setMensaje('Por favor, seleccione un producto');
    addProductoDirecto(selectedProducto, cantidadProducto);
  };

  const handleRemoveProducto = (i) => {
    setVenta((prev) => ({ ...prev, detalles: prev.detalles.filter((_, idx) => idx !== i) }));
    setMensaje('Producto eliminado del carrito.');
  };

  const handleEditCantidadProducto = (i, v) => {
    const n = Number(v);
    if (isNaN(n) || n <= 0) {
      setMensaje('La cantidad debe ser un número positivo.');
      return;
    }
    setVenta((prev) => ({
      ...prev,
      detalles: prev.detalles.map((item, idx) => {
        if (idx === i) {
          const original = productos.find((p) => p.id === item.producto_id);
          if (original && typeof original.stock === 'number' && original.stock < n) {
            setMensaje(`Stock insuficiente para ${item.nombre}. Stock: ${original.stock}`);
            return item;
          }
          return { ...item, cantidad: n, subtotal: item.precio_unitario * n };
        }
        return item;
      }),
    }));
    setMensaje('');
  };

  const calcularTotal = () =>
    venta.detalles.reduce((acc, { subtotal }) => acc + subtotal, 0);

  const resetearVenta = () => {
    setVenta({ cliente_id: '', detalles: [] });
    setSelectedCliente(null);
    setClienteBusqueda('');
    setSelectedProducto(null);
    setProductoBusqueda('');
    setCantidadProducto(1);
    setMetodoPago('efectivo');
    setMensaje('');
    if (modo !== 'mostrador') {
      setPedidoId(null);
      setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
      setMesaSeleccionada(null);
    }
  };

  const resetearCliente = () => {
    setSelectedCliente(null);
    setVenta((v) => ({ ...v, cliente_id: '' }));
    setClienteBusqueda('');
  };

  const handleGuardarNuevoCliente = async () => {
    try {
      if (!nuevoClienteData.nombre?.trim() || !nuevoClienteData.ruc?.trim()) {
        setMensaje('Error: Nombre y RUC del cliente son obligatorios.');
        return;
      }
      const res = await axios.post(`${API_URL}/clientes`, nuevoClienteData);
      setClientes((prev) => [...prev, res.data]);
      handleSeleccionarCliente(res.data);
      setMensaje('Cliente agregado y seleccionado exitosamente.');
      setMostrarModalCliente(false);
      setNuevoClienteData({ nombre: '', ruc: '' });
    } catch (err) {
      const msg = err?.response?.data?.message ?? err.message;
      setMensaje('Error al agregar nuevo cliente: ' + msg);
    }
  };

  const handleRegistrarVenta = async () => {
    if (!venta.detalles.length && !pedidoId) return setMensaje('Error: Agregue al menos un producto.');
    if (procesando) return;
    setProcesando(true);
    try {
      let id;
      if (modo === 'mostrador') {
        const body = {
          cliente_id: venta.cliente_id ?? (selectedCliente?.id ?? null),
          metodo_pago: metodoPago,
          total: calcularTotal(),
          detalles: venta.detalles,
        };
        const res = await axios.post(`${API_URL}/ventas`, body);
        id = res.data.id;
      } else {
        if (!pedidoId) return setMensaje('No hay pedido abierto para cobrar.');
        const { data: dets } = await axios.get(`${API_URL}/pedidos/${pedidoId}/detalles`);
        if (!dets || dets.length === 0)
          return setMensaje('Este pedido no tiene ítems. Agregue productos antes de facturar.');
        const res = await axios.post(`${API_URL}/ventas`, {
          pedido_id: pedidoId,
          metodo_pago: metodoPago,
        });
        id = res.data.id;
      }

      setMensaje('Venta registrada exitosamente.');
      try {
        window.open(`${API_URL}/factura/${id}?autoprint=1&close=1`, '_blank');
      } catch (e) {
        console.warn('No se pudo abrir factura', e);
      }

      if (modo === 'mesa' || modo === 'terraza') {
        try {
          const m = await axios.get(`${API_URL}/mesas`);
          const { normal, terraza } = splitMesasPorTipo(m.data || []);
          setMesas(normal);
          setMesasTerraza(terraza);
        } catch (e) {
          console.warn('No se pudo refrescar mesas', e);
        }
        setMesaSeleccionada(null);
        setPedidoId(null);
      }

      resetearVenta();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      setMensaje(`Error al registrar la venta: ${errorMsg}`);
    } finally {
      setProcesando(false);
    }
  };

  async function abrirOMantenerPedidoMesa(mesa) {
    try {
      setMesaSeleccionada(mesa);
      if (mesa.pedido_abierto_id) {
        const pid = mesa.pedido_abierto_id;
        setPedidoId(pid);
        const { data } = await axios.get(`${API_URL}/pedidos/${pid}/detalles`);
        setVenta((prev) => ({ ...prev, detalles: data.map(mapPedidoDetalleToLinea) }));
        setMensaje(
          `Pedido ${modo === 'terraza' ? 'Terraza' : 'Mesa'} abierto: ${pid.slice(0, 8)}…`
        );
        return pid;
      } else {
        const { data } = await axios.post(`${API_URL}/pedidos`, {
          tipo: modo === 'terraza' ? 'terraza' : 'mesa',
          mesa_id: mesa.id,
          cliente_id: venta.cliente_id ?? null,
        });
        setPedidoId(data.id);
        setVenta((prev) => ({ ...prev, detalles: [] }));
        setMensaje(
          `Pedido ${modo === 'terraza' ? 'Terraza' : 'Mesa'} creado: ${data.id.slice(0, 8)}…`
        );
        try {
          const m = await axios.get(`${API_URL}/mesas`);
          const { normal, terraza } = splitMesasPorTipo(m.data || []);
          setMesas(normal);
          setMesasTerraza(terraza);
        } catch {}
        return data.id;
      }
    } catch (e) {
      const msg = e?.response?.data?.message ?? e.message;
      setMensaje(`Error al abrir pedido: ${msg}`);
      return null;
    }
  }

  async function abrirOMantenerPedidoDelivery() {
    try {
      if (pedidoId) {
        setMensaje(`Pedido Delivery ya abierto: ${pedidoId.slice(0, 8)}…`);
        return pedidoId;
      }
      const { telefono, direccion, referencia, costo_envio, repartidor } = deliveryData ?? {};
      const { data } = await axios.post(`${API_URL}/pedidos`, {
        tipo: 'delivery',
        delivery: {
          telefono: telefono ?? null,
          direccion: direccion ?? null,
          referencia: referencia ?? null,
          nombre: repartidor ?? null,
          costo_envio: Number(costo_envio ?? 0),
        },
        cliente_id: venta.cliente_id ?? null,
      });
      setPedidoId(data.id);
      setMensaje(`Pedido Delivery abierto: ${data.id.slice(0, 8)}…`);
      return data.id;
    } catch (e) {
      const msg = e?.response?.data?.message ?? e.message;
      setMensaje(`Error al abrir pedido Delivery: ${msg}`);
      return null;
    }
  }

  function mapPedidoDetalleToLinea(d) {
    return {
      producto_id: d.producto_id,
      nombre: d.nombre,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal,
    };
  }

  async function handleCancelarVenta() {
    if (cancelando) return;

    // Validación extra: si es mesa/terraza pero no hay pedidoId
    if ((modo === 'mesa' || modo === 'terraza') && !pedidoId) {
      setMensaje('No hay pedido abierto para esta mesa.');
      return;
    }

    const titulo =
      modo === 'mesa'
        ? 'Cancelar venta y cerrar la mesa'
        : modo === 'terraza'
        ? 'Cancelar venta y cerrar la mesa de terraza'
        : modo === 'delivery'
        ? 'Cancelar venta y cerrar el delivery'
        : 'Cancelar venta';
    const ok = window.confirm(`${titulo}.\n¿Está seguro?`);
    if (!ok) return;

    setCancelando(true);
    try {
      if ((modo === 'mesa' || modo === 'terraza' || modo === 'delivery') && pedidoId) {
        try {
          const { data: dets } = await axios.get(`${API_URL}/pedidos/${pedidoId}/detalles`);
          const tieneItems = Array.isArray(dets) && dets.length > 0;
          const mensaje2 = tieneItems
            ? 'El pedido tiene ítems cargados. Esto lo cancelará y liberará la mesa/delivery. ¿Desea continuar?'
            : 'Esto cancelará el pedido y liberará la mesa/delivery. ¿Desea continuar?';
          const ok2 = window.confirm(mensaje2);
          if (!ok2) {
            setCancelando(false);
            return;
          }
          await axios.patch(`${API_URL}/pedidos/${pedidoId}/estado`, { estado: 'cancelado' });

          if (modo === 'mesa' || modo === 'terraza') {
            try {
              const m = await axios.get(`${API_URL}/mesas`);
              const { normal, terraza } = splitMesasPorTipo(m.data || []);
              setMesas(normal);
              setMesasTerraza(terraza);
            } catch {}
            setMesaSeleccionada(null);
          }
          setMensaje('Pedido cancelado correctamente.');
        } catch (e) {
          setMensaje(`No se pudo cancelar el pedido: ${e?.response?.data?.message ?? e.message}`);
          return;
        }
      }

      resetearVenta();
      setPedidoId(null);
      if (modo === 'delivery') {
        setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
      }
    } finally {
      setCancelando(false);
    }
  }

  const onProductoSearchKeyDown = (e) => {
    if (!Array.isArray(productosFiltrados) || productosFiltrados.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, productosFiltrados.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const prod = productosFiltrados[activeIdx];
      if (prod) addProductoDirecto(prod, 1);
    }
  };

  const ModoTabs = () => (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <button
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: modo === 'mostrador' ? '#2563eb' : '#e5e7eb',
          color: modo === 'mostrador' ? 'white' : '#374151',
          fontWeight: '500',
        }}
        onClick={() => {
          setModo('mostrador');
          setPedidoId(null);
          setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
          setMesaSeleccionada(null);
        }}
      >
        Mostrador
      </button>
      <button
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: modo === 'mesa' ? '#2563eb' : '#e5e7eb',
          color: modo === 'mesa' ? 'white' : '#374151',
          fontWeight: '500',
        }}
        onClick={() => {
          setModo('mesa');
          setPedidoId(null);
          setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
        }}
      >
        Mesas
      </button>
      <button
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: modo === 'terraza' ? '#2563eb' : '#e5e7eb',
          color: modo === 'terraza' ? 'white' : '#374151',
          fontWeight: '500',
        }}
        onClick={() => {
          setModo('terraza');
          setPedidoId(null);
          setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
        }}
      >
        Terraza
      </button>
      <button
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: modo === 'delivery' ? '#2563eb' : '#e5e7eb',
          color: modo === 'delivery' ? 'white' : '#374151',
          fontWeight: '500',
        }}
        onClick={() => {
          setModo('delivery');
          setPedidoId(null);
          setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
        }}
      >
        Delivery
      </button>
    </div>
  );

  /* ==================== UI ==================== */
  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Mensaje global */}
      {mensaje && (
        <div
          style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '4px',
            backgroundColor: mensaje.startsWith('Error') ? '#fee2e2' : '#dcfce7',
            color: mensaje.startsWith('Error') ? '#991b1b' : '#166534',
            border: `1px solid ${mensaje.startsWith('Error') ? '#fca5a5' : '#86efac'}`,
          }}
        >
          {mensaje}
        </div>
      )}

      {/* Encabezado */}
      <div style={{ marginBottom: '24px' }}>
        <ModoTabs />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Modo: <strong>{modo.toUpperCase()}</strong>
            {modo !== 'mostrador' && pedidoId ? (
              <> – Pedido: <strong>{pedidoId.slice(0, 8)}…</strong></>
            ) : null}
            {(modo === 'mesa' || modo === 'terraza') && mesaSeleccionada ? (
              <> – Mesa: <strong>{mesaSeleccionada.nombre}</strong></>
            ) : null}
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              Total: Gs. {formatGsPY(calcularTotal())}
            </div>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <button
              onClick={handleRegistrarVenta}
              disabled={procesando}
              style={{
                padding: '10px 20px',
                backgroundColor: procesando ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: procesando ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              {procesando ? 'Procesando…' : 'Cobrar'}
            </button>
            <button
              onClick={handleCancelarVenta}
              disabled={cancelando}
              style={{
                padding: '10px 20px',
                backgroundColor: cancelando ? '#9ca3af' : '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: cancelando ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              {cancelando ? 'Cancelando…' : 'Cancelar'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar producto (F2)..."
              value={productoBusqueda}
              onChange={(e) => {
                setProductoBusqueda(e.target.value);
                setSelectedProducto(null);
              }}
              onKeyDown={onProductoSearchKeyDown}
              ref={productoSearchInputRef}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {selectedCliente ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>
                  {selectedCliente.nombre} {selectedCliente.ruc ? `· RUC ${selectedCliente.ruc}` : ''}
                </span>
                <button
                  onClick={resetearCliente}
                  style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #d1d5db', cursor: 'pointer' }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Cliente (F3)..."
                  value={clienteBusqueda}
                  onChange={(e) => setClienteBusqueda(e.target.value)}
                  ref={clienteSearchInputRef}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                {finalClienteBusqueda && (
                  <ul
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      zIndex: 10,
                    }}
                  >
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((c) => (
                        <li
                          key={c.id}
                          onClick={() => handleSeleccionarCliente(c)}
                          style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                        >
                          {c.nombre} {c.ruc ? `- ${c.ruc}` : ''}
                        </li>
                      ))
                    ) : (
                      <li style={{ padding: '8px', color: '#6b7280' }}>
                        Sin coincidencias.
                        <button
                          onClick={() => setMostrarModalCliente(true)}
                          style={{
                            marginLeft: '8px',
                            color: '#2563eb',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Agregar nuevo
                        </button>
                      </li>
                    )}
                  </ul>
                )}
                <button
                  onClick={seleccionarConsumidorFinal}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    cursor: 'pointer',
                  }}
                >
                  CF
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo en 3 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Columna 1: Productos */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '600' }}>Productos</h2>
          {productoBusqueda && !selectedProducto && (
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto' }}>
              {Array.isArray(productosFiltrados) && productosFiltrados.length > 0 ? (
                productosFiltrados.map((prod, idx) => (
                  <li
                    key={prod.id}
                    onClick={() => handleSeleccionarProducto(prod)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: idx === activeIdx ? '#eff6ff' : 'white',
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{prod.nombre}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      <span>Gs. {formatGsPY(prod.precio)}</span>
                      <span style={{ marginLeft: '12px' }}>
                        Stock: {typeof prod.stock === 'number' ? prod.stock : '-'}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <p style={{ color: '#6b7280' }}>No se encontró el producto.</p>
              )}
            </ul>
          )}

          {selectedProducto && (
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong>{selectedProducto.nombre}</strong>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Gs. {formatGsPY(selectedProducto.precio)} · Stock:{' '}
                  {typeof selectedProducto.stock === 'number' ? selectedProducto.stock : '-'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label>Cant.</label>
                <input
                  type="number"
                  min="1"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                  style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <button
                  onClick={handleAddProducto}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: Carrito */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '600' }}>Carrito</h2>
          {venta.detalles.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No se han agregado productos.</p>
          ) : (
            <div>
              {venta.detalles.map((item, idx) => (
                <div
                  key={idx}
                  style={{ padding: '12px', marginBottom: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{item.nombre}</strong>
                    <button
                      onClick={() => handleRemoveProducto(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handleEditCantidadProducto(idx, item.cantidad - 1)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => handleEditCantidadProducto(idx, e.target.value)}
                      style={{
                        width: '60px',
                        padding: '4px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        textAlign: 'center',
                      }}
                    />
                    <button
                      onClick={() => handleEditCantidadProducto(idx, item.cantidad + 1)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', cursor: 'pointer' }}
                    >
                      +
                    </button>
                    <span style={{ marginLeft: 'auto', fontWeight: '600' }}>
                      Gs. {formatGsPY(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna 3: Contexto (Mesas / Terraza / Delivery) */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          {(modo === 'mesa' || modo === 'terraza') && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '600' }}>
                {modo === 'terraza' ? 'Mesas Terraza' : 'Mesas'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {(modo === 'terraza' ? mesasTerraza : mesas).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => abrirOMantenerPedidoMesa(m)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: m.estado === 'ocupada' ? '#fca5a5' : '#86efac',
                      color: m.estado === 'ocupada' ? '#7f1d1d' : '#14532d',
                      fontWeight: '600',
                      fontSize: '12px',
                      position: 'relative',
                    }}
                  >
                    {m.nombre}
                    {m.pedido_abierto_id && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          fontSize: '8px',
                          padding: '2px 4px',
                          borderRadius: '2px',
                        }}
                      >
                        ●
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {mesaSeleccionada && (
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
                  Mesa activa: <b>{mesaSeleccionada.nombre}</b>
                </p>
              )}
            </div>
          )}

          {modo === 'delivery' && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: '18px', fontWeight: '600' }}>Delivery</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  placeholder="Teléfono"
                  value={deliveryData.telefono}
                  onChange={(e) => setDeliveryData({ ...deliveryData, telefono: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <input
                  placeholder="Costo envío"
                  type="number"
                  min="0"
                  value={deliveryData.costo_envio}
                  onChange={(e) => setDeliveryData({ ...deliveryData, costo_envio: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <input
                  placeholder="Dirección"
                  value={deliveryData.direccion}
                  onChange={(e) => setDeliveryData({ ...deliveryData, direccion: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <input
                  placeholder="Referencia"
                  value={deliveryData.referencia}
                  onChange={(e) => setDeliveryData({ ...deliveryData, referencia: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <input
                  placeholder="Repartidor"
                  value={deliveryData.repartidor}
                  onChange={(e) => setDeliveryData({ ...deliveryData, repartidor: e.target.value })}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                />
                <button
                  onClick={abrirOMantenerPedidoDelivery}
                  style={{ padding: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Abrir pedido Delivery
                </button>
              </div>
              {pedidoId && (
                <p style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
                  Pedido activo: <strong>{pedidoId.slice(0, 8)}…</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Cliente */}
      {mostrarModalCliente && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setMostrarModalCliente(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Agregar Nuevo Cliente</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Nombre:</label>
              <input
                type="text"
                value={nuevoClienteData.nombre}
                onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, nombre: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>RUC:</label>
              <input
                type="text"
                value={nuevoClienteData.ruc}
                onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, ruc: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleGuardarNuevoCliente}
                style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setMostrarModalCliente(false);
                  setMensaje('');
                }}
                style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
