import { WSEvent } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

type Handler = (event: WSEvent) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private shouldConnect = false;

  connect(token: string) {
    this.token = token;
    this.shouldConnect = true;
    this._connect();
  }

  private _connect() {
    if (!this.token || !this.shouldConnect) return;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.ws = new WebSocket(`${WS_URL}/ws?token=${this.token}`);

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as WSEvent;
        this.handlers.forEach((h) => h(data));
      } catch {}
    };

    this.ws.onopen = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (this.shouldConnect) {
        this.reconnectTimeout = setTimeout(() => this._connect(), 3000);
      }
    };
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const wsClient = new WebSocketClient();
