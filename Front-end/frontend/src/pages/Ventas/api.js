import axios from 'axios';

const API_URL =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN + '/api'
    : process.env.REACT_APP_API_URL_PUBLIC + '/api';

const apiClient = axios.create({
    baseURL: API_URL,
});

export const getClientes = () => apiClient.get('/clientes');
export const createCliente = (clienteData) => apiClient.post('/clientes', clienteData);
export const getProductos = () => apiClient.get('/productos');
export const getVentasHoy = (fecha) => {
    return apiClient.get('/ventas', { params: { desde: fecha, hasta: fecha } });
};
export const createVenta = (ventaData) => apiClient.post('/ventas', ventaData);
export const getFacturaUrl = (ventaId) => `${API_URL}/factura/${ventaId}`;