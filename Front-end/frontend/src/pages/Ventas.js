import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import styles from './CSS/Ventas.module.css';

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
  const [theme, setTheme] = useState('light');

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

  /* ====== Modo/pedido ====== */
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [cancelando, setCancelando] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  // Cambiar tema
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  useEffect(() => {
    if (!Array.isArray(productos)) {
      setCategorias([]);
      return;
    }
    const unicas = [...new Set(productos.map((p) => p?.categoria).filter(Boolean))];
    unicas.sort((a, b) => String(a).localeCompare(String(b), 'es'));
    setCategorias(unicas);
    if (categoriaFiltro && !unicas.includes(categoriaFiltro)) setCategoriaFiltro('');
  }, [productos, categoriaFiltro]);

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
    setShowClienteDropdown(false);
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
    setProductoBusqueda(`${prod.nombre} - Gs. ${formatGsPY(prod.precio)}`);
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
    // Validación 1: Verificar que haya productos
    if (!venta.detalles.length && !pedidoId) return setMensaje('Error: Agregue al menos un producto.');
    
    // Validación 2: Verificar que haya un cliente seleccionado
    if (!selectedCliente && !venta.cliente_id) {
      setMensaje('Error: Debe seleccionar un cliente antes de cobrar.');
      return;
    }
    
    if (procesando) return;
    setProcesando(true);
    
    try {
      let id;
      let pedidoIdACerrar = null;
      let mesaIdALiberar = null;
      
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
        if (!pedidoId) {
          setProcesando(false);
          return setMensaje('No hay pedido abierto para cobrar.');
        }
        
        const { data: dets } = await axios.get(`${API_URL}/pedidos/${pedidoId}/detalles`);
        if (!dets || dets.length === 0) {
          setProcesando(false);
          return setMensaje('Este pedido no tiene ítems. Agregue productos antes de facturar.');
        }
        
        pedidoIdACerrar = pedidoId;
        
        // Guardar el ID de la mesa para liberarla después
        if ((modo === 'mesa' || modo === 'terraza') && mesaSeleccionada) {
          mesaIdALiberar = mesaSeleccionada.id;
        }
        
        const res = await axios.post(`${API_URL}/ventas`, {
          pedido_id: pedidoId,
          metodo_pago: metodoPago,
        });
        id = res.data.id;
      }

      // Cerrar el pedido después de registrar la venta
      if (pedidoIdACerrar) {
        try {
          await axios.patch(`${API_URL}/pedidos/${pedidoIdACerrar}/estado`, { 
            estado: 'completado' 
          });
        } catch (e) {
          console.warn('No se pudo cerrar el pedido:', e);
        }
      }

      // Liberar la mesa explícitamente
      if (mesaIdALiberar) {
        try {
          await axios.patch(`${API_URL}/mesas/${mesaIdALiberar}`, {
            estado: 'libre',
            pedido_abierto_id: null
          });
        } catch (e) {
          console.warn('No se pudo liberar la mesa:', e);
        }
      }

      setMensaje('Venta registrada exitosamente.');
      
      try {
        window.open(`${API_URL}/factura/${id}?autoprint=1&close=1`, '_blank');
      } catch (e) {
        console.warn('No se pudo abrir factura', e);
      }

      // IMPORTANTE: Limpiar TODO antes de refrescar mesas
      resetearVenta();
      setPedidoId(null);
      setMesaSeleccionada(null);
      
      // Limpiar delivery si es el caso
      if (modo === 'delivery') {
        setDeliveryData({ 
          telefono: '', 
          direccion: '', 
          referencia: '', 
          costo_envio: 0, 
          repartidor: '' 
        });
      }

      // Refrescar mesas DESPUÉS de liberar
      if (modo === 'mesa' || modo === 'terraza') {
        try {
          // Pequeño delay para asegurar que el backend procesó todo
          await new Promise(resolve => setTimeout(resolve, 300));
          const m = await axios.get(`${API_URL}/mesas`);
          const { normal, terraza } = splitMesasPorTipo(m.data || []);
          setMesas(normal);
          setMesasTerraza(terraza);
        } catch (e) {
          console.warn('No se pudo refrescar mesas', e);
        }
      }
      
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

  /* ==================== UI ==================== */
  return (
    <div className={styles.ventasContainer}>
      {/* Botón cambio de tema */}
      <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Cambiar tema">
        <span>{theme === 'light' ? '🌙' : '☀️'}</span>
      </button>

      {/* Mensaje global */}
      {mensaje && (
        <div className={`${styles.messageBox} ${mensaje.startsWith('Error') ? styles.errorMessage : styles.successMessage}`}>
          {mensaje}
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className={styles.modeArea}>
            {/* Tabs de modo */}
            <div className={styles.modoTabs}>
              <button
                className={`${styles.tab} ${modo === 'mostrador' ? styles.tabActive : ''}`}
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
                className={`${styles.tab} ${modo === 'mesa' ? styles.tabActive : ''}`}
                onClick={() => {
                  setModo('mesa');
                  setPedidoId(null);
                  setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
                }}
              >
                Mesas
              </button>
              <button
                className={`${styles.tab} ${modo === 'terraza' ? styles.tabActive : ''}`}
                onClick={() => {
                  setModo('terraza');
                  setPedidoId(null);
                  setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
                }}
              >
                Terraza
              </button>
              <button
                className={`${styles.tab} ${modo === 'delivery' ? styles.tabActive : ''}`}
                onClick={() => {
                  setModo('delivery');
                  setPedidoId(null);
                  setDeliveryData({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
                }}
              >
                Delivery
              </button>
            </div>

            <p className={styles.modeBadge}>
              Modo: <strong>{modo.toUpperCase()}</strong>
              {modo !== 'mostrador' && pedidoId && (
                <> — Pedido: <strong>{pedidoId.slice(0, 8)}…</strong></>
              )}
              {(modo === 'mesa' || modo === 'terraza') && mesaSeleccionada && (
                <> — Mesa: <strong>{mesaSeleccionada.nombre}</strong></>
              )}
            </p>
          </div>

          <div className={styles.payArea}>
            <div className={styles.totalBox}>
              <span>Total</span>
              <strong>Gs. {formatGsPY(calcularTotal())}</strong>
            </div>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className={styles.payMethodSelect}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <button
              onClick={handleRegistrarVenta}
              disabled={procesando}
              className={styles.chargeButton}
            >
              {procesando ? 'Procesando…' : 'Cobrar'}
            </button>
            <button
              onClick={handleCancelarVenta}
              disabled={cancelando}
              className={styles.cancelButton}
            >
              {cancelando ? 'Cancelando…' : 'Cancelar'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.headerFilters}>
          <div className={styles.filterLeft}>
            <div className={styles.inputWithIconLarge}>
              <span>🔍</span>
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
              />
            </div>
            <div className={styles.categoryFilter}>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className={styles.categorySelect}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.filterRight}>
            <div className={styles.relative}>
              {selectedCliente ? (
                <div className={styles.clientPill}>
                  <span className={styles.clientName}>
                    {selectedCliente.nombre} {selectedCliente.ruc ? `· RUC ${selectedCliente.ruc}` : ''}
                  </span>
                  <button onClick={resetearCliente} className={styles.clientChangeBtn}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className={styles.clientSearchGroup}>
                  <div className={styles.inputWithIconLarge}>
                    <span>👤</span>
                    <input
                      type="text"
                      placeholder="Cliente (F3)..."
                      value={clienteBusqueda}
                      onChange={(e) => {
                        setClienteBusqueda(e.target.value);
                        setShowClienteDropdown(true);
                      }}
                      onFocus={() => setShowClienteDropdown(true)}
                      ref={clienteSearchInputRef}
                    />
                  </div>
                  <button onClick={seleccionarConsumidorFinal} className={styles.quickBtn}>
                    CF
                  </button>
                  {showClienteDropdown && finalClienteBusqueda && (
                    <ul className={styles.dropdownList}>
                      {clientesFiltrados.length > 0 ? (
                        clientesFiltrados.map((c) => (
                          <li
                            key={c.id}
                            onClick={() => handleSeleccionarCliente(c)}
                          >
                            {c.nombre} {c.ruc ? `- ${c.ruc}` : ''}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noResultsInline}>
                          <span>Sin coincidencias.</span>
                          <button
                            onClick={() => setMostrarModalCliente(true)}
                            className={styles.linkBtn}
                          >
                            Agregar nuevo
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid principal: 3 columnas */}
      <div className={styles.mainGrid}>
        {/* Columna 1: Productos */}
        <div className={styles.colCard}>
          <h2 className={styles.cardTitle}>Productos</h2>
          {productoBusqueda && !selectedProducto && (
            <ul className={styles.resultsList}>
              {Array.isArray(productosFiltrados) && productosFiltrados.length > 0 ? (
                productosFiltrados.map((prod, idx) => (
                  <li
                    key={prod.id}
                    onClick={() => handleSeleccionarProducto(prod)}
                    className={`${styles.resultItem} ${idx === activeIdx ? styles.resultActive : ''}`}
                  >
                    <div className={styles.resultName}>{prod.nombre}</div>
                    <div className={styles.resultMeta}>
                      <span>Gs. {formatGsPY(prod.precio)}</span>
                      <span className={styles.resultStock}>
                        Stock: {typeof prod.stock === 'number' ? prod.stock : '-'}
                      </span>
                    </div>
                  </li>
                ))
              ) : (
                <div className={styles.noResults}>No se encontró el producto.</div>
              )}
            </ul>
          )}

          {selectedProducto && (
            <div className={styles.selectedProductBox}>
              <div className={styles.selectedLine}>
                <strong>{selectedProducto.nombre}</strong>
                <span>Gs. {formatGsPY(selectedProducto.precio)}</span>
              </div>
              <div className={styles.selectedSub}>
                Stock: {typeof selectedProducto.stock === 'number' ? selectedProducto.stock : '-'}
              </div>
              <div className={styles.qtyRow}>
                <label>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(e.target.value)}
                />
                <button onClick={handleAddProducto} className={styles.addBtn}>
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Columna 2: Carrito */}
        <div className={`${styles.colCard} ${styles.cartCol}`}>
          <h2 className={styles.cardTitle}>Carrito</h2>
          {venta.detalles.length === 0 ? (
            <div className={styles.emptyCartMessage}>No se han agregado productos.</div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.cartTable}>
                  <thead>
                    <tr>
                      <th className={styles.thSticky}>Producto</th>
                      <th className={styles.thStickySmall}>Cantidad</th>
                      <th className={styles.thSticky}>Precio</th>
                      <th className={styles.thSticky}>Subtotal</th>
                      <th className={styles.thStickySmall}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {venta.detalles.map((item, idx) => (
                      <tr key={idx}>
                        <td className={styles.tdName}>{item.nombre}</td>
                        <td className={styles.tdQty}>
                          <button
                            onClick={() => handleEditCantidadProducto(idx, item.cantidad - 1)}
                            className={styles.qtyBtn}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleEditCantidadProducto(idx, e.target.value)}
                          />
                          <button
                            onClick={() => handleEditCantidadProducto(idx, item.cantidad + 1)}
                            className={styles.qtyBtn}
                          >
                            +
                          </button>
                        </td>
                        <td className={styles.tdMoney}>Gs. {formatGsPY(item.precio_unitario)}</td>
                        <td className={styles.tdMoney}>Gs. {formatGsPY(item.subtotal)}</td>
                        <td className={styles.tdActions}>
                          <button
                            onClick={() => handleRemoveProducto(idx)}
                            className={styles.removeBtn}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.cartFooterSticky}>
                <div>
                  <span>Total:</span>
                  <strong>Gs. {formatGsPY(calcularTotal())}</strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Columna 3: Contexto (Mesas/Terraza/Delivery) */}
        <div className={`${styles.colCard} ${styles.contextPanel}`}>
          {(modo === 'mesa' || modo === 'terraza') && (
            <div>
              <h2 className={styles.cardTitle}>
                {modo === 'terraza' ? 'Mesas Terraza' : 'Mesas'}
              </h2>
              <div className={styles.mesaGrid}>
                {(modo === 'terraza' ? mesasTerraza : mesas).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => abrirOMantenerPedidoMesa(m)}
                    className={`${styles.mesaBtn} ${
                      m.estado === 'ocupada' ? styles.mesaOcupada : styles.mesaLibre
                    }`}
                  >
                    {m.nombre}
                    {m.pedido_abierto_id && (
                      <span className={styles.mesaBadge}>●</span>
                    )}
                  </button>
                ))}
              </div>
              {mesaSeleccionada && (
                <p className={styles.smallTip}>
                  Mesa activa: <strong>{mesaSeleccionada.nombre}</strong>
                </p>
              )}
            </div>
          )}

          {modo === 'delivery' && (
            <div>
              <h2 className={styles.cardTitle}>Delivery</h2>
              <div className={styles.formGrid2}>
                <input
                  placeholder="Teléfono"
                  value={deliveryData.telefono}
                  onChange={(e) => setDeliveryData({ ...deliveryData, telefono: e.target.value })}
                />
                <input
                  placeholder="Costo envío"
                  type="number"
                  min="0"
                  value={deliveryData.costo_envio}
                  onChange={(e) => setDeliveryData({ ...deliveryData, costo_envio: e.target.value })}
                />
              </div>
              <div className={styles.formGrid2}>
                <input
                  placeholder="Dirección"
                  value={deliveryData.direccion}
                  onChange={(e) => setDeliveryData({ ...deliveryData, direccion: e.target.value })}
                />
                <input
                  placeholder="Referencia"
                  value={deliveryData.referencia}
                  onChange={(e) => setDeliveryData({ ...deliveryData, referencia: e.target.value })}
                />
              </div>
              <div className={styles.formGrid2}>
                <input
                  placeholder="Repartidor"
                  value={deliveryData.repartidor}
                  onChange={(e) => setDeliveryData({ ...deliveryData, repartidor: e.target.value })}
                />
              </div>
              <div className={styles.rowGap}>
                <button
                  onClick={abrirOMantenerPedidoDelivery}
                  className={styles.secondaryButtonSmall}
                >
                  Abrir pedido Delivery
                </button>
              </div>
              {pedidoId && (
                <p className={styles.smallTip}>
                  Pedido activo: <strong>{pedidoId.slice(0, 8)}…</strong>
                </p>
              )}
            </div>
          )}

          {modo === 'mostrador' && (
            <div>
              <h2 className={styles.cardTitle}>Información</h2>
              <p className={styles.smallTip}>
                Modo mostrador: venta directa sin pedido previo.
              </p>
              <h3 className={styles.subTitle}>Atajos de teclado</h3>
              <p className={styles.smallTip}>
                <strong>F2:</strong> Buscar producto
                <br />
                <strong>F3:</strong> Buscar cliente
                <br />
                <strong>↑/↓:</strong> Navegar productos
                <br />
                <strong>Enter:</strong> Agregar producto
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Cliente */}
      {mostrarModalCliente && (
        <div className={styles.modalOverlay} onClick={() => setMostrarModalCliente(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Agregar Nuevo Cliente</h3>
            <div className={styles.formGroup}>
              <label>Nombre:</label>
              <input
                type="text"
                value={nuevoClienteData.nombre}
                onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, nombre: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>RUC:</label>
              <input
                type="text"
                value={nuevoClienteData.ruc}
                onChange={(e) => setNuevoClienteData({ ...nuevoClienteData, ruc: e.target.value })}
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleGuardarNuevoCliente} className={styles.primaryButton}>
                Guardar
              </button>
              <button
                onClick={() => {
                  setMostrarModalCliente(false);
                  setMensaje('');
                }}
                className={styles.secondaryButton}
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