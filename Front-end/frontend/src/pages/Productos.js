// src/pages/Productos.jsx
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import styles from './CSS/Productos.module.css';

const API_URL =
  window.location.hostname === 'localhost'
    ? `${process.env.REACT_APP_API_URL_LAN}/api/productos`
    : `${process.env.REACT_APP_API_URL_PUBLIC}/api/productos`;

const DEFAULT_PAGE_SIZE = 20;

const Productos = () => {
  // ============ TEMA OSCURO/CLARO ============
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme ?? 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  // ============================================

  // ---------- Publicar total globalmente ----------
  const publishTotalProductos = (total) => {
    try {
      localStorage.setItem('totalProductos', String(total));
      window.dispatchEvent(new CustomEvent('productos:totalChanged', { detail: { total } }));
    } catch {
      // Ignorar (SSR/privacy mode)
    }
  };
  // -----------------------------------------------

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_costo: '',
    stock: '',
    stock_minimo: '',
    unidad_medida: '',
    categoria: '',
    codigo_barra: '',
    codigo_producto: '',
    impuesto: '',
    tipo: '',
    es_compuesto: false,
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editando, setEditando] = useState(null);

  const [filtro, setFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [mostrarBajoStock, setMostrarBajoStock] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [codigoDuplicado, setCodigoDuplicado] = useState(false);

  // 🔽 NUEVO: controles de orden
  const [sortKey, setSortKey] = useState('codigo'); // 'codigo' | 'nombre' | 'precio'
  const [sortDir, setSortDir] = useState('asc');    // 'asc' | 'desc'

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    obtenerProductos();
  }, []);

  // Limpieza de mensajes
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Publicar total cada vez que cambia "productos"
  useEffect(() => {
    publishTotalProductos(productos.length);
  }, [productos]);

  const obtenerProductos = async () => {
    try {
      const response = await axios.get(API_URL);
      const data = Array.isArray(response.data) ? response.data : [];
      setProductos(data);
      setError(null);

      // Extraer categorías únicas
      const categoriasUnicas = [...new Set(data.map(prod => prod.categoria))].filter(Boolean);
      setCategorias(categoriasUnicas);

      // Publicar total tras fetch
      publishTotalProductos(data.length);
    } catch (err) {
      setError('Error al cargar los productos.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue;

    if (type === 'checkbox') newValue = checked;
    else if (type === 'number') newValue = value === '' ? '' : parseInt(value, 10);
    else newValue = value;

    setNuevoProducto(prev => ({ ...prev, [name]: newValue }));

    // Validar código de producto duplicado
    if (name === 'codigo_producto' && value.trim()) {
      const duplicado = productos.some(
        p =>
          p.codigo_producto?.toLowerCase() === value.toLowerCase() &&
          p.id !== editando
      );
      setCodigoDuplicado(duplicado);
      if (duplicado) {
        setError(`⚠️ El código de producto "${value}" ya existe. Por favor, usa otro código.`);
      } else if (error?.includes('código de producto')) {
        setError(null);
      }
    }
  };

  const handleGuardarProducto = async () => {
    try {
      // Validar duplicado antes de guardar
      if (nuevoProducto.codigo_producto?.trim()) {
        const duplicado = productos.some(
          p =>
            p.codigo_producto?.toLowerCase() === nuevoProducto.codigo_producto.toLowerCase() &&
            p.id !== editando
        );
        if (duplicado) {
          setError(`❌ No se puede guardar: El código de producto "${nuevoProducto.codigo_producto}" ya existe.`);
          setCodigoDuplicado(true);
          return;
        }
      }

      if (editando) {
        await axios.put(`${API_URL}/${editando}`, nuevoProducto);
        setSuccess('✅ Producto actualizado correctamente.');
      } else {
        await axios.post(API_URL, nuevoProducto);
        setSuccess('✅ Producto creado correctamente.');

        // (Opcional) Actualización optimista del total
        publishTotalProductos(productos.length + 1);
      }

      // Reset de formulario
      setNuevoProducto({
        nombre: '',
        descripcion: '',
        precio: '',
        precio_costo: '',
        stock: '',
        stock_minimo: '',
        unidad_medida: '',
        categoria: '',
        codigo_barra: '',
        codigo_producto: '',
        impuesto: '',
        tipo: '',
        es_compuesto: false,
      });
      setEditando(null);
      setMostrarFormulario(false);
      setCodigoDuplicado(false);

      // Re-fetch y publicará el total real
      obtenerProductos();
    } catch (error) {
      console.error('❌ Error al guardar producto:', error);
      const errorMsg =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        'Error al guardar el producto.';
      setError(errorMsg);
    }
  };

  const handleEliminarProducto = async (id) => {
    const confirmacion = window.confirm('¿Estás seguro de que quieres eliminar este producto?');
    if (!confirmacion) return;

    try {
      await axios.delete(`${API_URL}/${id}`);
      setSuccess('🗑️ Producto eliminado correctamente.');

      // Re-fetch y publicará el total actualizado
      obtenerProductos();
    } catch (error) {
      setError('Error al eliminar el producto.');
    }
  };

  const handleEditarProducto = (producto) => {
    setNuevoProducto(producto);
    setEditando(producto.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelar = () => {
    setNuevoProducto({
      nombre: '',
      descripcion: '',
      precio: '',
      precio_costo: '',
      stock: '',
      stock_minimo: '',
      unidad_medida: '',
      categoria: '',
      codigo_barra: '',
      codigo_producto: '',
      impuesto: '',
      tipo: '',
      es_compuesto: false,
    });
    setEditando(null);
    setMostrarFormulario(false);
    setCodigoDuplicado(false);
    setError(null);
  };

  // ===== Utilidades de orden =====
  const safeStr = (v) => (v ?? '').toString().trim();
  const getCodigo = (p) => safeStr(p.codigo_producto);
  const getNombre = (p) => safeStr(p.nombre);
  const getPrecio = (p) => {
    const n = parseInt(p?.precio, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const compareCodigo = (a, b) => {
    const A = getCodigo(a);
    const B = getCodigo(b);
    if (A && B) {
      const cmp = A.localeCompare(B, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return (a.id ?? 0) - (b.id ?? 0); // estable por id
    }
    if (!A && B) return 1;  // sin código al final
    if (A && !B) return -1;
    return (a.id ?? 0) - (b.id ?? 0);
  };

  const compareNombre = (a, b) => {
    const A = getNombre(a);
    const B = getNombre(b);
    const cmp = A.localeCompare(B, undefined, { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    // desempate: por código y luego por id
    const c2 = compareCodigo(a, b);
    if (c2 !== 0) return c2;
    return (a.id ?? 0) - (b.id ?? 0);
  };

  const comparePrecio = (a, b) => {
    const A = getPrecio(a);
    const B = getPrecio(b);
    if (A !== B) return A - B;
    // desempate: por código y luego por id
    const c2 = compareCodigo(a, b);
    if (c2 !== 0) return c2;
    return (a.id ?? 0) - (b.id ?? 0);
  };

  const compareByKeyDir = (a, b, key, dir) => {
    let cmp = 0;
    if (key === 'codigo') cmp = compareCodigo(a, b);
    else if (key === 'nombre') cmp = compareNombre(a, b);
    else if (key === 'precio') cmp = comparePrecio(a, b);
    const mult = dir === 'asc' ? 1 : -1;
    return cmp * mult;
  };
  // ==============================================

  // ------- Filtros + ORDENACIÓN configurable -------
  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((producto) =>
      (
        producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        producto.id.toString().includes(filtro) ||
        (producto.codigo_producto && producto.codigo_producto.toLowerCase().includes(filtro.toLowerCase())) ||
        (producto.codigo_barra && producto.codigo_barra.toLowerCase().includes(filtro.toLowerCase()))
      ) &&
      (categoriaFiltro === '' || producto.categoria === categoriaFiltro) &&
      (!mostrarBajoStock || (parseInt(producto.stock, 10) < parseInt(producto.stock_minimo, 10)))
    );

    // Ordenar por la clave/dirección seleccionadas
    return filtrados.sort((a, b) => compareByKeyDir(a, b, sortKey, sortDir));
  }, [productos, filtro, categoriaFiltro, mostrarBajoStock, sortKey, sortDir]);

  // ------- Paginación -------
  const totalPages = Math.ceil(productosFiltrados.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const productosPaginados = productosFiltrados.slice(startIndex, endIndex);

  // Reset página cuando cambian filtros, tamaño o el orden
  useEffect(() => {
    setPage(1);
  }, [filtro, categoriaFiltro, mostrarBajoStock, pageSize, sortKey, sortDir]);

  const formatGs = (n) => {
    return Number(n ?? 0).toLocaleString('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // ------- Estadísticas -------
  const estadisticas = useMemo(() => {
    const total = productos.length;
    const bajoStock = productos.filter(p => parseInt(p.stock, 10) < parseInt(p.stock_minimo, 10)).length;
    const valorTotal = productos.reduce((sum, p) => sum + (parseInt(p.precio, 10) * parseInt(p.stock, 10)), 0);
    const sinStock = productos.filter(p => parseInt(p.stock, 10) === 0).length;
    return { total, bajoStock, valorTotal, sinStock };
  }, [productos]);

  return (
    <div className={styles.container}>
      {/* Mensajes */}
      {error && <div className={styles.alertError}>{error}</div>}
      {success && <div className={styles.alertSuccess}>{success}</div>}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🛒 Administración de Productos</h1>
          <p className={styles.subtitle}>Gestiona tu inventario de forma eficiente</p>
        </div>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className={styles.primaryBtn}
        >
          {mostrarFormulario ? '❌ Cerrar' : '➕ Nuevo Producto'}
        </button>
      </div>

      {/* Estadísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.total}</div>
            <div className={styles.statLabel}>Total Productos</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚠️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.bajoStock}</div>
            <div className={styles.statLabel}>Bajo Stock</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🚫</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.sinStock}</div>
            <div className={styles.statLabel}>Sin Stock</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editando ? '✏️ Editar Producto' : '➕ Crear Nuevo Producto'}
          </h2>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nombre *</label>
              <input
                type="text"
                name="nombre"
                placeholder="Ej: Coca Cola 1L"
                value={nuevoProducto.nombre}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Descripción</label>
              <input
                type="text"
                name="descripcion"
                placeholder="Descripción del producto"
                value={nuevoProducto.descripcion}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Precio (Gs.) *</label>
              <input
                type="number"
                name="precio"
                placeholder="15000"
                value={nuevoProducto.precio}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Costo (Gs.)</label>
              <input
                type="number"
                name="precio_costo"
                placeholder="10000"
                value={nuevoProducto.precio_costo}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Stock *</label>
              <input
                type="number"
                name="stock"
                placeholder="100"
                value={nuevoProducto.stock}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Stock Mínimo</label>
              <input
                type="number"
                name="stock_minimo"
                placeholder="10"
                value={nuevoProducto.stock_minimo}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Unidad de Medida</label>
              <input
                type="text"
                name="unidad_medida"
                placeholder="Unidad, Kg, L"
                value={nuevoProducto.unidad_medida}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Categoría</label>
              <input
                type="text"
                name="categoria"
                placeholder="Bebidas, Alimentos"
                value={nuevoProducto.categoria}
                onChange={handleInputChange}
                className={styles.input}
                list="categorias-list"
              />
              <datalist id="categorias-list">
                {categorias.map((cat, idx) => (
                  <option key={idx} value={cat} />
                ))}
              </datalist>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Código de Barra</label>
              <input
                type="text"
                name="codigo_barra"
                placeholder="7891234567890"
                value={nuevoProducto.codigo_barra}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Código de Producto</label>
              <input
                type="text"
                name="codigo_producto"
                placeholder="PROD-001"
                value={nuevoProducto.codigo_producto}
                onChange={handleInputChange}
                className={`${styles.input} ${codigoDuplicado ? styles.inputError : ''}`}
              />
              {codigoDuplicado && (
                <span className={styles.errorText}>⚠️ Este código ya existe</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Impuesto (%)</label>
              <select
                name="impuesto"
                value={nuevoProducto.impuesto}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="">Seleccionar</option>
                <option value="10">10%</option>
                <option value="5">5%</option>
                <option value="0">Exento</option>
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              onClick={handleGuardarProducto}
              className={styles.saveBtn}
              disabled={codigoDuplicado}
            >
              {editando ? '💾 Guardar Cambios' : '➕ Crear Producto'}
            </button>
            <button onClick={handleCancelar} className={styles.cancelBtn}>
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>🔍 Buscar</label>
            <input
              type="text"
              placeholder="Nombre, ID, código de barra o producto"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>📂 Categoría</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className={styles.select}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria, index) => (
                <option key={index} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>

          {/* 🔽 NUEVO: Ordenar por */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>🔽 Ordenar por</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className={styles.select}
              >
                <option value="codigo">Código</option>
                <option value="nombre">Nombre</option>
                <option value="precio">Precio</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                className={styles.secondaryBtn}
                title={sortDir === 'asc' ? 'Ascendente' : 'Descendente'}
                style={{ minWidth: 88 }}
              >
                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button
            onClick={() => setMostrarBajoStock(!mostrarBajoStock)}
            className={mostrarBajoStock ? styles.filterBtnActive : styles.filterBtn}
          >
            {mostrarBajoStock ? '✅ Mostrando bajo stock' : '⚠️ Filtrar bajo stock'}
          </button>
          <button
            onClick={() => { setFiltro(''); setCategoriaFiltro(''); setMostrarBajoStock(false); }}
            className={styles.secondaryBtn}
          >
            🔄 Limpiar filtros
          </button>
        </div>
      </div>

      {/* Paginación */}
      <div className={styles.paginationBar}>
        <div className={styles.paginationInfo}>
          Mostrando {startIndex + 1}-{Math.min(endIndex, productosFiltrados.length)} de {productosFiltrados.length} productos
        </div>

        <div className={styles.paginationControls}>
          <label className={styles.pageSizeLabel}>
            Tamaño:
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className={styles.paginationButtons}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className={styles.pageBtn}
            >
              ⏮️
            </button>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={styles.pageBtn}
            >
              ◀️
            </button>
            <span className={styles.pageIndicator}>
              Página {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={styles.pageBtn}
            >
              ▶️
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className={styles.pageBtn}
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {productosPaginados.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Código Producto</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Stock Mín.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosPaginados.map((producto) => {
                  const bajoStock = parseInt(producto.stock, 10) < parseInt(producto.stock_minimo, 10);
                  const sinStock = parseInt(producto.stock, 10) === 0;
                  return (
                    <tr
                      key={producto.id}
                      className={sinStock ? styles.rowSinStock : bajoStock ? styles.rowBajoStock : ''}
                    >
                      <td>{producto.id}</td>
                      <td className={styles.colCodigo}>{producto.codigo_producto ?? '—'}</td>
                      <td className={styles.colNombre}>{producto.nombre}</td>
                      <td>
                        {producto.categoria ? (
                          <span className={styles.badgeCategoria}>{producto.categoria}</span>
                        ) : '—'}
                      </td>
                      <td className={styles.colMoney}>Gs. {formatGs(producto.precio)}</td>
                      <td className={styles.colStock}>
                        {sinStock ? (
                          <span className={styles.badgeSinStock}>0</span>
                        ) : bajoStock ? (
                          <span className={styles.badgeBajoStock}>{parseInt(producto.stock, 10)}</span>
                        ) : (
                          <span className={styles.badgeStockOk}>{parseInt(producto.stock, 10)}</span>
                        )}
                      </td>
                      <td>{parseInt(producto.stock_minimo, 10)}</td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleEditarProducto(producto)}
                            className={styles.btnEdit}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleEliminarProducto(producto.id)}
                            className={styles.btnDelete}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📦</div>
          <p>No se encontraron productos con los filtros aplicados</p>
        </div>
      )}
    </div>
  );
};

export default Productos;