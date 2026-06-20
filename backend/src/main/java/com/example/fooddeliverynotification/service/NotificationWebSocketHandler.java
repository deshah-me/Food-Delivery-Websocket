package com.example.fooddeliverynotification.service;

import com.example.fooddeliverynotification.model.NotificationClearEvent;
import com.example.fooddeliverynotification.model.OrderNotification;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler implements NotificationPublisher {

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final ObjectMapper objectMapper;

    public NotificationWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessions.remove(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    public void publish(OrderNotification notification) {
        broadcast(toPayload(notification));
    }

    @Override
    public void publishClear(NotificationClearEvent event) {
        broadcast(toPayload(event));
    }

    int activeSessionCount() {
        return sessions.size();
    }

    private void broadcast(String payload) {
        sessions.removeIf(session -> !session.isOpen());
        sessions.forEach(session -> send(session, payload));
    }

    private String toPayload(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize notification", exception);
        }
    }

    private void send(WebSocketSession session, String payload) {
        try {
            synchronized (session) {
                session.sendMessage(new TextMessage(payload));
            }
        } catch (IOException exception) {
            sessions.remove(session);
        }
    }
}
