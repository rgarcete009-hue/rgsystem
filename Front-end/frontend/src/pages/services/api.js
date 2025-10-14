import axios from 'axios';

const apiUrl =
  window.location.hostname === 'localhost'
    ? process.env.REACT_APP_API_URL_LAN
    : process.env.REACT_APP_API_URL_PUBLIC;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true // si usás sesiones o cookies
});

export default api;