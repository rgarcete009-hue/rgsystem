// src/pages/Clientes.jsx
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import styles from './Clientes.module.css';

const API_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN + '/api/clientes'
    : process.env.REACT_APP_API_URL_PUBLIC + '/api/clientes';

const DEFAULT_PAGE_SIZE = 20;

const Clientes = () => {
  // ============ TEMA OSCURO/CLARO ============
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    return savedTheme || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  // ============================================

  const [clientes, setClientes] = useState([]);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rucDuplicado, setRucDuplicado] = useState(false);

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    obtenerClientes();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const obtenerClientes = async () => {
    try {
      const response = await axios.get(API_URL);
      setClientes(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los clientes.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoCliente({
      ...nuevoCliente,
      [name]: value
    });

    // Validar RUC duplicado
    if (name === 'ruc' && value.trim()) {
      const duplicado = clientes.some(c => 
        c.ruc?.toLowerCase() === value.toLowerCase() && 
        c.id !== editando
      );
      setRucDuplicado(duplicado);
      if (duplicado) {
        setError(`⚠️ El RUC "${value}" ya existe. Por favor, usa otro RUC.`);
      } else if (error?.includes('RUC')) {
        setError(null);
      }
    }
  };

  const handleGuardarCliente = async () => {
    try {
      // Validar RUC duplicado antes de guardar
      if (nuevoCliente.ruc?.trim()) {
        const duplicado = clientes.some(c => 
          c.ruc?.toLowerCase() === nuevoCliente.ruc.toLowerCase() && 
          c.id !== editando
        );
        if (duplicado) {
          setError(`❌ No se puede guardar: El RUC "${nuevoCliente.ruc}" ya existe.`);
          setRucDuplicado(true);
          return;
        }
      }

      if (editando) {
        await axios.put(`${API_URL}/${editando}`, nuevoCliente);
        setSuccess("✅ Cliente actualizado correctamente.");
      } else {
        await axios.post(API_URL, nuevoCliente);
        setSuccess("✅ Cliente creado correctamente.");
      }

      setNuevoCliente({
        nombre: '',
        ruc: '',
        direccion: '',
        telefono: ''
      });
      setEditando(null);
      setMostrarFormulario(false);
      setRucDuplicado(false);
      obtenerClientes();
    } catch (error) {
      console.error("❌ Error al guardar cliente:", error);
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Error al guardar el cliente.';
      setError(errorMsg);
    }
  };

  const handleEliminarCliente = async (id) => {
    const confirmacion = window.confirm("¿Estás seguro de que quieres eliminar este cliente?");
    if (!confirmacion) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      setSuccess("🗑️ Cliente eliminado correctamente.");
      obtenerClientes();
    } catch (error) {
      setError('Error al eliminar el cliente.');
    }
  };

  const handleEditarCliente = (cliente) => {
    setNuevoCliente(cliente);
    setEditando(cliente.id);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelar = () => {
    setNuevoCliente({
      nombre: '',
      ruc: '',
      direccion: '',
      telefono: ''
    });
    setEditando(null);
    setMostrarFormulario(false);
    setRucDuplicado(false);
    setError(null);
  };

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) =>
      cliente.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (cliente.ruc && cliente.ruc.toLowerCase().includes(filtro.toLowerCase())) ||
      (cliente.telefono && cliente.telefono.includes(filtro)) ||
      (cliente.direccion && cliente.direccion.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [clientes, filtro]);

  // Paginación
  const totalPages = Math.ceil(clientesFiltrados.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const clientesPaginados = clientesFiltrados.slice(startIndex, endIndex);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [filtro, pageSize]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const total = clientes.length;
    const conTelefono = clientes.filter(c => c.telefono && c.telefono.trim()).length;
    const conDireccion = clientes.filter(c => c.direccion && c.direccion.trim()).length;
    const completos = clientes.filter(c => 
      c.nombre && c.ruc && c.telefono && c.direccion
    ).length;
    
    return { total, conTelefono, conDireccion, completos };
  }, [clientes]);

  return (
    <div className={styles.container}>
      {/* Mensajes */}
      {error && <div className={styles.alertError}>{error}</div>}
      {success && <div className={styles.alertSuccess}>{success}</div>}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>👥 Administración de Clientes</h1>
          <p className={styles.subtitle}>
            Gestiona tu cartera de clientes
          </p>
        </div>
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)} 
          className={styles.primaryBtn}
        >
          {mostrarFormulario ? '❌ Cerrar' : '➕ Nuevo Cliente'}
        </button>
      </div>

      {/* Estadísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.total}</div>
            <div className={styles.statLabel}>Total Clientes</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.completos}</div>
            <div className={styles.statLabel}>Datos Completos</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📞</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.conTelefono}</div>
            <div className={styles.statLabel}>Con Teléfono</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📍</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{estadisticas.conDireccion}</div>
            <div className={styles.statLabel}>Con Dirección</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editando ? "✏️ Editar Cliente" : "➕ Crear Nuevo Cliente"}
          </h2>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nombre *</label>
              <input 
                type="text" 
                name="nombre" 
                placeholder="Ej: Juan Pérez" 
                value={nuevoCliente.nombre} 
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>RUC *</label>
              <input 
                type="text" 
                name="ruc" 
                placeholder="Ej: 12345678-9" 
                value={nuevoCliente.ruc} 
                onChange={handleInputChange}
                className={`${styles.input} ${rucDuplicado ? styles.inputError : ''}`}
              />
              {rucDuplicado && (
                <span className={styles.errorText}>⚠️ Este RUC ya existe</span>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Teléfono</label>
              <input 
                type="text" 
                name="telefono" 
                placeholder="Ej: 0981234567" 
                value={nuevoCliente.telefono} 
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Dirección</label>
              <input 
                type="text" 
                name="direccion" 
                placeholder="Ej: Av. España 123" 
                value={nuevoCliente.direccion} 
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              onClick={handleGuardarCliente} 
              className={styles.saveBtn}
              disabled={rucDuplicado}
            >
              {editando ? "💾 Guardar Cambios" : "➕ Crear Cliente"}
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
              placeholder="Nombre, RUC, teléfono o dirección" 
              value={filtro} 
              onChange={(e) => setFiltro(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.filterActions}>
          <button 
            onClick={() => setFiltro('')} 
            className={styles.secondaryBtn}
          >
            🔄 Limpiar filtro
          </button>
        </div>
      </div>

      {/* Paginación */}
      <div className={styles.paginationBar}>
        <div className={styles.paginationInfo}>
          Mostrando {startIndex + 1}-{Math.min(endIndex, clientesFiltrados.length)} de {clientesFiltrados.length} clientes
        </div>

        <div className={styles.paginationControls}>
          <label className={styles.pageSizeLabel}>
            Tamaño:
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              {[10, 20, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}
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
              Página {page} / {totalPages || 1}
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
      {clientesPaginados.length > 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>RUC</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesPaginados.map((cliente) => {
                  const completo = cliente.nombre && cliente.ruc && cliente.telefono && cliente.direccion;
                  
                  return (
                    <tr key={cliente.id}>
                      <td>{cliente.id}</td>
                      <td className={styles.colNombre}>{cliente.nombre}</td>
                      <td className={styles.colRuc}>{cliente.ruc}</td>
                      <td>{cliente.telefono || '—'}</td>
                      <td>{cliente.direccion || '—'}</td>
                      <td className={styles.colEstado}>
                        {completo ? (
                          <span className={styles.badgeCompleto}>✅ Completo</span>
                        ) : (
                          <span className={styles.badgeIncompleto}>⚠️ Incompleto</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button 
                            onClick={() => handleEditarCliente(cliente)}
                            className={styles.btnEdit}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleEliminarCliente(cliente.id)}
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
          <div className={styles.emptyIcon}>👥</div>
          <p>No se encontraron clientes con los filtros aplicados</p>
        </div>
      )}

    
    </div>
  );
};

export default Clientes;