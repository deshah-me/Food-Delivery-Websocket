package com.example.fooddeliverynotification.model;

import java.time.Instant;

public record OrderNotification(
        String id,
        String orderId,
        String customerName,
        OrderStatus status,
        String message,
        Instant timestamp
) {
}
