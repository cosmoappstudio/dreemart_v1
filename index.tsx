import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAnalytics } from './lib/analytics';
import { initMetaTracking } from './lib/metaPixel';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (supabaseUrl && typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = `${supabaseUrl}/storage/v1/object/public/site-assets/fav_icon.png`;
  document.head.appendChild(link);
}

const gtmId = import.meta.env.VITE_GTM_ID as string | undefined;
if (gtmId && typeof document !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
  (function (w: Window & { dataLayer: unknown[] }, d: Document, s: string, l: string, i: string) {
    w[l] = w[l] || [];
    (w[l] as unknown[]).push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s) as HTMLScriptElement;
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i;
    if (f?.parentNode) f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', gtmId);
  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = 'https://www.googletagmanager.com/ns.html?id=' + gtmId;
  iframe.height = '0';
  iframe.width = '0';
  iframe.style.cssText = 'display:none;visibility:hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);
}

initAnalytics();
initMetaTracking();

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