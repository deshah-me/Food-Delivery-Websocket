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

    public static boolean canMoveTo(OrderStatus currentStatus, OrderStatus nextStatus) {
        return nextStatus != null && (currentStatus == null
                ? nextStatus == PLACED
                : currentStatus.ordinal() + 1 == nextStatus.ordinal());
    }

    public static String invalidTransitionMessage(OrderStatus currentStatus, OrderStatus nextStatus) {
        if (currentStatus == DELIVERED) return "Delivered orders cannot be updated again.";
        if (nextStatus == PREPARING && currentStatus == null) return "Order must be placed before it can be prepared.";
        if (nextStatus == DELIVERED && currentStatus != PREPARING) return "Order must be prepared before it can be delivered.";
        return "Order status update is out of sequence.";
    }
}
