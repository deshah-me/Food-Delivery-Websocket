export const statusActions = [
  { status: 'PLACED', label: 'Order Placed', shortLabel: 'Placed' },
  { status: 'PREPARING', label: 'Preparing', shortLabel: 'Preparing' },
  { status: 'DELIVERED', label: 'Delivered', shortLabel: 'Delivered' },
];

export const maxNotificationsToKeep = 50;
export const statusIndex = Object.fromEntries(statusActions.map(({ status }, index) => [status, index]));

const statusMessages = {
  PLACED: 'Your order is placed.',
  PREPARING: 'Your order is being prepared.',
  DELIVERED: 'Your order has been delivered.',
};
const flowStatusMessages = {
  PLACED: 'Placed. Next step: Preparing',
  PREPARING: 'Preparing. Next step: Delivered',
  DELIVERED: 'Delivered. This order is complete.',
};

export const getStatusLabel = (status) => statusActions.find((action) => action.status === status)?.shortLabel ?? status;
export const getStatusMessage = (status) => statusMessages[status] ?? 'Your order status has changed.';
export const getStatusIndex = (status) => statusIndex[status] ?? -1;
export const canSendStatus = (status, currentStatus) => getStatusIndex(status) === getStatusIndex(currentStatus) + 1;
export const getFlowStatusMessage = (currentStatus, hasOrderFields) =>
  !hasOrderFields
    ? 'Enter an order id and customer name to start the order flow.'
    : currentStatus
      ? flowStatusMessages[currentStatus] ?? flowStatusMessages.DELIVERED
      : 'Next step: Order Placed';

export function getBlockedStatusMessage(status, currentStatus) {
  if (status === 'PREPARING' && !currentStatus) {
    return 'Place the order before preparing it.';
  }

  if (status === 'DELIVERED' && currentStatus !== 'PREPARING') {
    return 'Prepare the order before delivering it.';
  }

  if (status === 'PLACED' && currentStatus) {
    return 'This order is already placed.';
  }

  return 'This status is not available for the current order step.';
}

export const buildOrderKey = (orderId, customerName) => `${customerName.trim().toLowerCase()}::${orderId.trim().toLowerCase()}`;
export const getNotificationOrderKey = (notification) =>
  notification?.orderId && notification?.customerName
    ? buildOrderKey(notification.orderId, notification.customerName)
    : null;
export const isNotification = ({ status, orderId, customerName } = {}) => Boolean(status && orderId && customerName);
export const createLocalNotification = (orderId, customerName, status) => ({
  id: `local-${Date.now()}-${status}`,
  orderId,
  customerName,
  status,
  message: getStatusMessage(status),
  timestamp: new Date().toISOString(),
});
export const mergeProgressFromNotifications = (incoming, current) =>
  incoming.reduce((next, notification) => {
    if (!isNotification(notification)) return next;
    const key = getNotificationOrderKey(notification);
    const existing = next[key];
    if (!existing || shouldReplaceStatus(existing, notification)) {
      next[key] = { status: notification.status, timestamp: notification.timestamp };
    }
    return next;
  }, { ...current });

export const buildOrderTrackers = (notifications) => {
  const byOrder = [...notifications].reduce((map, notification) => {
    if (!isNotification(notification)) return map;
    const key = getNotificationOrderKey(notification);
    const tracker = map.get(key) ?? {
      key,
      customerName: notification.customerName,
      orderId: notification.orderId,
      latestStatus: notification.status,
      latestTimestamp: notification.timestamp,
      statuses: {},
    };
    const existingStatusNotification = tracker.statuses[notification.status];
    if (!existingStatusNotification || getTime(notification.timestamp) > getTime(existingStatusNotification.timestamp)) {
      tracker.statuses[notification.status] = notification;
    }
    if (shouldReplaceStatus({ status: tracker.latestStatus, timestamp: tracker.latestTimestamp }, notification)) {
      tracker.latestStatus = notification.status;
      tracker.latestTimestamp = notification.timestamp;
    }
    map.set(key, tracker);
    return map;
  }, new Map());

  return [...byOrder.values()].sort((left, right) => getTime(right.latestTimestamp) - getTime(left.latestTimestamp));
};

export const shouldReplaceStatus = (existing, notification) =>
  getStatusIndex(notification.status) !== getStatusIndex(existing.status)
    ? getStatusIndex(notification.status) > getStatusIndex(existing.status)
    : getTime(notification.timestamp) >= getTime(existing.timestamp);

export const getTrackerStepState = (status, latestStatus, notification) =>
  notification && status === latestStatus
    ? 'current'
    : notification || getStatusIndex(status) < getStatusIndex(latestStatus)
      ? 'complete'
      : 'pending';

export const getTrackerStepMessage = (status, latestStatus, notification) =>
  notification
    ? notification.message ?? getStatusMessage(status)
    : getStatusIndex(status) < getStatusIndex(latestStatus)
      ? 'Completed'
      : 'Pending';

export function formatNotificationTitle(notification) {
  const orderLabel = notification.orderId ? `Order ${notification.orderId}` : 'Order update';
  const customerLabel = notification.customerName ? `${notification.customerName} - ` : '';
  return `${customerLabel}${orderLabel}: ${notification.message ?? getStatusMessage(notification.status)}`;
}

export const mergeNotifications = (incoming, current) => {
  const byKey = [...incoming, ...current].reduce((map, notification) => {
    const key = notification.id ?? `${notification.status}-${notification.timestamp}`;
    if (!map.has(key)) map.set(key, notification);
    return map;
  }, new Map());

  return [...byKey.values()]
    .sort((left, right) => getTime(right.timestamp) - getTime(left.timestamp))
    .slice(0, maxNotificationsToKeep);
};

export function getTime(timestamp) {
  const time = new Date(timestamp).getTime();
  return Number.isNaN(time) ? 0 : time;
}
