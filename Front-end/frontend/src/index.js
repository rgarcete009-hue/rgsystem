// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { AuthProvider } from './pages/context/AuthContext';
import { RefreshProvider } from './pages/context/RefreshContext';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <RefreshProvider>
        <App />
      </RefreshProvider>
    </AuthProvider>
  </React.StrictMode>
);

// ==================== QZ Tray: pre-conexión (opcional) ====================
// Esto intenta conectar QZ al iniciar la app para que al "Cobrar" imprima directo
(function bootstrapQZ() {
  const qz = window.qz;
  if (!qz) {
    console.warn(
      '[QZ] qz-tray.js no está cargado. Verificá que agregaste https://cdn.qz.io/qz-tray.js</script> en public/index.html'
    );
    return;
  }

  // Nota: En desarrollo podés habilitar "Allow unsigned requests" en QZ Tray (Settings → Security).
  // Para producción, se recomienda configurar certificados:
  // qz.security.setCertificatePromise(() => Promise.resolve(MI_CERTIFICADO_PEM));
  // qz.security.setSignaturePromise(toSign => firmaConTuClavePrivada(toSign));

  const connect = async () => {
    try {
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 });
        console.log('[QZ] Conectado correctamente');
      }
    } catch (e) {
      // No es crítico si falla aquí; al imprimir se volverá a intentar
      console.warn('[QZ] No se pudo conectar ahora (se intentará al imprimir):', e?.message || e);
    }
  };

  // Ejecuta la pre-conexión sin bloquear el render
  setTimeout(connect, 0);

  // (Opcional) Exponer helper de test en consola:
  window.qzIsActive = () => qz?.websocket?.isActive?.();
})();
reportWebVitals();