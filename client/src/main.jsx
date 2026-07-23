import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}
axios.defaults.withCredentials = true;

// Global response interceptor: redirect to /checkout if the server blocks an expired plan.
// This is a last-resort catch-all — ProtectedRoute handles it on navigation,
// but this covers any API calls that slip through with stale localStorage data.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'PLAN_EXPIRED') {
      const isAuthPath = window.location.pathname === '/login'
        || window.location.pathname === '/checkout'
        || window.location.pathname === '/billing';
      if (!isAuthPath) {
        // Don't redirect on auth-related paths to avoid loops
        window.location.href = '/checkout';
      }
    }
    return Promise.reject(error);
  }
);


// Listen for Vite chunk load errors and reload the page automatically
window.addEventListener('vite:preloadError', (event) => {
  const lastReload = parseInt(sessionStorage.getItem('last_chunk_error_reload') || '0', 10);
  const now = Date.now();
  if (now - lastReload > 10000) {
    sessionStorage.setItem('last_chunk_error_reload', now.toString());
    window.location.reload(true);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
