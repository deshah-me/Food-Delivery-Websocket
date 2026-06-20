package com.example.fooddeliverynotification.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OrderStatusRequest(
        @NotBlank @Size(max = 40) String orderId,
        @NotBlank @Size(max = 80) String customerName,
        @NotNull OrderStatus status
) {
}
