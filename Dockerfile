# Stage 1: Build frontend
FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .

# Build with root base path for Docker deployment
ENV VITE_BASE_PATH=/
RUN npm run build

# Stage 2: Build backend with frontend assets
FROM eclipse-temurin:21-jdk-alpine AS backend-builder

WORKDIR /app

# Copy frontend dist first
COPY --from=frontend-builder /app/frontend/dist ./backend/src/main/resources/static

# Copy backend gradle wrapper and config
COPY backend/gradle ./backend/gradle
COPY backend/gradlew ./backend/gradlew
COPY backend/gradlew.bat ./backend/gradlew.bat
COPY backend/settings.gradle ./backend/
COPY backend/build.gradle ./backend/

# Copy backend source
COPY backend/src ./backend/src

WORKDIR /app/backend

RUN chmod +x ./gradlew

RUN ./gradlew clean build -x test

# Stage 3: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy built JAR with frontend assets included
COPY --from=backend-builder /app/backend/build/libs/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/api/orders/notifications || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
