import React, { useEffect, useMemo, useState } from 'react';
import './CSS/Usuarios.css';

const API_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN + '/api/usuarios'
    : process.env.REACT_APP_API_URL_PUBLIC + '/api/usuarios';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'cajero' });
  const [editId, setEditId] = useState(null);
  const [mensaje, setMensaje] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [cargando, setCargando] = useState(false);

  // ====== Tema: 'light' | 'dark' | 'system' ======
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  const effectiveTheme = useMemo(() => {
    if (theme !== 'system') return theme;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    let mm;
    if (theme === 'system' && window.matchMedia) {
      mm = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        document.documentElement.dataset.theme = mm.matches ? 'dark' : 'light';
      };
      mm.addEventListener?.('change', handler);
      return () => mm.removeEventListener?.('change', handler);
    }
  }, [effectiveTheme, theme]);

  const changeTheme = (next) => {
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  // ====== Carga inicial ======
  const fetchUsuarios = async () => {
    try {
      setCargando(true);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const data = await res.json();
      setUsuarios(data || []);
    } catch (e) {
      setMensaje({ type: 'error', text: e.message || 'Error al cargar usuarios.' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // ====== Handlers ======
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `${API_URL}/${editId}` : API_URL;

      // Si está editando y password está vacío, no lo enviamos (para no cambiarlo).
      const payload = { username: form.username, role: form.role };
      if (!editId || (editId && form.password.trim() !== '')) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error HTTP: ${res.status}`);
      }

      setMensaje({ type: 'success', text: editId ? '✅ Usuario actualizado' : '✅ Usuario creado' });
      setForm({ username: '', password: '', role: 'cajero' });
      setEditId(null);
      await fetchUsuarios();
    } catch (e) {
      setMensaje({ type: 'error', text: e.message || '❌ Error al guardar usuario' });
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (u) => {
    setForm({ username: u.username, password: '', role: u.role || 'cajero' });
    setEditId(u.id);
    setMensaje({ type: 'info', text: `Editando usuario #${u.id}` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ username: '', password: '', role: 'cajero' });
    setMensaje(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      setMensaje({ type: 'success', text: '🗑️ Usuario eliminado' });
      await fetchUsuarios();
    } catch (e) {
      setMensaje({ type: 'error', text: e.message || '❌ Error al eliminar usuario' });
    }
  };

  return (
    <div className="users-shell">
      <div className="users-card">
        {/* Header */}
        <header className="users-header">
          <div>
            <h1 className="users-title">Gestión de Usuarios</h1>
            <p className="users-subtitle">Crea, edita y elimina usuarios del sistema</p>
          </div>

          <div className="theme-switch" role="group" aria-label="Selector de tema">
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => changeTheme('light')}
              title="Modo claro"
            >☀️ Claro</button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => changeTheme('dark')}
              title="Modo oscuro"
            >🌙 Oscuro</button>
            <button
              type="button"
              aria-pressed={theme === 'system'}
              onClick={() => changeTheme('system')}
              title="Seguir tema del sistema"
            >💻 Sistema</button>
          </div>
        </header>

        <div className="users-body">
          {/* Mensajes */}
          {mensaje && (
            <div
              className={`alert ${mensaje.type}`}
              role={mensaje.type === 'error' ? 'alert' : 'status'}
              aria-live={mensaje.type === 'error' ? 'assertive' : 'polite'}
            >
              {mensaje.text}
            </div>
          )}

          {/* Formulario */}
          <form className="users-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">
                {editId ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete={editId ? 'new-password' : 'new-password'}
                placeholder={editId ? 'Opcional' : 'Mín. 6 caracteres'}
              />
            </div>

            <div className="field">
              <label htmlFor="role">Rol</label>
              <select id="role" name="role" value={form.role} onChange={handleChange}>
                <option value="admin">Administrador</option>
                <option value="cajero">Cajero</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={cargando}>
                {cargando ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}
              </button>
              {editId && (
                <button type="button" className="btn btn-outline" onClick={handleCancel}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Tabla */}
          {usuarios.length === 0 ? (
            <div className="empty">{cargando ? 'Cargando…' : 'No hay usuarios registrados.'}</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td data-label="ID">{u.id}</td>
                    <td data-label="Usuario">{u.username}</td>
                    <td data-label="Rol">{u.role}</td>
                    <td data-label="Acciones">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn-warning"
                          onClick={() => handleEdit(u)}
                          title="Editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDelete(u.id)}
                          title="Eliminar"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Usuarios;