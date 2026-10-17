import { useState } from 'react';
import { Modal, Spinner } from './components.jsx';
import { formatINR, formatOrderNo } from './api.js';

const MAX_QTY = 999;

// Create or edit an order. Prices shown here are for display only;
// the server recalculates every amount from its own menu.
export default function OrderForm({ menu, order, onSubmit, onClose }) {
  const isEdit = Boolean(order);
  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [qty, setQty] = useState(() => {
    const initial = Object.fromEntries(menu.map((m) => [m.id, 0]));
    order?.items.forEach((it) => {
      if (it.productId in initial) initial[it.productId] = it.quantity;
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setItemQty = (id, value) => {
    const n = Math.max(0, Math.min(MAX_QTY, Number.isFinite(value) ? Math.floor(value) : 0));
    setQty((q) => ({ ...q, [id]: n }));
    setError('');
  };

  const lines = menu.filter((m) => qty[m.id] > 0);
  const total = lines.reduce((sum, m) => sum + m.price * qty[m.id], 0);
  const itemCount = lines.reduce((sum, m) => sum + qty[m.id], 0);

  const submit = async (e) => {
    e?.preventDefault();
    if (saving) return;
    if (lines.length === 0) {
      setError('Add at least one item.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        customerName: customerName.trim(),
        items: lines.map((m) => ({ productId: m.id, quantity: qty[m.id] })),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit order ${formatOrderNo(order.orderNumber)}` : 'New order'}
      onClose={onClose}
      busy={saving}
      footer={
        <div className="form-foot">
          <div className="form-total">
            <span className="muted">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </span>
            <strong>{formatINR(total)}</strong>
          </div>
          <button type="submit" form="order-form" className="btn btn-primary btn-lg" disabled={saving || lines.length === 0}>
            {saving ? <Spinner small /> : isEdit ? 'Save changes' : 'Place order'}
          </button>
        </div>
      }
    >
      <form id="order-form" onSubmit={submit} className="order-form">
        <div className="menu-list">
          {menu.map((m, i) => {
            const q = qty[m.id];
            return (
              <div key={m.id} className={`menu-item${q > 0 ? ' is-active' : ''}`}>
                <div className="menu-info">
                  <div className="menu-name">{m.name}</div>
                  <div className="menu-meta">
                    {formatINR(m.price)} / {m.unit}
                    {m.description && <span className="muted"> · {m.description}</span>}
                  </div>
                  {q > 0 && <div className="menu-sub">{formatINR(m.price * q)}</div>}
                </div>
                <div className="stepper">
                  <button
                    type="button"
                    className="step-btn"
                    onClick={() => setItemQty(m.id, q - 1)}
                    disabled={q === 0 || saving}
                    aria-label={`Remove one ${m.name}`}
                  >
                    −
                  </button>
                  <input
                    className="step-input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={MAX_QTY}
                    value={q}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setItemQty(m.id, Number.parseInt(e.target.value, 10))}
                    aria-label={`${m.name} quantity`}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="step-btn step-plus"
                    onClick={() => setItemQty(m.id, q + 1)}
                    disabled={q >= MAX_QTY || saving}
                    aria-label={`Add one ${m.name}`}
                    data-autofocus={i === 0 ? true : undefined}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <label className="field">
          <span className="field-label">
            Customer name <span className="muted">(optional)</span>
          </span>
          <input
            type="text"
            className="input"
            value={customerName}
            maxLength={60}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Rahul"
            autoComplete="off"
            disabled={saving}
          />
        </label>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
