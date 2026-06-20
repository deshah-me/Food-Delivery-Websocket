package com.example.fooddeliverynotification;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.fooddeliverynotification.model.OrderNotification;
import com.example.fooddeliverynotification.model.OrderStatus;
import com.example.fooddeliverynotification.model.OrderStatusRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class NotificationWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void broadcastsOrderStatusNotificationsToConnectedClients() throws Exception {
        CountDownLatch notificationReceived = new CountDownLatch(1);
        AtomicReference<String> payload = new AtomicReference<>();
        StandardWebSocketClient client = new StandardWebSocketClient();

        WebSocketSession session = client.execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                payload.set(message.getPayload());
                notificationReceived.countDown();
            }
        }, "ws://localhost:" + port + "/ws/notifications").get(3, TimeUnit.SECONDS);

        try {
            ResponseEntity<OrderNotification> response = restTemplate.postForEntity(
                    "/api/orders/status",
                    new OrderStatusRequest("ORD-1001", "Aarav", OrderStatus.PLACED),
                    OrderNotification.class
            );

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(notificationReceived.await(3, TimeUnit.SECONDS)).isTrue();

            OrderNotification notification = objectMapper.readValue(payload.get(), OrderNotification.class);
            assertThat(notification.id()).isNotBlank();
            assertThat(notification.orderId()).isEqualTo("ORD-1001");
            assertThat(notification.customerName()).isEqualTo("Aarav");
            assertThat(notification.status()).isEqualTo(OrderStatus.PLACED);
            assertThat(notification.message()).isEqualTo("Your order is placed.");
            assertThat(notification.timestamp()).isNotNull();
        } finally {
            session.close();
        }
    }

    @Test
    void rejectsUnknownOrderStatuses() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> request = new HttpEntity<>("{\"status\":\"CANCELLED\"}", headers);

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/orders/status",
                request,
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void returnsRecentNotificationsForCustomersWhoOpenThePageLater() {
        restTemplate.postForEntity(
                "/api/orders/status",
                new OrderStatusRequest("ORD-2002", "Meera", OrderStatus.PLACED),
                OrderNotification.class
        );
        restTemplate.postForEntity(
                "/api/orders/status",
                new OrderStatusRequest("ORD-2002", "Meera", OrderStatus.PREPARING),
                OrderNotification.class
        );
        restTemplate.postForEntity(
                "/api/orders/status",
                new OrderStatusRequest("ORD-2002", "Meera", OrderStatus.DELIVERED),
                OrderNotification.class
        );

        ResponseEntity<OrderNotification[]> response = restTemplate.getForEntity(
                "/api/orders/notifications",
                OrderNotification[].class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotEmpty();
        assertThat(response.getBody()[0].orderId()).isEqualTo("ORD-2002");
        assertThat(response.getBody()[0].customerName()).isEqualTo("Meera");
        assertThat(response.getBody()[0].status()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(response.getBody()[0].message()).isEqualTo("Your order has been delivered.");
    }

    @Test
    void rejectsOutOfSequenceOrderUpdates() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/orders/status",
                new OrderStatusRequest("ORD-3003", "Kabir", OrderStatus.DELIVERED),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void clearsRecentCustomerNotifications() throws Exception {
        restTemplate.postForEntity(
                "/api/orders/status",
                new OrderStatusRequest("ORD-6006", "Nisha", OrderStatus.PLACED),
                OrderNotification.class
        );
        CountDownLatch clearEventReceived = new CountDownLatch(1);
        AtomicReference<String> payload = new AtomicReference<>();
        StandardWebSocketClient client = new StandardWebSocketClient();

        WebSocketSession session = client.execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                payload.set(message.getPayload());
                clearEventReceived.countDown();
            }
        }, "ws://localhost:" + port + "/ws/notifications").get(3, TimeUnit.SECONDS);

        try {
            ResponseEntity<Void> clearResponse = restTemplate.exchange(
                    "/api/orders/notifications",
                    HttpMethod.DELETE,
                    null,
                    Void.class
            );

            ResponseEntity<OrderNotification[]> response = restTemplate.getForEntity(
                    "/api/orders/notifications",
                    OrderNotification[].class
            );

            assertThat(clearResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isEmpty();
            assertThat(clearEventReceived.await(3, TimeUnit.SECONDS)).isTrue();
            assertThat(payload.get()).contains("\"type\":\"NOTIFICATIONS_CLEARED\"");
        } finally {
            session.close();
        }
    }
}
