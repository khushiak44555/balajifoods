import mongoose from 'mongoose';
import { MENU_BY_ID } from '../menu.js';

export const ORDER_STATUSES = ['pending', 'completed'];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      validate: { validator: (v) => MENU_BY_ID.has(v), message: 'Unknown product' },
    },
    name: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 999,
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number' },
    },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true, min: 1 },
    customerName: { type: String, trim: true, maxlength: 60, default: '' },
    items: {
      type: [orderItemSchema],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: 'Order needs at least one item' },
    },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, completedAt: 1 });

export default mongoose.model('Order', orderSchema);
