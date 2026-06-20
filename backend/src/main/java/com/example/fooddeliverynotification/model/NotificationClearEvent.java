package com.example.fooddeliverynotification.model;

import java.time.Instant;

public record NotificationClearEvent(
        String type,
        String message,
        Instant timestamp
) {
}
