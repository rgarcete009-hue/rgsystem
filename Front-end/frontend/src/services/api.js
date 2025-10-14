import axios from 'axios';

const hostname = window.location.hostname;

// Detecta si estás en LAN (IP privada o nombre local)
const isLAN = (
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  hostname.endsWith('.local') ||
  hostname === 'localhost'
);

// Selecciona la URL según el entorno
const apiUrl = isLAN
  ? process.env.REACT_APP_API_URL_LAN
  : process.env.REACT_APP_API_URL_PUBLIC;

console.log('[API] Base URL seleccionada:', apiUrl); // Para verificar en consola

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true
});

export default api;