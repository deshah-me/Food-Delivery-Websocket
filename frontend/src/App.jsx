import { useMemo } from 'react';
import CustomerPage from './pages/CustomerPage.jsx';
import KitchenPage from './pages/KitchenPage.jsx';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? '';
}

function getWebSocketUrl(apiBaseUrl) {
  if (apiBaseUrl) {
    const url = new URL(apiBaseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/notifications';
    url.search = '';
    return url.toString();
  }

  const url = new URL('/ws/notifications', window.location.origin);
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function App() {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const webSocketUrl = useMemo(() => getWebSocketUrl(apiBaseUrl), [apiBaseUrl]);
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
  return pathname.toLowerCase().includes('/customer') ? 'customer' : 'kitchen';
}

export default App;
