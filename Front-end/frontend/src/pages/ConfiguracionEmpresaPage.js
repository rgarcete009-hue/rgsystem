// src/pages/ConfiguracionEmpresaPage.js
import React from 'react';
import ConfiguracionEmpresaForm from '../components/ConfiguracionEmpresaForm/ConfiguracionEmpresaForm'; // Asegúrate que la ruta sea correcta

const ConfiguracionEmpresaPage = () => {
    return (
        <div className="configuracion-empresa-page">
            {/* Puedes añadir un título o cualquier otro elemento específico de la página aquí */}
            <h1>Gestionar Configuración de la Empresa</h1>
            <p>Aquí puedes actualizar la información de tu negocio.</p>
            
            {/* Renderiza el componente del formulario */}
            <ConfiguracionEmpresaForm />
        </div>
    );
};

export default ConfiguracionEmpresaPage;