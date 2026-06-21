import CustomerPage from './pages/CustomerPage.jsx';
import KitchenPage from './pages/KitchenPage.jsx';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function getWebSocketUrl(apiBaseUrl) {
  const url = apiBaseUrl
    ? new URL(apiBaseUrl)
    : new URL('/ws/notifications', window.location.origin);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  if (apiBaseUrl) {
    url.pathname = '/ws/notifications';
    url.search = '';
  }

  return url.toString();
}

function App() {
  const webSocketUrl = getWebSocketUrl(apiBaseUrl);
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
