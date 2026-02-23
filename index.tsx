import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAnalytics } from './lib/analytics';
import { initMetaPixel } from './lib/metaPixel';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (supabaseUrl && typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = `${supabaseUrl}/storage/v1/object/public/site-assets/fav_icon.png`;
  document.head.appendChild(link);
}

initAnalytics();
initMetaPixel();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);