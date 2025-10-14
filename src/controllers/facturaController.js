// src/controllers/facturaController.js
const {
  Venta,
  VentaDetalle,
  Producto,
  Cliente,
  ConfiguracionEmpresa
} = require('../models'); // <- Importa desde el índice con asociaciones cargadas

const formatearGs = (valor) =>
  Number(valor).toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatearFechaHora = (fechaString) => {
  if (!fechaString) return '';
  const date = new Date(fechaString);
  return date.toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// --- Componer los datos de la factura (reusa la misma lógica para HTML/JSON) ---
async function armarDatosFactura(venta_id) {
  const [venta, configEmpresa] = await Promise.all([
    Venta.findByPk(venta_id, {
      include: [
        { model: VentaDetalle, as: 'detallesDeVenta', include: [{ model: Producto, as: 'producto' }] },
        { model: Cliente, as: 'cliente' }
      ]
    }),
    ConfiguracionEmpresa.findByPk(1)
  ]);

  if (!venta) throw new Error('Venta no encontrada.');
  if (!configEmpresa) throw new Error('Configuración de empresa no encontrada.');

  let totalIVA5 = 0, totalIVA10 = 0, totalExento = 0, totalGravada5 = 0, totalGravada10 = 0;

  const detalles = venta.detallesDeVenta.map((detalle) => {
    const rate = Number(detalle.producto?.impuesto ?? 10);
    const subtotalBruto = Number(detalle.subtotal || 0);
    let ivaLinea = 0, gravado = 0;

    if (rate === 10) {
      ivaLinea = subtotalBruto * 10 / 110;
      gravado  = subtotalBruto - ivaLinea;
      totalIVA10     += ivaLinea;
      totalGravada10 += gravado;
    } else if (rate === 5) {
      ivaLinea = subtotalBruto * 5 / 105;
      gravado  = subtotalBruto - ivaLinea;
      totalIVA5     += ivaLinea;
      totalGravada5 += gravado;
    } else {
      totalExento += subtotalBruto;
    }

    return {
      producto_id: detalle.producto?.id ?? 'N/D',
      descripcion: detalle.producto?.nombre ?? 'N/D',
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
      subtotal: subtotalBruto,
      tasa: rate,
      iva: Math.round(ivaLinea)
    };
  });

  const totales = {
    totalPagar: Number(venta.total || 0),
    totalIVA: totalIVA5 + totalIVA10,
    totalIVA5,
    totalIVA10,
    totalGravada5,
    totalGravada10,
    totalExento
  };

  const empresa = {
    nombreEmpresa: configEmpresa.nombreEmpresa || 'EMPRESA S.A.',
    ruc: configEmpresa.ruc || '',
    timbradoNo: configEmpresa.timbradoNo || '',
    timbradoValidoDesde: formatearFechaHora(configEmpresa.timbradoValidoDesde),
    timbradoValidoHasta: formatearFechaHora(configEmpresa.timbradoValidoHasta),
    direccion: configEmpresa.direccion || '',
    telefono: configEmpresa.telefono || ''
  };

  const ventaInfo = {
    id: venta.id,
    numero_factura: venta.numero_factura || 'N/A',
    fecha: formatearFechaHora(venta.fecha),
    metodo_pago: venta.metodo_pago || 'efectivo',
    cliente: {
      nombre: venta.cliente?.nombre || 'SIN NOMBRE',
      ruc: venta.cliente?.ruc || '000'
    },
    estado: (venta.estado || 'activa').toUpperCase()
  };

  return { empresa, venta: ventaInfo, detalles, totales };
}

// --- HTML imprimible ---
const generarFactura = async (req, res) => {
  const { venta_id } = req.params;
  try {
    const data = await armarDatosFactura(venta_id);
    const { empresa, venta, detalles, totales } = data;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"><title>Factura #${venta.id}</title>
  <style>
    body { font-family: 'Courier New', monospace; font-size: 10px; width: 230px; margin:0; padding:0; }
    .text-right { text-align: right; } .text-center { text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { font-size: 9px; padding: 1px 0; white-space: nowrap; }
    th { border-bottom: 1px dashed #000; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="text-center">
    ${venta.estado === 'ANULADO' ? '<div style="color:#B00020;font-weight:700;margin-bottom:4px;">*** ANULADA ***</div>' : ''}
    <strong>${empresa.nombreEmpresa}</strong><br/>
    RUC: ${empresa.ruc}<br/>
    Timbrado: ${empresa.timbradoNo}<br/>
    Válido desde: ${empresa.timbradoValidoDesde}<br/>
    Válido hasta: ${empresa.timbradoValidoHasta}<br/>
    Factura N°: ${venta.numero_factura}
  </div>
  <p>Fecha: ${venta.fecha}</p>
  <p>Cliente: ${venta.cliente.nombre} - RUC: ${venta.cliente.ruc}</p>

  <table>
    <thead>
      <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${detalles.map(d => `
      <tr>
        <td>${d.descripcion}</td>
        <td>${d.cantidad}</td>
        <td class="text-right">${formatearGs(d.precio_unitario)}</td>
        <td class="text-right">${formatearGs(d.subtotal)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="text-right">
    <p><strong>Total a pagar: Gs. ${formatearGs(totales.totalPagar)}</strong></p>
    <p>Gravada 10%: Gs. ${formatearGs(totales.totalGravada10)}</p>
    <p>IVA 10%: Gs. ${formatearGs(totales.totalIVA10)}</p>
    <p>Gravada 5%: Gs. ${formatearGs(totales.totalGravada5)}</p>
    <p>IVA 5%: Gs. ${formatearGs(totales.totalIVA5)}</p>
    <p>Exento: Gs. ${formatearGs(totales.totalExento)}</p>
    <p>Total IVA: Gs. ${formatearGs(totales.totalIVA)}</p>
  </div>

  <div class="text-center"><p>* Gracias por su compra *</p></div>

  <script>
    const p = new URLSearchParams(location.search);
    if (p.get('autoprint') === '1') {
      window.onload = () => window.print();
      if (p.get('close') === '1') window.onafterprint = () => window.close();
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send(`Error interno al generar factura: ${error.message}`);
  }
};

// --- JSON para QZ Tray / exportaciones ---
const generarFacturaDatos = async (req, res) => {
  const { venta_id } = req.params;
  try {
    const data = await armarDatosFactura(venta_id);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: `Error al generar datos de factura: ${error.message}` });
  }
};

module.exports = { generarFactura, generarFacturaDatos };
