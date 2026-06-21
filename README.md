# Food Delivery WebSocket Notifications

Simple Spring Boot + React notification demo for a food delivery order flow.

## Run Locally

Start the backend:

```powershell
cd backend
gradle bootRun
```

Start the React client in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the kitchen page at `http://127.0.0.1:5173/kitchen` and the customer page at `http://127.0.0.1:5173/customer`.

Enter an order id and customer name on the kitchen page, then use the `Order Placed`, `Preparing`, and `Delivered` buttons to publish order updates. The kitchen page only enables the next valid step, so an order must be placed before it can be prepared, and prepared before it can be delivered. Use `Clear` on the kitchen page to remove all notifications, reset the order status history, and start fresh.

Keep the customer page open in another tab to receive each update through `/ws/notifications`. The frontend now proxies websocket connections through the Vite dev server, so the app works correctly in Codespaces and with local backend forwarding.

In Codespaces, use the forwarded frontend and backend ports together. With the default setup:
- frontend: `5173`
- backend: `8080`

If you need an explicit override, copy `frontend/.env.example` to `frontend/.env` and set:

```env
VITE_API_BASE_URL=http://localhost:8080
```

The customer page groups updates into separate customer/order cards, with a vertical timeline for placed, preparing, and delivered. Live updates also appear as a banner toast at the top of the page. Use the kitchen page `Clear` button to remove all customer notification cards, reset the backend notification history, and notify any open customer pages.

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


## Screenshots
<img width="935" height="517" alt="image" src="https://github.com/user-attachments/assets/a09db8a2-8268-4b33-a9e2-46dedbed440a" />
<img width="958" height="533" alt="image" src="https://github.com/user-attachments/assets/aba34818-1184-48aa-b53a-b00890e00dd8" />

