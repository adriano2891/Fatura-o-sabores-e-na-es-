// Guard against libraries attempting to reassign window.fetch when window has only a getter
try {
  const originalFetch = window.fetch;
  let customFetch = originalFetch;
  Object.defineProperty(window, 'fetch', {
    get() {
      return customFetch || originalFetch;
    },
    set(val) {
      customFetch = val;
    },
    configurable: true,
    enumerable: true,
  });
} catch {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

