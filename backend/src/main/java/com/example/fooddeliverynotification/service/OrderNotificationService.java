package com.example.fooddeliverynotification.service;

import com.example.fooddeliverynotification.model.NotificationClearEvent;
import com.example.fooddeliverynotification.model.OrderNotification;
import com.example.fooddeliverynotification.model.OrderStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderNotificationService {

    private static final int RECENT_NOTIFICATION_LIMIT = 50;

    private final NotificationPublisher notificationPublisher;
    private final Clock clock;
    private final ArrayDeque<OrderNotification> recentNotifications = new ArrayDeque<>();
    private final Map<String, OrderStatus> orderStatuses = new HashMap<>();
    private final Object recentNotificationsLock = new Object();

    public OrderNotificationService(NotificationPublisher notificationPublisher, Clock clock) {
        this.notificationPublisher = notificationPublisher;
        this.clock = clock;
    }

    public OrderNotification publish(OrderStatus status, String orderId, String customerName) {
        String trimmedOrderId = orderId.trim();
        String trimmedCustomerName = customerName.trim();
        OrderNotification notification = new OrderNotification(
                UUID.randomUUID().toString(),
                trimmedOrderId,
                trimmedCustomerName,
                status,
                status.message(),
                Instant.now(clock)
        );

        rememberIfValid(notification, orderKey(trimmedOrderId, trimmedCustomerName));
        notificationPublisher.publish(notification);
        return notification;
    }

    public List<OrderNotification> recentNotifications() {
        synchronized (recentNotificationsLock) {
            return List.copyOf(recentNotifications);
        }
    }

    public void clearNotifications() {
        synchronized (recentNotificationsLock) {
            recentNotifications.clear();
            orderStatuses.clear();
        }
        notificationPublisher.publishClear(new NotificationClearEvent(
                "NOTIFICATIONS_CLEARED",
                "Customer notifications cleared.",
                Instant.now(clock)
        ));
    }

    private void rememberIfValid(OrderNotification notification, String orderKey) {
        synchronized (recentNotificationsLock) {
            OrderStatus currentStatus = orderStatuses.get(orderKey);
            if (!OrderStatus.canMoveTo(currentStatus, notification.status())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        OrderStatus.invalidTransitionMessage(currentStatus, notification.status())
                );
            }

            recentNotifications.addFirst(notification);
            orderStatuses.put(orderKey, notification.status());
            while (recentNotifications.size() > RECENT_NOTIFICATION_LIMIT) {
                recentNotifications.removeLast();
            }
        }
    }

    private String orderKey(String orderId, String customerName) {
        return customerName.toLowerCase(Locale.ROOT) + "::" + orderId.toLowerCase(Locale.ROOT);
    }
}
