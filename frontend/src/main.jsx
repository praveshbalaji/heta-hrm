import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Attach the signed-in user's session token to every API request so the server
// can verify who is calling (e.g. only administrators may delete users).
if (typeof window !== 'undefined' && window.fetch && !window.__hetaAuthFetch) {
  const nativeFetch = window.fetch.bind(window);
  window.__hetaAuthFetch = true;
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url.includes('/api/')) {
        const saved = JSON.parse(localStorage.getItem('heta_auth') || 'null');
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        if (saved?.token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${saved.token}`);
          return nativeFetch(input, { ...init, headers });
        }
      }
    } catch {
      // fall through to an unmodified request
    }
    return nativeFetch(input, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
