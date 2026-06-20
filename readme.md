# Food Delivery WebSocket Notifications

Simple Spring Boot + React notification demo for a food delivery order flow.

## Run Locally

Start the backend:

```powershell
cd backend
.\gradlew.bat bootRun
```

Start the React client in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the kitchen page at `http://127.0.0.1:5173/kitchen` and the customer page at `http://127.0.0.1:5173/customer`. These are separate pages with no in-app Kitchen/Customer toggle.

Enter an order id and customer name on the kitchen page, then use the `Order Placed`, `Preparing`, and `Delivered` buttons to publish order updates. The kitchen page only enables the next valid step, so an order must be placed before it can be prepared, and prepared before it can be delivered. Use `Clear` on the kitchen page to remove all notifications, reset the order status history, and start fresh.

Keep the customer page open in another tab to receive each update through `ws://localhost:8080/ws/notifications`. The customer page groups updates into separate customer/order cards, with a vertical timeline for placed, preparing, and delivered. Live updates also appear as a banner toast at the top of the page. Use the kitchen page `Clear` button to remove all customer notification cards, reset the backend notification history, and notify any open customer pages.

If the customer page opens after an order update, it also loads recent notifications from `GET /api/orders/notifications`, so existing updates are still visible.

## Tests

Backend:

```powershell
cd backend
.\gradlew.bat test
```

Frontend:

```powershell
cd frontend
npm test
```
