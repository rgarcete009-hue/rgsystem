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

/* ==================== ESC/POS + QZ (idéntico a tu versión) ==================== */
const ESC = '\x1B', GS = '\x1D', LF = '\x0A';
const INIT = ESC + '@';
const ALIGN_LEFT = ESC + 'a' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_RIGHT = ESC + 'a' + '\x02';
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const FONT_A = ESC + 'M' + '\x00';
const FONT_B = ESC + 'M' + '\x01';
const DBL_ON = GS + '!' + '\x11';
const DBL_OFF = GS + '!' + '\x00';
const CUT_FULL = GS + 'V' + '\x00';
const PULSE_DRAWER = ESC + 'p' + '\x00' + '\x3C' + '\x78';
const SELECT_CODEPAGE = (n) => ESC + 't' + String.fromCharCode(n);
const INTL_SET = (n) => ESC + 'R' + String.fromCharCode(n);
const QZ_ENCODING = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('qz_encoding')) || 'CP858';
const ESC_POS_CODEPAGE = parseInt((typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('escpos_codepage')) || '17', 10);
const formatearGs = (v) => Number(v).toLocaleString('es-PY');
const formatGsPY = (n) => Number(n).toLocaleString('es-PY');
const COLS = 48;
const HR = (ch = '-', width = COLS) => ch.repeat(width) + LF;
function buildLineItem({ desc, cant, precio, subtotal, cols = COLS }) {
  const mid = 12, right = 12, left = Math.max(10, cols - mid - right);
  const d = (desc ?? '').slice(0, left).padEnd(left, ' ');
  const m = `${cant} x ${formatGsPY(precio)}`.padStart(mid, ' ');
  const r = `${formatGsPY(subtotal)}`.padStart(right, ' ');
  return `${d}${m}${r}${LF}`;
}
function buildEscPosFromFacturaPayload(payload, { abrirGaveta } = { abrirGaveta: false }) {
  const emp = payload.empresa ?? {}; const v = payload.venta ?? {}; const detalles = payload.detalles ?? []; const tot = payload.totales ?? {};
  const header = INIT + FONT_A + SELECT_CODEPAGE(ESC_POS_CODEPAGE) + INTL_SET(3) + ALIGN_CENTER + BOLD_ON + DBL_ON + (emp.nombreEmpresa ?? '') + LF + DBL_OFF + BOLD_OFF + (emp.ruc ? `RUC: ${emp.ruc}${LF}` : '') + (emp.timbradoNo ? `Timbrado: ${emp.timbradoNo}${LF}` : '') + (emp.timbradoValidoDesde ? `Válido: ${emp.timbradoValidoDesde} a ${emp.timbradoValidoHasta}${LF}` : '') + `Factura N°: ${v.numero_factura ?? 'N/A'}` + LF + HR('-');
  const body = detalles.map((d) => buildLineItem({ desc: d.descripcion, cant: d.cantidad, precio: d.precio_unitario, subtotal: d.subtotal, cols: COLS })).join('');
  const totales = HR('-') + ALIGN_LEFT + (Number(v.costo_envio ?? 0) ? `Costo envío: Gs. ${formatGsPY(v.costo_envio)}${LF}` : '') + ALIGN_RIGHT + BOLD_ON + `TOTAL Gs. ${formatGsPY(tot.totalPagar ?? 0)}` + LF + BOLD_OFF + ALIGN_LEFT;
  const footer = LF + `Cliente: ${(v.cliente && v.cliente.nombre) ?? ''} - RUC: ${(v.cliente && v.cliente.ruc) ?? ''}` + LF + `Fecha: ${v.fecha ?? ''}` + LF + `Método: ${v.metodo_pago ?? ''}` + LF + LF + ALIGN_CENTER + '¡Gracias por su compra !' + LF + ALIGN_LEFT + LF + LF + CUT_FULL + (abrirGaveta ? PULSE_DRAWER : '');
  return [{ type: 'raw', format: 'command', data: header + body + totales + footer }];
}
let qzConnecting = null;
async function ensureQZConnected() { const qz = window.qz; if (!qz) throw new Error('QZ no disponible en esta PC'); if (qz.websocket.isActive()) return; if (qzConnecting) return qzConnecting; qzConnecting = qz.websocket.connect({ retries: 3, delay: 1 }).catch((e)=>{ throw e; }).finally(()=>{ qzConnecting=null;}); return qzConnecting; }
async function tryQZPrintFactura({ apiUrl, ventaId, abrirGaveta }) { const { data: payload } = await axios.get(`${apiUrl}/factura/${ventaId}/datos`); await ensureQZConnected(); const qz = window.qz; const printer = await qz.printers.getDefault(); const cfg = qz.configs.create(printer, { encoding: QZ_ENCODING }); const data = buildEscPosFromFacturaPayload(payload, { abrirGaveta }); await qz.print(cfg, data); }

