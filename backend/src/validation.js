import mongoose from 'mongoose';
import { MENU_BY_ID } from './menu.js';
import { ORDER_STATUSES } from './models/Order.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const MAX_QTY = 999;
const MAX_NAME = 60;

export function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id) || String(new mongoose.Types.ObjectId(id)) !== id) {
    throw new HttpError(400, 'Invalid order ID');
  }
}

export function parseCustomerName(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new HttpError(400, 'Customer name must be text');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length > MAX_NAME) throw new HttpError(400, `Customer name must be at most ${MAX_NAME} characters`);
  return name;
}

// Builds priced line items from client input. Only productId and quantity are read;
// any client-sent prices, names or totals are ignored.
export function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'Add at least one item to the order');
  }
  if (rawItems.length > 20) throw new HttpError(400, 'Too many line items');

  const quantities = new Map();
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') throw new HttpError(400, 'Each item must be an object');
    const { productId, quantity } = raw;
    if (typeof productId !== 'string' || !MENU_BY_ID.has(productId)) {
      throw new HttpError(400, `Unknown product: ${String(productId).slice(0, 40)}`);
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY) {
      throw new HttpError(400, `Quantity for ${MENU_BY_ID.get(productId).name} must be a whole number between 1 and ${MAX_QTY}`);
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const items = [];
  for (const [productId, quantity] of quantities) {
    if (quantity === 0) continue;
    if (quantity > MAX_QTY) throw new HttpError(400, `Quantity too large for ${MENU_BY_ID.get(productId).name}`);
    const product = MENU_BY_ID.get(productId);
    items.push({
      productId,
      name: product.name,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    });
  }
  if (items.length === 0) throw new HttpError(400, 'Add at least one item to the order');

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  return { items, totalAmount };
}

export function parseStatus(value) {
  if (!ORDER_STATUSES.includes(value)) {
    throw new HttpError(400, `Status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  return value;
}
