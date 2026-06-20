package com.example.fooddeliverynotification.controller;

import com.example.fooddeliverynotification.model.OrderNotification;
import com.example.fooddeliverynotification.model.OrderStatusRequest;
import com.example.fooddeliverynotification.service.OrderNotificationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderNotificationController {

    private final OrderNotificationService orderNotificationService;

    public OrderNotificationController(OrderNotificationService orderNotificationService) {
        this.orderNotificationService = orderNotificationService;
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<OrderNotification>> recentNotifications() {
        return ResponseEntity.ok(orderNotificationService.recentNotifications());
    }

    @DeleteMapping("/notifications")
    public ResponseEntity<Void> clearNotifications() {
        orderNotificationService.clearNotifications();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/status")
    public ResponseEntity<OrderNotification> updateStatus(@Valid @RequestBody OrderStatusRequest request) {
        return ResponseEntity.ok(orderNotificationService.publish(
                request.status(),
                request.orderId(),
                request.customerName()
        ));
    }
}