/* ==================== Utils ==================== */
function useDebounce(value, delay) { const [debounced, setDebounced] = useState(value); useEffect(()=>{ const h=setTimeout(()=>setDebounced(value),delay); return ()=>clearTimeout(h);},[value,delay]); return debounced; }
function normalizeTxt(s=''){ return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim(); }
function useScanner(onScan,{timeoutMs=100,minLen=6}={}){ const bufRef=useRef(''); const lastTsRef=useRef(0); useEffect(()=>{ const handle=(e)=>{ const ae=document.activeElement; const isTyping=ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable); if(isTyping) return; const key=typeof e.key==='string'?e.key:''; const now=Date.now(); const delta=now-lastTsRef.current; lastTsRef.current=now; if(delta>timeoutMs) bufRef.current=''; if(key==='Enter'){ const data=bufRef.current; bufRef.current=''; if(data&&new RegExp(`^[A-Za-z0-9\\-]{${minLen},}$`).test(String(data))){ try{onScan(data);}catch{} e.preventDefault(); } return;} if(key&&key.length===1) bufRef.current+=key; }; window.addEventListener('keydown',handle,true); return ()=>window.removeEventListener('keydown',handle,true); },[onScan,timeoutMs,minLen]); }
function extractQtyFromQuery(q){ const m=String(q??'').match(/^(.*?)(?:\s*(x|\*)\s*(\d+))$/i); return m?.[3]?parseInt(m[3],10):1; }

