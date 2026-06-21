import { useMemo } from 'react';
import CustomerPage from './pages/CustomerPage.jsx';
import KitchenPage from './pages/KitchenPage.jsx';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

function getWebSocketUrl() {
  const wsOrigin = window.location.origin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  return `${wsOrigin}/ws/notifications`;
}

function App() {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const webSocketUrl = useMemo(() => getWebSocketUrl(), []);
  const page = getPageFromPath(window.location.pathname);

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Food Delivery</p>
            <h1 id="app-title">{page === 'customer' ? 'Customer Notifications' : 'Kitchen Status'}</h1>
          </div>
        </div>

        {page === 'customer' ? (
          <CustomerPage apiBaseUrl={apiBaseUrl} webSocketUrl={webSocketUrl} />
        ) : (
          <KitchenPage apiBaseUrl={apiBaseUrl} />
        )}
      </section>
    </main>
  );
}

function getPageFromPath(pathname) {
  // Handle both root and subdirectory deployments
  // For GitHub Pages: /Food-Delivery-Websocket/kitchen
  // For root: /kitchen
  return pathname.toLowerCase().includes('/customer') ? 'customer' : 'kitchen';
}

export default App;
