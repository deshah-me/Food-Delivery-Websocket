package com.example.fooddeliverynotification.service;

import com.example.fooddeliverynotification.model.NotificationClearEvent;
import com.example.fooddeliverynotification.model.OrderNotification;

public interface NotificationPublisher {

    void publish(OrderNotification notification);

    default void publishClear(NotificationClearEvent event) {
    }
}
