import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Proveedores.css'; // Asegúrate de tener estilos específicos para proveedores

// Selecciona la URL base según el entorno
const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const FormularioProveedor = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    direccion: '',
    telefono: '',
    email: '',
    ruc: ''
  });
  const [submitMessage, setSubmitMessage] = useState('');
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage('Registrando proveedor...');
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/proveedores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      setSubmitMessage(`Proveedor ${result.nombre} (ID: ${result.id}) registrado exitosamente.`);
      setFormData({
        nombre: '',
        contacto: '',
        direccion: '',
        telefono: '',
        email: '',
        ruc: ''
      });
      navigate('/proveedores');
    } catch (err) {
      setError(`Error al registrar el proveedor: ${err.message}`);
      setSubmitMessage('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Registrar Nuevo Proveedor</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '500px' }}>
        <div>
          <label>Nombre:
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required style={{ marginLeft: '10px', padding: '5px' }} />
          </label>
        </div>
        <div>
          <label>Contacto:
            <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} style={{ marginLeft: '10px', padding: '5px' }} />
          </label>
        </div>
        <div>
          <label>Dirección:
            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} style={{ marginLeft: '10px', padding: '5px' }} />
          </label>
        </div>
        <div>
          <label>Teléfono:
            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} style={{ marginLeft: '10px', padding: '5px' }} />
          </label>
        </div>
        <div>
          <label>Email:
            <input type="email" name="email" value={formData.email} onChange={handleChange} style={{ marginLeft: '10px', padding: '5px' }} />
          </label>
        </div>
        <div>
          <label>RUC:
            <input type="text" name="ruc" value={formData.ruc} onChange={handleChange} style={{ marginLeft: '10px', padding: '5px' }} />
          </label>
        </div>
        
        <button type="submit" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Registrar Proveedor
        </button>
      </form>
      {submitMessage && <p style={{ color: 'green', marginTop: '10px' }}>{submitMessage}</p>}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
};

export default FormularioProveedor;