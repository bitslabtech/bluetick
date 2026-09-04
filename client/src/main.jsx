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

// Global response interceptor:
// 1. Redirect to /checkout if the server blocks an expired plan.
// 2. Redirect to /login if the server returns 401 (session/cookie expired).
// ProtectedRoute handles it on navigation, but this covers any API call
// made from a stale page where the cookie has expired server-side.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const pathname = window.location.pathname;
    const isAuthPath = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

    // Handle expired/revoked session — any 401 outside auth pages
    if (status === 401 && !isAuthPath) {
      // Only act if we actually had a user in localStorage (avoid loops on public pages)
      const hadUser = (() => {
        try {
          const u = localStorage.getItem('user');
          return !!(u && u !== 'undefined');
        } catch { return false; }
      })();

      if (hadUser) {
        localStorage.removeItem('user');
        // Preserve the current page so we redirect back after login
        const returnTo = encodeURIComponent(pathname + window.location.search);
        window.location.href = `/login?reason=session_expired&returnTo=${returnTo}`;
      }
    }

    // Handle expired plan
    if (status === 403 && error.response?.data?.code === 'PLAN_EXPIRED') {
      const isCheckoutPath = pathname === '/checkout' || pathname === '/billing';
      if (!isCheckoutPath && !isAuthPath) {
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
