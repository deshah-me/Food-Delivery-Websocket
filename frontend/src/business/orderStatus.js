export const statusActions = [
  {
    status: 'PLACED',
    label: 'Order Placed',
    shortLabel: 'Placed',
  },
  {
    status: 'PREPARING',
    label: 'Preparing',
    shortLabel: 'Preparing',
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    shortLabel: 'Delivered',
  },
];

export const maxNotificationsToKeep = 50;

const statusSequence = statusActions.map((action) => action.status);
const statusIndex = Object.fromEntries(statusSequence.map((status, index) => [status, index]));

const statusMessages = {
  PLACED: 'Your order is placed.',
  PREPARING: 'Your order is being prepared.',
  DELIVERED: 'Your order has been delivered.',
};

export function getStatusLabel(status) {
  return statusActions.find((action) => action.status === status)?.shortLabel ?? status;
}

export function getStatusMessage(status) {
  return statusMessages[status] ?? 'Your order status has changed.';
}

export function getStatusIndex(status) {
  return statusIndex[status] ?? -1;
}

export function canSendStatus(status, currentStatus) {
  if (!currentStatus) {
    return status === 'PLACED';
  }

  if (currentStatus === 'PLACED') {
    return status === 'PREPARING';
  }

  if (currentStatus === 'PREPARING') {
    return status === 'DELIVERED';
  }

  return false;
}

export function getFlowStatusMessage(currentStatus, hasOrderFields) {
  if (!hasOrderFields) {
    return 'Enter an order id and customer name to start the order flow.';
  }

  if (!currentStatus) {
    return 'Next step: Order Placed';
  }

  if (currentStatus === 'PLACED') {
    return 'Placed. Next step: Preparing';
  }

  if (currentStatus === 'PREPARING') {
    return 'Preparing. Next step: Delivered';
  }

  return 'Delivered. This order is complete.';
}

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

export function buildOrderKey(orderId, customerName) {
  return `${customerName.trim().toLowerCase()}::${orderId.trim().toLowerCase()}`;
}

export function getNotificationOrderKey(notification) {
  if (!notification?.orderId || !notification?.customerName) {
    return null;
  }

  return buildOrderKey(notification.orderId, notification.customerName);
}

export function isNotification(value) {
  return Boolean(value?.status && value?.orderId && value?.customerName);
}

export function createLocalNotification(orderId, customerName, status) {
  return {
    id: `local-${Date.now()}-${status}`,
    orderId,
    customerName,
    status,
    message: getStatusMessage(status),
    timestamp: new Date().toISOString(),
  };
}

export function mergeProgressFromNotifications(incoming, current) {
  const next = { ...current };

  incoming.forEach((notification) => {
    if (!isNotification(notification)) {
      return;
    }

    const key = getNotificationOrderKey(notification);
    const existing = next[key];

    if (!existing || shouldReplaceStatus(existing, notification)) {
      next[key] = {
        status: notification.status,
        timestamp: notification.timestamp,
      };
    }
  });

  return next;
}

export function buildOrderTrackers(notifications) {
  const byOrder = new Map();

  notifications.forEach((notification) => {
    if (!isNotification(notification)) {
      return;
    }

    const key = getNotificationOrderKey(notification);
    const tracker = byOrder.get(key) ?? {
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

    if (shouldReplaceStatus({
      status: tracker.latestStatus,
      timestamp: tracker.latestTimestamp,
    }, notification)) {
      tracker.latestStatus = notification.status;
      tracker.latestTimestamp = notification.timestamp;
    }

    byOrder.set(key, tracker);
  });

  return Array.from(byOrder.values())
    .sort((left, right) => getTime(right.latestTimestamp) - getTime(left.latestTimestamp));
}

export function shouldReplaceStatus(existing, notification) {
  const existingStatusIndex = getStatusIndex(existing.status);
  const incomingStatusIndex = getStatusIndex(notification.status);

  if (incomingStatusIndex !== existingStatusIndex) {
    return incomingStatusIndex > existingStatusIndex;
  }

  return getTime(notification.timestamp) >= getTime(existing.timestamp);
}

export function getTrackerStepState(status, latestStatus, notification) {
  if (notification && status === latestStatus) {
    return 'current';
  }

  if (notification || getStatusIndex(status) < getStatusIndex(latestStatus)) {
    return 'complete';
  }

  return 'pending';
}

export function getTrackerStepMessage(status, latestStatus, notification) {
  if (notification) {
    return notification.message ?? getStatusMessage(status);
  }

  if (getStatusIndex(status) < getStatusIndex(latestStatus)) {
    return 'Completed';
  }

  return 'Pending';
}

export function formatNotificationTitle(notification) {
  const orderLabel = notification.orderId ? `Order ${notification.orderId}` : 'Order update';
  const customerLabel = notification.customerName ? `${notification.customerName} - ` : '';
  return `${customerLabel}${orderLabel}: ${notification.message ?? getStatusMessage(notification.status)}`;
}

export function mergeNotifications(incoming, current) {
  const byKey = new Map();

  [...incoming, ...current].forEach((notification) => {
    const key = notification.id ?? `${notification.status}-${notification.timestamp}`;
    if (!byKey.has(key)) {
      byKey.set(key, notification);
    }
  });

  return Array.from(byKey.values())
    .sort((left, right) => getTime(right.timestamp) - getTime(left.timestamp))
    .slice(0, maxNotificationsToKeep);
}

export function getTime(timestamp) {
  const time = new Date(timestamp).getTime();
  return Number.isNaN(time) ? 0 : time;
}