/* ==================== Componente ==================== */
const Ventas = () => {
  const { triggerRefresh } = useRefresh();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [venta, setVenta] = useState({ cliente_id: null, detalles: [] });
  const [mensaje, setMensaje] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [procesando, setProcesando] = useState(false);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [ventasHoy, setVentasHoy] = useState([]);
  const [totalVentasHoy, setTotalVentasHoy] = useState(0);
  const [ventasHoyPorMetodo, setVentasHoyPorMetodo] = useState({});
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoClienteData, setNuevoClienteData] = useState({ nombre: '', ruc: '' });
  const [mostrarCierreCaja, setMostrarCierreCaja] = useState(false);
  const finalClienteBusqueda = useDebounce(clienteBusqueda, 300);
  const finalProductoBusqueda = useDebounce(productoBusqueda, 300);
  const productoSearchInputRef = useRef(null);
  const clienteSearchInputRef = useRef(null);
  const [modo, setModo] = useState('mostrador'); // 'mostrador' | 'mesa' | 'terraza' | 'delivery'
  const [mesas, setMesas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [pedidoId, setPedidoId] = useState(null);
  const [deliveryData, setDeliveryData] = useState({ telefono: '', direccion: '', referencia: '', costo_envio: 0, repartidor: '' });
  const [deliveryActivos, setDeliveryActivos] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [cancelando, setCancelando] = useState(false);

  useEffect(()=>{ axios.get(`${API_URL}/clientes`).then(r=>setClientes(r.data)).catch(e=>console.error(e)); axios.get(`${API_URL}/productos`).then(r=>setProductos(r.data)).catch(e=>console.error(e)); fetchVentasHoy(); },[]);
  useEffect(()=>{ if(mensaje){ const t=setTimeout(()=>setMensaje(''),5000); return()=>clearTimeout(t);} },[mensaje]);

  // Carga/ordenación de mesas por modo
  useEffect(()=>{ if(modo==='mesa' || modo==='terraza'){ axios.get(`${API_URL}/mesas`,{ params:{ tipo: (modo==='terraza'?'terraza':'mesa') } }).then((r)=>{ const ordenadas=r.data.sort((a,b)=>{ const numA=parseInt(a.nombre.match(/\d+/)?.[0]??'0',10); const numB=parseInt(b.nombre.match(/\d+/)?.[0]??'0',10); return numA-numB;}); setMesas(ordenadas); }).catch(e=>console.error(e)); } },[modo]);

  // Refresco periódico de mesas
  useEffect(()=>{ if(modo!=='mesa' && modo!=='terraza') return; const t=setInterval(async()=>{ try{ const m=await axios.get(`${API_URL}/mesas`,{ params:{ tipo: (modo==='terraza'?'terraza':'mesa') } }); const ord=m.data.sort((a,b)=>{ const numA=parseInt(a.nombre.replace(/[^0-9]/g,''),10)||0; const numB=parseInt(b.nombre.replace(/[^0-9]/g,''),10)||0; return numA-numB;}); setMesas(ord);}catch{} },8000); return()=>clearInterval(t); },[modo]);

  // Refresco delivery
  useEffect(()=>{ if(modo!=='delivery') return; const t=setInterval(fetchDeliveryActivos,10000); return()=>clearInterval(t); },[modo]);
  async function fetchDeliveryActivos(){ try{ const {data}=await axios.get(`${API_URL}/pedidos`,{ params:{ tipo:'delivery', estado:'abierto'} }); setDeliveryActivos(Array.isArray(data)?data:[]);}catch{ setDeliveryActivos([]);} }

  useEffect(()=>{ if(!Array.isArray(productos)){ setCategorias([]); return;} const unicas=[...new Set(productos.map(p=>p?.categoria).filter(Boolean))]; unicas.sort((a,b)=>String(a).localeCompare(String(b),'es')); setCategorias(unicas); if(categoriaFiltro && !unicas.includes(categoriaFiltro)) setCategoriaFiltro(''); },[productos]);

  const productosFiltrados = useMemo(()=>{ const q=normalizeTxt(finalProductoBusqueda); const base=(Array.isArray(productos)?productos:[]).filter((p)=>{ if(!categoriaFiltro) return true; return String(p?.categoria??'')===String(categoriaFiltro); }); if(!q) return base; const term=q; return base.filter((p)=>{ const nombre=normalizeTxt(p?.nombre??''); const codigo=normalizeTxt(p?.codigo??''); const codigoBarra=normalizeTxt(p?.codigo_barra??''); const codigoProducto=normalizeTxt(p?.codigo_producto??''); const barcode=p?.barcode?String(p.barcode):''; return (nombre.includes(term) || (term&&codigo.includes(term)) || (term&&codigoBarra.includes(term)) || (term&&codigoProducto.includes(term)) || (term&&barcode.includes(term))); }).sort((a,b)=>{ const A=normalizeTxt(a?.nombre??''), Bn=normalizeTxt(b?.nombre??''); const aS=A.startsWith(term)?0:1, bS=Bn.startsWith(term)?0:1; if(aS!==bS) return aS-bS; return A.indexOf(term)-Bn.indexOf(term); }); },[finalProductoBusqueda, productos, categoriaFiltro]);
  useEffect(()=>setActiveIdx(0),[finalProductoBusqueda, productosFiltrados.length]);

  useEffect(()=>{ const onKey=(e)=>{ if(e.key==='F2'){ e.preventDefault(); productoSearchInputRef.current?.focus(); } if(e.key==='F3'){ e.preventDefault(); clienteSearchInputRef.current?.focus(); } if(e.key==='Escape' && productoBusqueda){ setProductoBusqueda(''); setSelectedProducto(null); setActiveIdx(0); productoSearchInputRef.current?.focus(); } if(e.key==='Enter' && e.ctrlKey){ e.preventDefault(); handleRegistrarVenta(); } }; window.addEventListener('keydown',onKey); return()=>window.removeEventListener('keydown',onKey); },[productoBusqueda]);

  useScanner((code)=>{ const prod=productos.find((p)=> String(p?.codigo_barra ?? p?.codigo_producto ?? p?.barcode ?? p?.codigo ?? p?.id)===String(code)); if(prod) addProductoDirecto(prod,1); else setMensaje(`No se encontró producto para código ${code}`); });

  const clientesFiltrados = clientes.filter(({nombre, ruc})=>{ const t=finalClienteBusqueda.toLowerCase(); return (nombre??'').toLowerCase().includes(t) || (ruc && ruc.toLowerCase().includes(t)); });

  const handleSeleccionarCliente=(cliente)=>{ setSelectedCliente(cliente); setVenta({ ...venta, cliente_id: cliente.id }); const text=`${cliente.nombre}${cliente.ruc?` - ${cliente.ruc}`:''}`; setClienteBusqueda(text); setTimeout(()=>setClienteBusqueda(text),100); };
  const seleccionarConsumidorFinal=()=>{ const cf=clientes.find((c)=> (c.ruc && String(c.ruc).trim()==='0') || (c.nombre && c.nombre.trim().toLowerCase()==='consumidor final')); if(!cf) return setMensaje('No se encontró el cliente "Consumidor Final" (RUC 0).'); handleSeleccionarCliente(cf); };

  const handleSeleccionarProducto=(prod)=>{ setSelectedProducto(prod); setProductoBusqueda(`${prod.nombre} - Gs. ${formatearGs(prod.precio)}`); setCantidadProducto(1); };

  async function addProductoDirecto(prod, qty=1){ const cantidad=Number(qty); if(!prod || isNaN(cantidad) || cantidad<=0) return setMensaje('Selección o cantidad inválida.'); const precioUnitario=parseInt(prod.precio,10); if(isNaN(precioUnitario) || precioUnitario<0) return setMensaje('Precio unitario inválido.'); if(typeof prod.stock==='number' && prod.stock<cantidad) return setMensaje(`Stock insuficiente para ${prod.nombre}. Stock disponible: ${prod.stock}`);
    setVenta((prev)=>{ const idx=prev.detalles.findIndex((it)=>it.producto_id===prod.id); if(idx>-1){ const newDetalles=prev.detalles.map((it,i)=>{ if(i!==idx) return it; const newCant=it.cantidad+cantidad; if(typeof prod.stock==='number' && prod.stock<newCant){ setMensaje(`Stock insuficiente para ${prod.nombre} con la nueva cantidad. Stock: ${prod.stock}`); return it; } return { ...it, cantidad:newCant, subtotal: it.precio_unitario*newCant };}); return { ...prev, detalles:newDetalles }; } else { const detalle={ producto_id: prod.id, nombre: prod.nombre, cantidad, precio_unitario: precioUnitario, subtotal: precioUnitario*cantidad }; return { ...prev, detalles:[...prev.detalles, detalle] }; } });
    if(modo!=='mostrador'){
      let pid=pedidoId;
      if(modo==='mesa' && mesaSeleccionada && !pid){ pid=await abrirOMantenerPedidoMesa(mesaSeleccionada); setPedidoId(pid); }
      if(modo==='terraza' && mesaSeleccionada && !pid){ pid=await abrirOMantenerPedidoTerraza(mesaSeleccionada); setPedidoId(pid); }
      if(modo==='delivery' && !pid){ pid=await abrirOMantenerPedidoDelivery(); setPedidoId(pid); }
      if(pid){ try{ await axios.post(`${API_URL}/pedidos/${pid}/detalles`,{ items:[{ producto_id: prod.id, nombre: prod.nombre, cantidad: Number(qty), precio_unitario: precioUnitario, subtotal: precioUnitario*Number(qty) }] }); } catch(e){ console.warn('Error enviando comanda',e); setMensaje(`No se pudo enviar comanda: ${e?.response?.data?.message ?? e.message}`);} }
    }
    setMensaje(''); setProductoBusqueda(''); setSelectedProducto(null); setCantidadProducto(1); productoSearchInputRef.current?.focus(); }

  const handleAddProducto=()=>{ if(!selectedProducto) return setMensaje('Por favor, seleccione un producto'); addProductoDirecto(selectedProducto, cantidadProducto); };
  const handleRemoveProducto=(i)=>{ setVenta((prev)=>({ ...prev, detalles: prev.detalles.filter((_,idx)=>idx!==i) })); setMensaje('Producto eliminado del carrito.'); };
  const handleEditCantidadProducto=(i,v)=>{ const n=Number(v); if(isNaN(n)||n<=0){ setMensaje('La cantidad debe ser un número positivo.'); return;} setVenta((prev)=>({ ...prev, detalles: prev.detalles.map((item,idx)=>{ if(idx===i){ const original=productos.find((p)=>p.id===item.producto_id); if(original && typeof original.stock==='number' && original.stock<n){ setMensaje(`Stock insuficiente para ${item.nombre}. Stock: ${original.stock}`); return item;} return { ...item, cantidad:n, subtotal: item.precio_unitario*n }; } return item; }) })); setMensaje(''); };
  const calcularTotal=()=> venta.detalles.reduce((acc,{subtotal})=>acc+subtotal,0);

  const resetearVenta=()=>{ setVenta({ cliente_id: null, detalles: [] }); setSelectedCliente(null); setClienteBusqueda(''); setSelectedProducto(null); setProductoBusqueda(''); setCantidadProducto(1); setMetodoPago('efectivo'); setMensaje(''); if(modo!=='mostrador'){ setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); setMesaSeleccionada(null);} };
  const resetearCliente=()=>{ setSelectedCliente(null); setVenta((v)=>({ ...v, cliente_id: null })); setClienteBusqueda(''); };

  const handleGuardarNuevoCliente=async()=>{ try{ if(!nuevoClienteData.nombre?.trim() || !nuevoClienteData.ruc?.trim()){ setMensaje('Error: Nombre y RUC del cliente son obligatorios.'); return;} const res=await axios.post(`${API_URL}/clientes`, nuevoClienteData); setClientes((prev)=>[...prev, res.data]); handleSeleccionarCliente(res.data); setMensaje('Cliente agregado y seleccionado exitosamente.'); setMostrarModalCliente(false); setNuevoClienteData({ nombre:'', ruc:'' }); } catch(err){ const msg=err?.response?.data?.message ?? err.message; setMensaje('Error al agregar nuevo cliente: '+msg);} };

  const handleRegistrarVenta=async()=>{ if(!venta.detalles.length && !pedidoId) return setMensaje('Error: Agregue al menos un producto.'); if(procesando) return; setProcesando(true); try{ let id; if(modo==='mostrador'){ const body={ cliente_id: (venta.cliente_id || selectedCliente?.id || null), metodo_pago: metodoPago, total: calcularTotal(), detalles: venta.detalles }; const res=await axios.post(`${API_URL}/ventas`, body); id=res.data.id; } else { if(!pedidoId) return setMensaje('No hay pedido abierto para cobrar.'); const { data:dets }=await axios.get(`${API_URL}/pedidos/${pedidoId}/detalles`); if(!dets || dets.length===0) return setMensaje('Este pedido no tiene ítems. Agregue productos antes de facturar.'); const res=await axios.post(`${API_URL}/ventas`, { pedido_id: pedidoId, metodo_pago: metodoPago }); id=res.data.id; }
    setMensaje('Venta registrada exitosamente. Imprimiendo ticket...'); try{ await tryQZPrintFactura({ apiUrl: API_URL, ventaId: id, abrirGaveta: metodoPago==='efectivo' }); }catch(e){ console.warn('QZ no disponible. Fallback HTML:', e?.message ?? e); window.open(`${API_URL}/factura/${id}?autoprint=1&close=1`, '_blank'); }
    if(modo==='mesa' || modo==='terraza'){ try{ const m=await axios.get(`${API_URL}/mesas`,{ params:{ tipo: (modo==='terraza'?'terraza':'mesa') } }); const ord=m.data.sort((a,b)=>{ const numA=parseInt(a.nombre.replace(/[^0-9]/g,''),10)||0; const numB=parseInt(b.nombre.replace(/[^0-9]/g,''),10)||0; return numA-numB;}); setMesas(ord);}catch(e){ console.warn('No se pudo refrescar mesas', e);} setMesaSeleccionada(null); setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); }
    if(modo==='delivery'){ await fetchDeliveryActivos(); setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); }
    resetearVenta(); fetchVentasHoy(); triggerRefresh();
  } catch(err){ const errorMsg=err.response?.data?.message ?? err.response?.data?.error ?? err.message; setMensaje(`Error al registrar la venta: ${errorMsg}`);} finally{ setProcesando(false);} };

  const fetchVentasHoy=async()=>{ const hoy=new Date().toISOString().split('T')[0]; try{ const { data }=await axios.get(`${API_URL}/ventas`,{ params:{ desde:hoy, hasta:hoy } }); let total=0; const porMetodo={}; data.forEach(({metodo_pago, total:ventaTotal})=>{ total+=Number(ventaTotal); porMetodo[metodo_pago]=(porMetodo[metodo_pago]??0)+Number(ventaTotal); }); setVentasHoy(data); setTotalVentasHoy(total); setVentasHoyPorMetodo(porMetodo);} catch(err){ console.error('Error al obtener ventas del día:', err); setMensaje('Error al cargar ventas del día.'); } };

  async function abrirOMantenerPedidoMesa(mesa){ try{ setMesaSeleccionada(mesa); if(mesa.pedido_abierto_id){ const pid=mesa.pedido_abierto_id; setPedidoId(pid); const { data }=await axios.get(`${API_URL}/pedidos/${pid}/detalles`); setVenta((prev)=>({ ...prev, detalles: data.map(mapPedidoDetalleToLinea) })); setMensaje(`Pedido Mesa abierto: ${pid.slice(0,8)}…`); return pid; } else { const { data }=await axios.post(`${API_URL}/pedidos`, { tipo:'mesa', mesa_id: mesa.id, cliente_id: (venta.cliente_id || selectedCliente?.id || null) }); setPedidoId(data.id); setVenta((prev)=>({ ...prev, detalles: [] })); setMensaje(`Pedido Mesa creado: ${data.id.slice(0,8)}…`); try{ const m=await axios.get(`${API_URL}/mesas`,{ params:{ tipo:'mesa' } }); const ordenadas=m.data.sort((a,b)=>{ const numA=parseInt(a.nombre.replace(/[^0-9]/g,''),10)||0; const numB=parseInt(b.nombre.replace(/[^0-9]/g,''),10)||0; return numA-numB;}); setMesas(ordenadas);}catch{} return data.id; } } catch(e){ const msg=e?.response?.data?.message ?? e.message; setMensaje(`Error al abrir pedido Mesa: ${msg}`); return null; } }

  async function abrirOMantenerPedidoTerraza(mesa){ try{ setMesaSeleccionada(mesa); if(mesa.pedido_abierto_id){ const pid=mesa.pedido_abierto_id; setPedidoId(pid); const { data }=await axios.get(`${API_URL}/pedidos/${pid}/detalles`); setVenta((prev)=>({ ...prev, detalles: data.map(mapPedidoDetalleToLinea) })); setMensaje(`Pedido Terraza abierto: ${pid.slice(0,8)}…`); return pid; } else { const { data }=await axios.post(`${API_URL}/pedidos`, { tipo:'terraza', mesa_id: mesa.id, cliente_id: (venta.cliente_id || selectedCliente?.id || null) }); setPedidoId(data.id); setVenta((prev)=>({ ...prev, detalles: [] })); setMensaje(`Pedido Terraza creado: ${data.id.slice(0,8)}…`); try{ const resp=await axios.get(`${API_URL}/mesas`,{ params:{ tipo:'terraza' } }); const ord=resp.data.sort((a,b)=>{ const numA=parseInt(a.nombre.replace(/[^0-9]/g,''),10)||0; const numB=parseInt(b.nombre.replace(/[^0-9]/g,''),10)||0; return numA-numB;}); setMesas(ord);}catch{} return data.id; } } catch(e){ const msg=e?.response?.data?.message ?? e.message; setMensaje(`Error al abrir pedido Terraza: ${msg}`); return null; } }

  function mapPedidoDetalleToLinea(d){ return { producto_id: d.producto_id, nombre: d.nombre, cantidad: d.cantidad, precio_unitario: d.precio_unitario, subtotal: d.subtotal }; }

  async function seleccionarDeliveryActivo(p){ try{ setPedidoId(p.id); setDeliveryData({ telefono: p.delivery_telefono ?? '', direccion: p.delivery_direccion ?? '', referencia: p.delivery_referencia ?? '', costo_envio: p.costo_envio ?? 0, repartidor: p.delivery_nombre ?? '', }); const { data }=await axios.get(`${API_URL}/pedidos/${p.id}/detalles`); setVenta((prev)=>({ ...prev, detalles: data.map(mapPedidoDetalleToLinea) })); setMensaje(`Reanudaste Delivery: ${p.id.slice(0,8)}…`);} catch(e){ setMensaje(`No se pudo cargar el pedido: ${e?.response?.data?.message ?? e.message}`);} }

  async function marcarDeliveryEstado(nuevo){ if(!pedidoId) return setMensaje('No hay delivery seleccionado.'); try{ await axios.patch(`${API_URL}/pedidos/${pedidoId}/estado`, { estado: nuevo }); setMensaje(`Delivery marcado como ${nuevo}.`); await fetchDeliveryActivos(); } catch(e){ setMensaje(`No se pudo actualizar estado: ${e?.response?.data?.message ?? e.message}`); } }

  async function handleCancelarVenta(){ if(cancelando) return; const titulo=(modo==='mesa'||modo==='terraza')?'Cancelar venta y cerrar la mesa':(modo==='delivery')?'Cancelar venta y cerrar el delivery':'Cancelar venta'; const ok=window.confirm(`${titulo}.\n¿Está seguro?`); if(!ok) return; setCancelando(true); try{ if((modo==='mesa'||modo==='terraza'||modo==='delivery') && pedidoId){ try{ const { data:dets }=await axios.get(`${API_URL}/pedidos/${pedidoId}/detalles`); const tieneItems=Array.isArray(dets)&&dets.length>0; const mensaje2=tieneItems?'El pedido tiene ítems cargados. Esto lo cancelará y liberará la mesa/delivery. ¿Desea continuar?':'Esto cancelará el pedido y liberará la mesa/delivery. ¿Desea continuar?'; const ok2=window.confirm(mensaje2); if(!ok2){ setCancelando(false); return;} await axios.patch(`${API_URL}/pedidos/${pedidoId}/estado`, { estado:'cancelado' }); if(modo==='mesa'||modo==='terraza'){ try{ const m=await axios.get(`${API_URL}/mesas`,{ params:{ tipo: (modo==='terraza'?'terraza':'mesa') } }); const ord=m.data.sort((a,b)=>{ const numA=parseInt(a.nombre.replace(/[^0-9]/g,''),10)||0; const numB=parseInt(b.nombre.replace(/[^0-9]/g,''),10)||0; return numA-numB;}); setMesas(ord);}catch{} setMesaSeleccionada(null); } else if(modo==='delivery'){ await fetchDeliveryActivos(); } setMensaje('Pedido cancelado correctamente.'); } catch(e){ setMensaje(`No se pudo cancelar el pedido: ${e?.response?.data?.message ?? e.message}`); return; } }
    resetearVenta(); setPedidoId(null); if(modo==='delivery'){ setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); }
  } finally{ setCancelando(false); } }

  const onProductoSearchKeyDown=(e)=>{ if(!Array.isArray(productosFiltrados) || productosFiltrados.length===0) return; if(e.key==='ArrowDown'){ e.preventDefault(); setActiveIdx((i)=>Math.min(i+1, productosFiltrados.length-1)); } if(e.key==='ArrowUp'){ e.preventDefault(); setActiveIdx((i)=>Math.max(i-1, 0)); } if(e.key==='Enter'){ e.preventDefault(); const qty=extractQtyFromQuery(productoBusqueda); const prod=productosFiltrados[activeIdx]; if(prod) addProductoDirecto(prod, qty); } };

  const ModoTabs=()=> (
    <div className={styles.modoTabs}>
      <button className={`${styles.tab} ${modo==='mostrador'?styles.tabActive:''}`} onClick={()=>{ setModo('mostrador'); setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); setMesaSeleccionada(null); }}>Mostrador</button>
      <button className={`${styles.tab} ${modo==='mesa'?styles.tabActive:''}`} onClick={()=>{ setModo('mesa'); setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); }}>Mesas</button>
      <button className={`${styles.tab} ${modo==='terraza'?styles.tabActive:''}`} onClick={()=>{ setModo('terraza'); setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); setMesaSeleccionada(null); }}>Terraza</button>
      <button className={`${styles.tab} ${modo==='delivery'?styles.tabActive:''}`} onClick={()=>{ setModo('delivery'); setPedidoId(null); setDeliveryData({ telefono:'', direccion:'', referencia:'', costo_envio:0, repartidor:'' }); }}>Delivery</button>
    </div>
  );

  return (
    <div className={styles.ventasContainer}>
      {mensaje && (<div role="status" aria-live="polite" className={`${styles.messageBox} ${mensaje.startsWith('Error')?styles.errorMessage:styles.successMessage}`}>{mensaje}</div>)}
      <header className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className={styles.modeArea}>
            <ModoTabs />
            <p className={styles.modeBadge}>
              Modo: <strong>{modo.toUpperCase()}</strong>
              {modo!=='mostrador' && pedidoId ? <> — Pedido: <strong>{pedidoId.slice(0,8)}…</strong></> : null}
              {(modo==='mesa'||modo==='terraza') && mesaSeleccionada ? <> — Mesa: <strong>{/^mesa\s/i.test(String(mesaSeleccionada.nombre))? mesaSeleccionada.nombre : `Mesa ${mesaSeleccionada.nombre}`}</strong></> : null}
            </p>
          </div>
          <div className={styles.payArea}>
            <div className={styles.totalBox}><span>Total</span><strong>Gs. {formatearGs(calcularTotal())}</strong></div>
            <select value={metodoPago} onChange={(e)=>setMetodoPago(e.target.value)} className={styles.payMethodSelect}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <button onClick={handleRegistrarVenta} className={styles.chargeButton} disabled={procesando}>{procesando?'Procesando…':'Cobrar (Ctrl+Enter)'}</button>
            <button onClick={handleCancelarVenta} className={styles.cancelButton} disabled={cancelando}>{cancelando?'Cancelando…':'Cancelar'}</button>
            <button onClick={()=>setMostrarCierreCaja(true)} className={styles.cierreCajaBtn}>Cierre de Caja</button>
          </div>
        </div>
        <div className={styles.headerFilters}>
          <div className={styles.filterLeft}>
            <div className={styles.inputWithIconLarge}>
              <input type="text" placeholder="Buscar/escanee producto (F2)." value={productoBusqueda} onChange={(e)=>{ setProductoBusqueda(e.target.value); setSelectedProducto(null); }} onKeyDown={onProductoSearchKeyDown} ref={productoSearchInputRef} />
              <span>🔍</span>
            </div>
            <div className={styles.categoryFilter}>
              <select value={categoriaFiltro} onChange={(e)=>setCategoriaFiltro(e.target.value)} className={styles.categorySelect} title="Filtrar por categoría">
                <option value="">Todas las categorías</option>
                {categorias.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
          <div className={`${styles.filterRight} ${styles.relative}`}>
            {selectedCliente ? (
              <div className={styles.clientPill}>
                <span className={styles.clientName}>{selectedCliente.nombre} {selectedCliente.ruc?`· RUC ${selectedCliente.ruc}`:''}</span>
                <button onClick={resetearCliente} className={styles.clientChangeBtn}>Cambiar</button>
              </div>
            ) : (
              <div className={`${styles.clientSearchGroup} ${styles.relative}`}>
                <div className={styles.inputWithIconLarge}>
                  <input type="text" placeholder="Cliente por RUC o Nombre (F3)" value={clienteBusqueda} onChange={(e)=>setClienteBusqueda(e.target.value)} ref={clienteSearchInputRef} />
                  <span>👤</span>
                </div>
                {finalClienteBusqueda && (
                  <ul className={styles.dropdownList}>
                    {clientesFiltrados.length>0 ? (
                      clientesFiltrados.map((c)=>(<li key={c.id} onClick={()=>handleSeleccionarCliente(c)}>{c.nombre} {c.ruc?`- ${c.ruc}`:''}</li>))
                    ) : (
                      <li className={styles.noResultsInline}>Sin coincidencias. <button onClick={()=>setMostrarModalCliente(true)} className={styles.linkBtn}>Agregar nuevo</button></li>
                    )}
                  </ul>
                )}
                <button onClick={seleccionarConsumidorFinal} className={styles.quickBtn}>Consumidor Final</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        <section className={styles.colCard}>
          <h2 className={styles.cardTitle}>Productos</h2>
          {productoBusqueda && !selectedProducto && (
            <ul className={styles.resultsList}>
              {Array.isArray(productosFiltrados) && productosFiltrados.length>0 ? (
                productosFiltrados.map((prod, idx)=>(
                  <li key={prod.id} onClick={()=>handleSeleccionarProducto(prod)} className={`${styles.resultItem} ${idx===activeIdx?styles.resultActive:''}`}>
                    <div className={styles.resultName}>{prod.nombre}</div>
                    <div className={styles.resultMeta}><span>Gs. {formatearGs(prod.precio)}</span><span className={styles.resultStock}>Stock: {typeof prod.stock==='number'?prod.stock:'-'}</span></div>
                  </li>
                ))
              ) : (<p className={styles.noResults}>No se encontró el producto.</p>)}
            </ul>
          )}
          {selectedProducto && (
            <div className={styles.selectedProductBox}>
              <div className={styles.selectedLine}><strong>{selectedProducto.nombre}</strong><span>Gs. {formatearGs(selectedProducto.precio)}</span></div>
              <div className={styles.selectedSub}>Stock: {typeof selectedProducto.stock==='number'?selectedProducto.stock:'-'}</div>
              <div className={styles.qtyRow}><label>Cant.</label><input type="number" min="1" value={cantidadProducto} onChange={(e)=>setCantidadProducto(e.target.value)} /><button onClick={handleAddProducto} className={styles.addBtn}>Agregar</button></div>
            </div>
          )}
        </section>

        <section className={`${styles.colCard} ${styles.cartCol}`}>
          <h2 className={styles.cardTitle}>Carrito</h2>
          {venta.detalles.length===0 ? (<p className={styles.emptyCartMessage}>No se han agregado productos.</p>) : (
            <div className={styles.tableWrap}>
              <table className={styles.cartTable}>
                <thead><tr><th className={styles.thSticky}>Producto</th><th className={styles.thStickySmall}>Cant.</th><th className={styles.thStickySmall}>Subtotal</th><th className={styles.thStickySmall}></th></tr></thead>
                <tbody>
                  {venta.detalles.map((item, idx)=>(
                    <tr key={idx}>
                      <td className={styles.tdName}>{item.nombre}</td>
                      <td className={styles.tdQty}>
                        <button className={styles.qtyBtn} onClick={()=>handleEditCantidadProducto(idx, item.cantidad-1)}>-</button>
                        <input type="number" min="1" value={item.cantidad} onChange={(e)=>handleEditCantidadProducto(idx, e.target.value)} />
                        <button className={styles.qtyBtn} onClick={()=>handleEditCantidadProducto(idx, item.cantidad+1)}>+</button>
                      </td>
                      <td className={styles.tdMoney}>Gs. {formatearGs(item.subtotal)}</td>
                      <td className={styles.tdActions}><button onClick={()=>handleRemoveProducto(idx)} className={styles.removeBtn}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.cartFooterSticky}><div><span>Total:</span> <strong>Gs. {formatearGs(calcularTotal())}</strong></div></div>
        </section>

        <section className={styles.colCard}>
          {modo==='mesa' && (
            <div className={styles.contextPanel}>
              <h2 className={styles.cardTitle}>Mesas</h2>
              <div className={styles.mesaGrid}>
                {mesas.map((m)=>(
                  <button key={m.id} className={`${styles.mesaBtn} ${m.estado==='ocupada'?styles.mesaOcupada:styles.mesaLibre}`} onClick={()=>abrirOMantenerPedidoMesa(m)}>
                    {/^mesa\s/i.test(String(m.nombre))? m.nombre : `Mesa ${m.nombre}`}
                    {m.pedido_abierto_id && <span className={styles.mesaBadge}>Abierta</span>}
                  </button>
                ))}
              </div>
              {mesaSeleccionada && <p className={styles.smallTip}>Mesa activa: <b>{/^mesa\s/i.test(String(mesaSeleccionada.nombre))? mesaSeleccionada.nombre : `Mesa ${mesaSeleccionada.nombre}`}</b></p>}
            </div>
          )}

          {modo==='terraza' && (
            <div className={styles.contextPanel}>
              <h2 className={styles.cardTitle}>Terraza</h2>
              <div className={styles.mesaGrid}>
                {mesas.map((m)=>(
                  <button key={m.id} className={`${styles.mesaBtn} ${m.estado==='ocupada'?styles.mesaOcupada:styles.mesaLibre}`} onClick={()=>abrirOMantenerPedidoTerraza(m)}>
                    {/^mesa\s/i.test(String(m.nombre))? m.nombre : `Mesa ${m.nombre}`}
                    {m.pedido_abierto_id && <span className={styles.mesaBadge}>Abierta</span>}
                  </button>
                ))}
              </div>
              {mesaSeleccionada && <p className={styles.smallTip}>Terraza activa: <b>{/^mesa\s/i.test(String(mesaSeleccionada.nombre))? mesaSeleccionada.nombre : `Mesa ${mesaSeleccionada.nombre}`}</b></p>}
            </div>
          )}

          {modo==='delivery' && (
            <div className={styles.contextPanel}>
              <h2 className={styles.cardTitle}>Delivery</h2>
              <div className={styles.formGrid2}>
                <input placeholder="Teléfono" value={deliveryData.telefono} onChange={(e)=>setDeliveryData({ ...deliveryData, telefono: e.target.value })}/>
                <input placeholder="Costo envío" type="number" min="0" value={deliveryData.costo_envio} onChange={(e)=>setDeliveryData({ ...deliveryData, costo_envio: e.target.value })}/>
                <input placeholder="Dirección" value={deliveryData.direccion} onChange={(e)=>setDeliveryData({ ...deliveryData, direccion: e.target.value })}/>
                <input placeholder="Referencia" value={deliveryData.referencia} onChange={(e)=>setDeliveryData({ ...deliveryData, referencia: e.target.value })}/>
                <input placeholder="Repartidor / Contacto" value={deliveryData.repartidor} onChange={(e)=>setDeliveryData({ ...deliveryData, repartidor: e.target.value })}/>
              </div>
              <div className={styles.rowGap}><button className={styles.secondaryButtonSmall} onClick={abrirOMantenerPedidoDelivery}>Abrir pedido Delivery</button></div>
              {pedidoId && <p className={styles.smallTip}>Pedido Delivery activo: <strong>{pedidoId.slice(0,8)}…</strong></p>}
              <h3 className={styles.subTitle}>Delivery activos</h3>
              {deliveryActivos.length===0 ? (<p className={styles.smallTip}>No hay pedidos de delivery abiertos.</p>) : (
                <ul className={styles.resultsList}>
                  {deliveryActivos.map((p)=>(
                    <li key={p.id} className={styles.resultItem} onClick={()=>seleccionarDeliveryActivo(p)}>
                      <div className={styles.resultName}><strong>{p.delivery_telefono ?? 's/telefono'}</strong> — {p.delivery_direccion ?? 's/dirección'}</div>
                      <div className={styles.resultMeta}><span>Estado: {p.estado}</span>{p.delivery_nombre && <span>· Repartidor: {p.delivery_nombre}</span>}</div>
                    </li>
                  ))}
                </ul>
              )}
              {pedidoId && (
                <div className={styles.rowGap}>
                  <button className={styles.secondaryButtonSmall} onClick={()=>marcarDeliveryEstado('listo')}>Marcar Listo</button>
                  <button className={styles.secondaryButtonSmall} onClick={()=>marcarDeliveryEstado('entregado')}>Marcar Entregado</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {mostrarModalCliente && (
        <div className={styles.modalOverlay} onClick={()=>{ setMostrarModalCliente(false); }}>
          <div className={styles.modalContent} onClick={(e)=>e.stopPropagation()}>
            <h3>Agregar Nuevo Cliente</h3>
            <div className={styles.formGroup}><label htmlFor="nuevoClienteNombre">Nombre:</label><input id="nuevoClienteNombre" type="text" value={nuevoClienteData.nombre} onChange={(e)=>setNuevoClienteData({ ...nuevoClienteData, nombre: e.target.value })}/></div>
            <div className={styles.formGroup}><label htmlFor="nuevoClienteRuc">RUC:</label><input id="nuevoClienteRuc" type="text" value={nuevoClienteData.ruc} onChange={(e)=>setNuevoClienteData({ ...nuevoClienteData, ruc: e.target.value })}/></div>
            <div className={styles.modalActions}><button onClick={handleGuardarNuevoCliente} className={styles.primaryButton}>Guardar Cliente</button><button onClick={()=>{ setMostrarModalCliente(false); setMensaje(''); }} className={styles.secondaryButton}>Cancelar</button></div>
          </div>
        </div>
      )}

      {mostrarCierreCaja && (
        <div className={styles.modalOverlay} onClick={()=>setMostrarCierreCaja(false)}>
          <div className={styles.modalContent} onClick={(e)=>e.stopPropagation()}>
            <h3>Cierre de Caja (Hoy)</h3>
            <p className={styles.cierreCajaTotal}>Total: Gs. {formatearGs(totalVentasHoy)}</p>
            <ul className={styles.cierreCajaList}>{Object.entries(ventasHoyPorMetodo).map(([metodo,total])=> (<li key={metodo}>{metodo}: Gs. {formatearGs(total)}</li>))}</ul>
            <p className={styles.smallTip}>Tickets: {ventasHoy.length} · Promedio: Gs. {formatearGs(totalVentasHoy/Math.max(1, ventasHoy.length))}</p>
            <div className={styles.modalActions}><button className={styles.secondaryButton} onClick={()=>setMostrarCierreCaja(false)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Ventas;
