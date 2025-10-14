const { sequelize } = require('../config/database');
const Producto = require('../models/Producto');

const seedProductos = async () => {
  try {
    await sequelize.sync({ alter: true }); // Sincroniza con cambios en el modelo

    const productos = [
      {
        nombre: 'Pizza Muzzarella',
        descripcion: 'Pizza clásica con queso muzzarella y salsa de tomate.',
        precio: 30000,
        precio_costo: 20000,
        stock: 50,
        stock_minimo: 10,
        unidad_medida: 'unidad',
        categoria: 'Pizzas',
        codigo_barra: '7891234567890',
        codigo_producto: 'PIZZA001',
        impuesto: 10.00,
        tipo: 'producto',
        es_compuesto: true
      },
      {
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Con carne vacuna, lechuga, tomate y queso.',
        precio: 25000,
        precio_costo: 15000,
        stock: 30,
        stock_minimo: 5,
        unidad_medida: 'unidad',
        categoria: 'Hamburguesas',
        codigo_barra: '7891234567891',
        codigo_producto: 'HAMB001',
        impuesto: 10.00,
        tipo: 'producto',
        es_compuesto: true
      },
      {
        nombre: 'Refresco 500ml',
        descripcion: 'Coca Cola o similar, botella 500ml.',
        precio: 7000,
        precio_costo: 4000,
        stock: 100,
        stock_minimo: 20,
        unidad_medida: 'unidad',
        categoria: 'Bebidas',
        codigo_barra: '7891234567892',
        codigo_producto: 'BEB500',
        impuesto: 5.00,
        tipo: 'producto',
        es_compuesto: false
      },
      {
        nombre: 'Empanada de Carne',
        descripcion: 'Empanada frita rellena con carne sazonada.',
        precio: 5000,
        precio_costo: 2500,
        stock: 80,
        stock_minimo: 10,
        unidad_medida: 'unidad',
        categoria: 'Empanadas',
        codigo_barra: '7891234567893',
        codigo_producto: 'EMP001',
        impuesto: 10.00,
        tipo: 'producto',
        es_compuesto: false
      },
      {
        nombre: 'Caja de Pizza (pack)',
        descripcion: 'Paquete de cajas para entrega de pizzas.',
        precio: 10000,
        precio_costo: 9000,
        stock: 200,
        stock_minimo: 50,
        unidad_medida: 'unidad',
        categoria: 'Insumos',
        codigo_barra: '7891234567894',
        codigo_producto: 'INS001',
        impuesto: 5.00,
        tipo: 'insumo',
        es_compuesto: false
      }
    ];

    await Producto.bulkCreate(productos);
    console.log('✔ Productos insertados correctamente con todos los campos');
    process.exit();
  } catch (error) {
    console.error('❌ Error al insertar productos:', error);
    process.exit(1);
  }
};

seedProductos();
