const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, '../fonts/Roboto-Medium.ttf'),
    italics: path.join(__dirname, '../fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '../fonts/Roboto-MediumItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);

const generarTicketPDF = async (venta, cliente, detalles, res) => {
  const fecha = new Date(venta.createdAt).toLocaleString();

  const body = [
    [{ text: 'Cant.', style: 'tableHeader' }, { text: 'Producto', style: 'tableHeader' }, { text: 'P. Unit.', style: 'tableHeader' }, { text: 'Subt.', style: 'tableHeader' }],
    ...detalles.map(d => [
      { text: d.cantidad, style: 'tableText' },
      { text: d.producto.nombre, style: 'tableText' },
      { text: `${d.precio_unitario.toLocaleString()} Gs`, style: 'tableText' },
      { text: `${(d.cantidad * d.precio_unitario).toLocaleString()} Gs`, style: 'tableText' }
    ])
  ];

  const total = venta.total;
  const timbrado = {
    numero: '12345678',
    desde: '01/01/2025',
    hasta: '31/12/2025'
  };

  const docDefinition = {
    content: [
      {
        image: path.join(__dirname, '../assets/logo.png'),
        width: 60,
        alignment: 'center',
        margin: [0, 0, 0, 5]
      },
      { text: 'Mi Negocio S.A.', style: 'header', alignment: 'center' },
      { text: 'RUC: 80012345-6', alignment: 'center' },
      { text: 'Casa Central - Sucursal 01', alignment: 'center' },
      { text: 'Av. España 1234, Asunción', alignment: 'center', margin: [0, 0, 0, 3] },

      { text: `Timbrado N°: ${timbrado.numero}`, alignment: 'center' },
      { text: `Vigencia: ${timbrado.desde} al ${timbrado.hasta}`, alignment: 'center', margin: [0, 0, 0, 3] },

      { text: `Factura N°: 001-001-${String(venta.id).padStart(7, '0')}`, style: 'small', margin: [0, 2] },
      { text: `Fecha: ${fecha}`, style: 'small' },
      { text: `Cliente: ${cliente?.nombre || 'Consumidor Final'}`, style: 'small' },
      { text: `RUC/CI: ${cliente?.ruc || '-'}`, style: 'small', margin: [0, 0, 0, 3] },

      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto'],
          body
        },
        layout: 'noBorders' // 🔹 Mejor para impresión térmica
      },

      { text: '----------------------------------', margin: [0, 5] },
      {
        columns: [
          { text: 'IVA 10%:', style: 'small', alignment: 'left' },
          { text: `${Math.round(total / 11).toLocaleString()} Gs`, style: 'small', alignment: 'right' }
        ]
      },
      {
        columns: [
          { text: 'TOTAL:', style: 'total', alignment: 'left' },
          { text: `${total.toLocaleString()} Gs`, style: 'total', alignment: 'right' }
        ]
      },
      {
        text: `Condición: ${venta.metodo_pago}`,
        alignment: 'right',
        margin: [0, 3, 0, 0],
        style: 'small'
      },
      { text: 'Gracias por su preferencia', alignment: 'center', margin: [0, 5], style: 'small' }
    ],
    styles: {
      header: { fontSize: 10, bold: true }, // 🔹 Se redujo el tamaño
      total: { fontSize: 9, bold: true },
      small: { fontSize: 7 },
      tableHeader: { fontSize: 8, bold: true },
      tableText: { fontSize: 7 } // 🔹 Ajustado para productos
    },
    defaultStyle: {
      font: 'Roboto'
    },
    pageSize: { width: 220, height: 'auto' },
    pageMargins: [5, 5, 5, 5] // 🔹 Márgenes reducidos
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename=factura_${venta.id}.pdf`);
  pdfDoc.pipe(res);
  pdfDoc.end();
};

module.exports = generarTicketPDF;