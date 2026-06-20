package com.example.fooddeliverynotification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.fooddeliverynotification.model.OrderNotification;
import com.example.fooddeliverynotification.model.OrderStatus;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class OrderNotificationServiceTest {

    @Test
    void createsAndPublishesStatusSpecificNotification() {
        AtomicReference<OrderNotification> published = new AtomicReference<>();
        NotificationPublisher publisher = published::set;
        Clock fixedClock = Clock.fixed(Instant.parse("2026-06-20T04:00:00Z"), ZoneOffset.UTC);
        OrderNotificationService service = new OrderNotificationService(publisher, fixedClock);

        OrderNotification placed = service.publish(OrderStatus.PLACED, " ORD-42 ", " Priya ");
        OrderNotification notification = service.publish(OrderStatus.PREPARING, " ORD-42 ", " Priya ");

        assertThat(notification.id()).isNotBlank();
        assertThat(notification.orderId()).isEqualTo("ORD-42");
        assertThat(notification.customerName()).isEqualTo("Priya");
        assertThat(notification.status()).isEqualTo(OrderStatus.PREPARING);
        assertThat(notification.message()).isEqualTo("Your order is being prepared.");
        assertThat(notification.timestamp()).isEqualTo(Instant.parse("2026-06-20T04:00:00Z"));
        assertThat(published.get()).isEqualTo(notification);
        assertThat(service.recentNotifications()).containsExactly(notification, placed);
    }

    @Test
    void rejectsStatusUpdatesThatSkipTheOrderFlow() {
        NotificationPublisher publisher = notification -> {
        };
        Clock fixedClock = Clock.fixed(Instant.parse("2026-06-20T04:00:00Z"), ZoneOffset.UTC);
        OrderNotificationService service = new OrderNotificationService(publisher, fixedClock);

        assertThatThrownBy(() -> service.publish(OrderStatus.PREPARING, "ORD-42", "Priya"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void clearsNotificationsAndOrderProgress() {
        NotificationPublisher publisher = notification -> {
        };
        Clock fixedClock = Clock.fixed(Instant.parse("2026-06-20T04:00:00Z"), ZoneOffset.UTC);
        OrderNotificationService service = new OrderNotificationService(publisher, fixedClock);

        service.publish(OrderStatus.PLACED, "ORD-42", "Priya");
        service.clearNotifications();

        assertThat(service.recentNotifications()).isEmpty();
        assertThat(service.publish(OrderStatus.PLACED, "ORD-42", "Priya").status())
                .isEqualTo(OrderStatus.PLACED);
    }
}
