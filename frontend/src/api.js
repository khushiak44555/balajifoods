// All data goes through the backend REST API. Override the base URL with VITE_API_URL
// only if the API is hosted on a different origin.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that it is running and you are online.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  menu: () => request('/menu').then((d) => d.menu),
  dashboard: () => request('/dashboard'),
  listOrders: (status = 'all') => request(`/orders?status=${encodeURIComponent(status)}`).then((d) => d.orders),
  getOrder: (id) => request(`/orders/${id}`).then((d) => d.order),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }).then((d) => d.order),
  updateOrder: (id, payload) => request(`/orders/${id}`, { method: 'PUT', body: payload }).then((d) => d.order),
  completeOrder: (id) => request(`/orders/${id}/complete`, { method: 'PATCH' }).then((d) => d.order),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
};

export const formatOrderNo = (n) => `#${String(n).padStart(3, '0')}`;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = (n) => inr.format(n || 0);

const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});
export const formatTime = (d) => (d ? timeFmt.format(new Date(d)) : '');
export const formatDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : '');
