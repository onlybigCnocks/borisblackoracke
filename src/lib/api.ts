import { API_BASE_URL } from './data';

const api = {
  async scanTarget(target: string, tier: string, userId?: string) {
    const res = await fetch(`${API_BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, tier, user_id: userId }),
    });
    return res.json();
  },

  async getScanStatus(jobId: string) {
    const res = await fetch(`${API_BASE_URL}/scan/${jobId}`);
    return res.json();
  },

  async cancelScan(jobId: string) {
    const res = await fetch(`${API_BASE_URL}/scan/${jobId}/cancel`, { method: 'POST' });
    return res.json();
  },

  async marketScan(symbol: string) {
    const res = await fetch(`${API_BASE_URL}/market/scan/${symbol}`);
    return res.json();
  },

  async marketHistory() {
    const res = await fetch(`${API_BASE_URL}/market/history`);
    return res.json();
  },

  async marketTrending(count: number) {
    const res = await fetch(`${API_BASE_URL}/market/trending/${count}`);
    return res.json();
  },
};

export default api;
