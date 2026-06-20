import { useEffect, useState } from 'react';
import {
  buildOrderKey,
  canSendStatus,
  createLocalNotification,
  getBlockedStatusMessage,
  getFlowStatusMessage,
  isNotification,
  mergeProgressFromNotifications,
  statusActions,
} from '../business/orderStatus.js';
import TopBanner from './TopBanner.jsx';

function KitchenPage({ apiBaseUrl }) {
  const [orderId, setOrderId] = useState('ORD-1001');
  const [customerName, setCustomerName] = useState('Customer');
  const [submittingStatus, setSubmittingStatus] = useState(null);
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const [lastSentStatus, setLastSentStatus] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);
  const [orderProgress, setOrderProgress] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadCurrentProgress() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/orders/notifications`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const recentNotifications = await response.json();
        setOrderProgress((current) => mergeProgressFromNotifications(
          Array.isArray(recentNotifications) ? recentNotifications : [],
          current,
        ));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setBannerMessage({ message: 'Unable to load recent order status.', tone: 'error' });
        }
      }
    }

    loadCurrentProgress();

    return () => controller.abort();
  }, [apiBaseUrl]);

  const trimmedOrderId = orderId.trim();
  const trimmedCustomerName = customerName.trim();
  const hasOrderFields = Boolean(trimmedOrderId && trimmedCustomerName);
  const currentOrderStatus = hasOrderFields
    ? orderProgress[buildOrderKey(trimmedOrderId, trimmedCustomerName)]?.status ?? null
    : null;

  async function clearNotifications() {
    setClearingNotifications(true);
    setBannerMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/orders/notifications`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      setOrderId('');
      setCustomerName('');
      setLastSentStatus(null);
      setOrderProgress({});
      setBannerMessage({ message: 'All customer notifications cleared.', tone: 'success' });
    } catch (error) {
      setBannerMessage({ message: 'Unable to clear customer notifications.', tone: 'error' });
    } finally {
      setClearingNotifications(false);
    }
  }

  async function sendStatus(status) {
    if (!trimmedOrderId || !trimmedCustomerName) {
      setBannerMessage({ message: 'Enter both order id and customer name.', tone: 'error' });
      return;
    }

    if (!canSendStatus(status, currentOrderStatus)) {
      setBannerMessage({ message: getBlockedStatusMessage(status, currentOrderStatus), tone: 'error' });
      return;
    }

    setSubmittingStatus(status);
    setBannerMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/orders/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: trimmedOrderId,
          customerName: trimmedCustomerName,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const notification = await response.json();
      setOrderProgress((current) => mergeProgressFromNotifications([
        isNotification(notification)
          ? notification
          : createLocalNotification(trimmedOrderId, trimmedCustomerName, status),
      ], current));
      setLastSentStatus(`${trimmedOrderId} - ${status.toLowerCase()}`);
    } catch (error) {
      setBannerMessage({ message: 'Unable to send order update.', tone: 'error' });
    } finally {
      setSubmittingStatus(null);
    }
  }

  return (
    <>
      <TopBanner message={bannerMessage?.message} tone={bannerMessage?.tone} />

      <section className="page-layout single-column" aria-labelledby="controls-title">
        <section className="panel control-panel" aria-labelledby="controls-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Kitchen</p>
              <h2 id="controls-title">Update Order Status</h2>
            </div>
            <div className="panel-actions">
              {lastSentStatus && <span className="counter">{lastSentStatus}</span>}
              <button
                className="clear-button"
                disabled={submittingStatus !== null || clearingNotifications}
                onClick={clearNotifications}
                type="button"
              >
                {clearingNotifications ? 'Clearing' : 'Clear'}
              </button>
            </div>
          </div>

          <div className="order-fields">
            <label className="field-group">
              <span>Order ID</span>
              <input
                maxLength={40}
                onChange={(event) => setOrderId(event.target.value)}
                value={orderId}
              />
            </label>
            <label className="field-group">
              <span>Customer</span>
              <input
                maxLength={80}
                onChange={(event) => setCustomerName(event.target.value)}
                value={customerName}
              />
            </label>
          </div>

          <p className="flow-note">{getFlowStatusMessage(currentOrderStatus, hasOrderFields)}</p>

          <div className="status-actions">
            {statusActions.map((action) => {
              const isSubmitting = submittingStatus === action.status;
              const canSend = hasOrderFields && canSendStatus(action.status, currentOrderStatus);
              const isDisabled = submittingStatus !== null || clearingNotifications || !canSend;

              return (
                <button
                  className={`status-button ${action.status.toLowerCase()} ${isSubmitting ? 'waiting' : ''}`}
                  disabled={isDisabled}
                  key={action.status}
                  onClick={() => sendStatus(action.status)}
                  title={!canSend && hasOrderFields ? getBlockedStatusMessage(action.status, currentOrderStatus) : undefined}
                  type="button"
                >
                  <span className="button-mark" aria-hidden="true">
                    {action.shortLabel.slice(0, 1)}
                  </span>
                  <span>{isSubmitting ? 'Sending' : action.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </>
  );
}

export default KitchenPage;
