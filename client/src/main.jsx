import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}
axios.defaults.withCredentials = true;

let csrfToken = null;

// Read CSRF token from response headers if the server provides it (cross-origin fix)
axios.interceptors.response.use(
  (response) => {
    if (response.headers['x-csrf-token']) {
      csrfToken = response.headers['x-csrf-token'];
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.headers && error.response.headers['x-csrf-token']) {
      csrfToken = error.response.headers['x-csrf-token'];
    }
    return Promise.reject(error);
  }
);

// Inject CSRF token into mutating requests
axios.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    // Fallback to cookie if memory is empty (e.g. same-origin local dev)
    if (!csrfToken) {
      const match = document.cookie.split('; ').find(row => row.startsWith('csrf-token='));
      if (match) csrfToken = match.split('=')[1];
    }
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
  }
  return config;
});

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
