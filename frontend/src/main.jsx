import * as React from 'react';
import { createRoot } from 'react-dom/client';
const { StrictMode, Suspense, lazy } = React;
const DatabaseManager = lazy(() => import('./DatabaseManager.jsx'));

if (typeof globalThis !== 'undefined' && !globalThis.React) {
  globalThis.React = React;
}

function mountApp() {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    // Keep a clear signal in the console instead of crashing with React #299.
    console.error('OneDB: #root element was not found.');
    return;
  }

  createRoot(rootEl).render(
    <StrictMode>
      <Suspense fallback={<div className="min-h-screen bg-[#18181b]" />}>
        <DatabaseManager />
      </Suspense>
    </StrictMode>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
