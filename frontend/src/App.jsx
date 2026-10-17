import { useCallback, useEffect, useRef, useState } from 'react';
import { api, formatDateTime, formatINR, formatOrderNo, formatTime } from './api.js';
import { ConfirmDialog, Modal, Spinner, StatusBadge, Toasts } from './components.jsx';
import OrderForm from './OrderForm.jsx';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];
const REFRESH_MS = 15000;

const itemQty = (order) => order.items.reduce((s, i) => s + i.quantity, 0);

export default function App() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState(null); // { order?: Order }
  const [details, setDetails] = useState(null); // Order
  const [confirmDelete, setConfirmDelete] = useState(null); // Order
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3000);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    const requested = filterRef.current;
    if (!silent) setLoading(true);
    try {
      const [list, dash] = await Promise.all([api.listOrders(requested), api.dashboard()]);
      if (requested !== filterRef.current) return; // filter changed meanwhile
      setOrders(list);
      setStats(dash);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.menu().then(setMenu).catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [filter, refresh]);

  // Keep counts fresh if several devices take orders at once.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const openNew = () => {
    if (menu.length === 0) return toast('Menu is still loading, try again in a moment.', 'error');
    setForm({});
  };

  const saveOrder = async (payload) => {
    const editing = form?.order;
    const saved = editing ? await api.updateOrder(editing._id, payload) : await api.createOrder(payload);
    setForm(null);
    toast(
      editing
        ? `Order ${formatOrderNo(saved.orderNumber)} updated · ${formatINR(saved.totalAmount)}`
        : `Order ${formatOrderNo(saved.orderNumber)} placed · ${formatINR(saved.totalAmount)}`
    );
    refresh({ silent: true });
  };

  const complete = async (order) => {
    setBusyId(order._id);
    try {
      const updated = await api.completeOrder(order._id);
      toast(`Order ${formatOrderNo(updated.orderNumber)} completed`);
      if (details?._id === updated._id) setDetails(updated);
      await refresh({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    const order = confirmDelete;
    setDeleting(true);
    try {
      await api.deleteOrder(order._id);
      toast(`Order ${formatOrderNo(order.orderNumber)} deleted`);
      setConfirmDelete(null);
      await refresh({ silent: true });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openDetails = async (order) => {
    setDetails(order);
    try {
      setDetails(await api.getOrder(order._id));
    } catch (err) {
      setDetails(null);
      toast(err.message, 'error');
      refresh({ silent: true });
    }
  };

  const counts = { all: stats ? stats.pendingOrders + stats.completedOrders : null, pending: stats?.pendingOrders, completed: stats?.completedOrders };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              B
            </div>
            <div>
              <h1 className="brand-name">Balaji Foods</h1>
              <p className="brand-tag">Pav Bhaji · Mojito · Order Desk</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-new" onClick={openNew}>
            <span className="plus">+</span> New Order
          </button>
        </div>
      </header>

      <main className="container">
        <section className="stats" aria-label="Summary">
          <StatCard label="Pending orders" value={stats?.pendingOrders} tone="pending" />
          <StatCard label="Completed orders" value={stats?.completedOrders} tone="done" />
          <StatCard
            label="Today's completed sales"
            value={stats ? formatINR(stats.todaySales) : null}
            hint={stats ? `${stats.todayCompletedOrders} order${stats.todayCompletedOrders === 1 ? '' : 's'} today (IST)` : ''}
            tone="sales"
          />
        </section>

        <section className="orders-panel">
          <div className="orders-head">
            <h2>Orders</h2>
            <div className="filters" role="tablist" aria-label="Filter orders">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`filter${filter === f.key ? ' is-active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  {counts[f.key] != null && <span className="filter-count">{counts[f.key]}</span>}
                </button>
              ))}
            </div>
          </div>

          {loadError && (
            <div className="banner-error" role="alert">
              <span>{loadError}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => refresh()}>
                Retry
              </button>
            </div>
          )}

          {loading && orders.length === 0 ? (
            <div className="state">
              <Spinner />
              <p>Loading orders…</p>
            </div>
          ) : orders.length === 0 && !loadError ? (
            <div className="state">
              <div className="state-icon" aria-hidden="true">
                🍽️
              </div>
              <p className="state-title">{filter === 'all' ? 'No orders yet' : `No ${filter} orders`}</p>
              <p className="muted">
                {filter === 'all' ? 'Tap “New Order” to take the first order.' : 'Orders will show up here.'}
              </p>
              {filter === 'all' && (
                <button type="button" className="btn btn-primary" onClick={openNew}>
                  + New Order
                </button>
              )}
            </div>
          ) : (
            <ul className={`order-list${loading ? ' is-loading' : ''}`}>
              {orders.map((o) => (
                <OrderRow
                  key={o._id}
                  order={o}
                  busy={busyId === o._id}
                  onOpen={() => openDetails(o)}
                  onComplete={() => complete(o)}
                  onEdit={() => setForm({ order: o })}
                  onDelete={() => setConfirmDelete(o)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      {form && menu.length > 0 && <OrderForm menu={menu} order={form.order} onSubmit={saveOrder} onClose={() => setForm(null)} />}

      {details && (
        <OrderDetails
          order={details}
          busy={busyId === details._id}
          onClose={() => setDetails(null)}
          onComplete={() => complete(details)}
          onEdit={() => {
            setForm({ order: details });
            setDetails(null);
          }}
          onDelete={() => {
            setConfirmDelete(details);
            setDetails(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete order ${formatOrderNo(confirmDelete.orderNumber)}?`}
          message={`This permanently removes the order${confirmDelete.customerName ? ` for ${confirmDelete.customerName}` : ''} (${formatINR(
            confirmDelete.totalAmount
          )}). The order number will not be reused.`}
          confirmLabel="Delete order"
          danger
          busy={deleting}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? <span className="skeleton" />}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function OrderRow({ order, busy, onOpen, onComplete, onEdit, onDelete }) {
  const pending = order.status === 'pending';
  return (
    <li className={`order-row status-${order.status}`}>
      <button type="button" className="order-main" onClick={onOpen} aria-label={`View order ${formatOrderNo(order.orderNumber)}`}>
        <div className="order-id">
          <span className="order-no">{formatOrderNo(order.orderNumber)}</span>
          <span className="order-time">{formatTime(order.createdAt)}</span>
        </div>
        <div className="order-info">
          {order.customerName && <div className="order-customer">{order.customerName}</div>}
          <div className="order-items">
            {order.items.map((it) => (
              <span key={it.productId} className="chip">
                <b>{it.quantity}×</b> {it.name}
              </span>
            ))}
          </div>
        </div>
        <div className="order-meta">
          <span className="order-total">{formatINR(order.totalAmount)}</span>
          <span className="order-qty muted">Qty {itemQty(order)}</span>
          <StatusBadge status={order.status} />
        </div>
      </button>
      <div className="order-actions">
        {pending && (
          <button type="button" className="btn btn-success" onClick={onComplete} disabled={busy}>
            {busy ? <Spinner small /> : '✓ Complete'}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onEdit} disabled={busy}>
          Edit
        </button>
        <button type="button" className="btn btn-ghost btn-danger-text" onClick={onDelete} disabled={busy} aria-label={`Delete order ${formatOrderNo(order.orderNumber)}`}>
          Delete
        </button>
      </div>
    </li>
  );
}

function OrderDetails({ order, busy, onClose, onComplete, onEdit, onDelete }) {
  const pending = order.status === 'pending';
  return (
    <Modal
      title={`Order ${formatOrderNo(order.orderNumber)}`}
      onClose={onClose}
      footer={
        <div className="details-actions">
          <button type="button" className="btn btn-ghost btn-danger-text" onClick={onDelete} disabled={busy}>
            Delete
          </button>
          <button type="button" className="btn btn-ghost" onClick={onEdit} disabled={busy}>
            Edit
          </button>
          {pending && (
            <button type="button" className="btn btn-success" onClick={onComplete} disabled={busy} data-autofocus>
              {busy ? <Spinner small /> : '✓ Mark completed'}
            </button>
          )}
        </div>
      }
    >
      <div className="details">
        <div className="details-top">
          <div>
            <div className="muted small">Customer</div>
            <div className="details-customer">{order.customerName || 'Walk-in'}</div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <table className="bill">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.productId}>
                <td>{it.name}</td>
                <td className="num">{it.quantity}</td>
                <td className="num">{formatINR(it.unitPrice)}</td>
                <td className="num">{formatINR(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Total</td>
              <td className="num">{formatINR(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <dl className="timeline">
          <div>
            <dt>Placed</dt>
            <dd>{formatDateTime(order.createdAt)}</dd>
          </div>
          {order.updatedAt && order.updatedAt !== order.createdAt && (
            <div>
              <dt>Last updated</dt>
              <dd>{formatDateTime(order.updatedAt)}</dd>
            </div>
          )}
          {order.completedAt && (
            <div>
              <dt>Completed</dt>
              <dd>{formatDateTime(order.completedAt)}</dd>
            </div>
          )}
        </dl>
      </div>
    </Modal>
  );
}
