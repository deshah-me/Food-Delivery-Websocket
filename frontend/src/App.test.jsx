import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.close = vi.fn(() => {
      this.onclose?.();
    });
    MockWebSocket.instances.push(this);
  }

  open() {
    this.onopen?.();
  }

  emit(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

const statusMessages = {
  PLACED: 'Your order is placed.',
  PREPARING: 'Your order is being prepared.',
  DELIVERED: 'Your order has been delivered.',
};

function statusResponse(options) {
  const payload = JSON.parse(options.body);

  return {
    id: `${payload.orderId}-${payload.status}`,
    orderId: payload.orderId,
    customerName: payload.customerName,
    status: payload.status,
    message: statusMessages[payload.status],
    timestamp: '2026-06-20T04:00:00Z',
  };
}

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/kitchen');
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('fetch', vi.fn((url, options = {}) => {
      if (options.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 204,
        });
      }

      if (String(url).endsWith('/api/orders/notifications')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(statusResponse(options)),
      });
    }));
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'toast-1') });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows only kitchen controls and enables each status in order', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /kitchen status/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /live notifications/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /customer/i })).not.toBeInTheDocument();
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(screen.getByRole('button', { name: /^clear$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /order placed/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^preparing$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^delivered$/i })).toBeDisabled();

    await user.clear(screen.getByLabelText(/order id/i));
    await user.type(screen.getByLabelText(/order id/i), 'ORD-5001');
    await user.clear(screen.getByLabelText(/customer/i));
    await user.type(screen.getByLabelText(/customer/i), 'Aarav');
    await user.click(screen.getByRole('button', { name: /order placed/i }));

    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/orders/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: 'ORD-5001',
        customerName: 'Aarav',
        status: 'PLACED',
      }),
    });
    expect(await screen.findByText('ORD-5001 - placed')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^preparing$/i })).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: /order placed/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^delivered$/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^preparing$/i }));
    expect(await screen.findByText('ORD-5001 - preparing')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^delivered$/i })).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: /order placed/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^preparing$/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^delivered$/i }));
    expect(await screen.findByText('ORD-5001 - delivered')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /order placed/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^preparing$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^delivered$/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^clear$/i }));
    expect(fetch).toHaveBeenCalledWith('http://localhost:8080/api/orders/notifications', {
      method: 'DELETE',
    });
    expect(screen.getByLabelText(/order id/i)).toHaveValue('');
    expect(screen.getByLabelText(/customer/i)).toHaveValue('');
    expect(screen.queryByText('ORD-5001 - delivered')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /order placed/i })).toBeDisabled();
  });

  it('tracks each customer order separately and updates from WebSocket as a top banner', async () => {
    fetch.mockImplementation((url, options = {}) => {
      if (String(url).endsWith('/api/orders/notifications')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([
            {
              id: 'history-2',
              orderId: 'ORD-3001',
              customerName: 'Ravi',
              status: 'PLACED',
              message: 'Your order is placed.',
              timestamp: '2026-06-20T03:25:00Z',
            },
            {
              id: 'history-1a',
              orderId: 'ORD-4001',
              customerName: 'Meera',
              status: 'PLACED',
              message: 'Your order is placed.',
              timestamp: '2026-06-20T03:20:00Z',
            },
            {
              id: 'history-1b',
              orderId: 'ORD-4001',
              customerName: 'Meera',
              status: 'PREPARING',
              message: 'Your order is being prepared.',
              timestamp: '2026-06-20T03:30:00Z',
            },
          ]),
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    window.history.pushState({}, '', '/customer');
    render(<App />);

    expect(screen.getByRole('heading', { name: /customer notifications/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /order placed/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /kitchen/i })).not.toBeInTheDocument();
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:8080/ws/notifications');
    expect(await screen.findByText('2 orders')).toBeInTheDocument();

    const meeraCard = screen.getByText('Meera').closest('article');
    const raviCard = screen.getByText('Ravi').closest('article');
    expect(within(meeraCard).getByText('Order ORD-4001')).toBeInTheDocument();
    expect(within(meeraCard).getByText('Your order is being prepared.')).toBeInTheDocument();
    expect(meeraCard.querySelectorAll('.timeline-step-card')).toHaveLength(3);
    expect(within(raviCard).getByText('Order ORD-3001')).toBeInTheDocument();
    expect(within(raviCard).getByText('Your order is placed.')).toBeInTheDocument();
    expect(raviCard.querySelectorAll('.timeline-step-card')).toHaveLength(3);

    act(() => {
      MockWebSocket.instances[0].open();
    });

    const timestamp = '2026-06-20T04:00:00Z';

    act(() => {
      MockWebSocket.instances[0].emit({
        status: 'PLACED',
        message: 'Your order is placed.',
        id: 'live-1',
        orderId: 'ORD-5001',
        customerName: 'Aarav',
        timestamp,
      });
    });

    expect(within(screen.getByTestId('top-banner')).getByText('Aarav - Order ORD-5001: Your order is placed.')).toBeInTheDocument();
    const aaravCard = screen.getByText('Aarav').closest('article');
    expect(within(aaravCard).getByText('Order ORD-5001')).toBeInTheDocument();
    expect(within(aaravCard).getByText('Your order is placed.')).toBeInTheDocument();
    expect(within(aaravCard).getByText(new Date(timestamp).toLocaleTimeString())).toBeInTheDocument();
    expect(aaravCard.querySelectorAll('.timeline-step-card')).toHaveLength(3);

    act(() => {
      MockWebSocket.instances[0].emit({
        type: 'NOTIFICATIONS_CLEARED',
        message: 'Customer notifications cleared.',
        timestamp: '2026-06-20T04:05:00Z',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('0 orders')).toBeInTheDocument();
    });
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
    expect(screen.queryByText('Aarav')).not.toBeInTheDocument();
  });

  it('shows a top banner when the kitchen request fails', async () => {
    fetch.mockImplementation((url) => {
      if (String(url).endsWith('/api/orders/notifications')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });
      }

      return Promise.resolve({ ok: false, status: 500 });
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /order placed/i }));

    await waitFor(() => {
      expect(within(screen.getByTestId('top-banner')).getByText('Unable to send order update.')).toBeInTheDocument();
    });
  });
});
