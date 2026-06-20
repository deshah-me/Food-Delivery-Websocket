import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildOrderTrackers,
  formatNotificationTitle,
  getStatusIndex,
  getStatusLabel,
  getTrackerStepMessage,
  getTrackerStepState,
  mergeNotifications,
  statusActions,
} from '../business/orderStatus.js';
import { useNotificationSocket } from '../websocket/useNotificationSocket.js';
import TopBanner from './TopBanner.jsx';

const stepStateLabels = {
  complete: 'Done',
  current: 'Current',
  pending: 'Pending',
};

function CustomerPage({ apiBaseUrl, webSocketUrl }) {
  const [notifications, setNotifications] = useState([]);
  const [bannerMessage, setBannerMessage] = useState(null);
  const toastTimers = useRef(new Map());
  const orderTrackers = useMemo(() => buildOrderTrackers(notifications), [notifications]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecentNotifications() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/orders/notifications`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const recentNotifications = await response.json();
        setNotifications((current) => mergeNotifications(
          Array.isArray(recentNotifications) ? recentNotifications : [],
          current,
        ));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setBannerMessage({ id: 'history-error', message: 'Unable to load customer notifications.', tone: 'error' });
        }
      }
    }

    loadRecentNotifications();

    return () => controller.abort();
  }, [apiBaseUrl]);

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timerId) => window.clearTimeout(timerId));
      toastTimers.current.clear();
    };
  }, []);

  const showBanner = useCallback((message) => {
    const id = crypto.randomUUID?.() ?? `toast-${Date.now()}`;
    const existingTimer = toastTimers.current.get(id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setBannerMessage({ id, message });

    const timerId = window.setTimeout(() => {
      setBannerMessage((current) => (current?.id === id ? null : current));
      toastTimers.current.delete(id);
    }, 3600);

    toastTimers.current.set(id, timerId);
  }, []);

  const handleNotification = useCallback((notification) => {
    if (notification?.type === 'NOTIFICATIONS_CLEARED') {
      setNotifications([]);
      showBanner(notification.message ?? 'Customer notifications cleared.');
      return;
    }

    setNotifications((current) => mergeNotifications([notification], current));
    showBanner(formatNotificationTitle(notification));
  }, [showBanner]);

  const connectionState = useNotificationSocket(webSocketUrl, handleNotification);

  return (
    <>
      <TopBanner message={bannerMessage?.message} tone={bannerMessage?.tone} />

      <section className="page-layout tracker-layout" aria-labelledby="feed-title">
        <section className="panel feed-panel" aria-labelledby="feed-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Customer</p>
              <h2 id="feed-title">Live Notifications</h2>
            </div>
            <div className="panel-actions">
              <span className={`connection-pill ${connectionState}`}>{connectionState}</span>
              <span className="counter">{orderTrackers.length} orders</span>
            </div>
          </div>

          <div className="tracker-grid">
            {orderTrackers.length === 0 ? (
              <p className="empty-state">No notifications yet.</p>
            ) : (
              orderTrackers.map((tracker) => (
                <OrderTimelineCard key={tracker.key} tracker={tracker} />
              ))
            )}
          </div>
        </section>
      </section>
    </>
  );
}

function OrderTimelineCard({ tracker }) {
  return (
    <article className="tracker-card" key={tracker.key}>
      <div className="tracker-card-header">
        <div>
          <strong>{tracker.customerName}</strong>
          <span>Order {tracker.orderId}</span>
        </div>
        <span className={`tracker-latest ${tracker.latestStatus.toLowerCase()}`}>
          {getStatusLabel(tracker.latestStatus)}
        </span>
      </div>

      <div className="timeline-list" aria-label={`${tracker.customerName} order ${tracker.orderId} status timeline`}>
        {statusActions.map((action) => {
          const notification = tracker.statuses[action.status];
          const stepState = getTrackerStepState(action.status, tracker.latestStatus, notification);

          return (
            <div className={`timeline-step ${stepState}`} key={action.status}>
              <span className={`timeline-marker ${action.status.toLowerCase()}`}>
                {getStatusIndex(action.status) + 1}
              </span>
              <div className="timeline-step-card">
                <div className="timeline-step-header">
                  <strong>{action.shortLabel}</strong>
                  <span>{stepStateLabels[stepState]}</span>
                </div>
                <span className="step-message">
                  {getTrackerStepMessage(action.status, tracker.latestStatus, notification)}
                </span>
                {notification && (
                  <time>{new Date(notification.timestamp).toLocaleTimeString()}</time>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default CustomerPage;
