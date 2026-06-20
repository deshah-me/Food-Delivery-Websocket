package com.example.fooddeliverynotification.model;

public enum OrderStatus {
    PLACED("Your order is placed."),
    PREPARING("Your order is being prepared."),
    DELIVERED("Your order has been delivered.");

    private final String message;

    OrderStatus(String message) {
        this.message = message;
    }

    public String message() {
        return message;
    }
}
