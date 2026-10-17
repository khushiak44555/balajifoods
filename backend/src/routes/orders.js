import { Router } from 'express';
import Order from '../models/Order.js';
import { nextSequence } from '../models/Counter.js';
import { HttpError, assertObjectId, buildItems, parseCustomerName, parseStatus } from '../validation.js';

const router = Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function findOrderOr404(id) {
  assertObjectId(id);
  const order = await Order.findById(id);
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

// GET /api/orders?status=pending|completed&limit=200
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    const { status } = req.query;
    if (status !== undefined && status !== '' && status !== 'all') {
      filter.status = parseStatus(status);
    }
    let limit = Number.parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = 500;
    limit = Math.min(limit, 1000);

    const orders = await Order.find(filter).sort({ createdAt: -1, orderNumber: -1 }).limit(limit).lean();
    res.json({ orders });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await findOrderOr404(req.params.id);
    res.json({ order });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const customerName = parseCustomerName(body.customerName);
    const { items, totalAmount } = buildItems(body.items);
    const orderNumber = await nextSequence('orderNumber');
    const order = await Order.create({ orderNumber, customerName, items, totalAmount, status: 'pending' });
    res.status(201).json({ order });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await findOrderOr404(req.params.id);
    const body = req.body || {};

    if (body.customerName !== undefined) order.customerName = parseCustomerName(body.customerName);
    if (body.items !== undefined) {
      const { items, totalAmount } = buildItems(body.items);
      order.items = items;
      order.totalAmount = totalAmount;
    }
    if (body.status !== undefined) {
      const status = parseStatus(body.status);
      if (status !== order.status) {
        order.status = status;
        order.completedAt = status === 'completed' ? new Date() : null;
      }
    }

    await order.save();
    res.json({ order });
  })
);

router.patch(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);
    // Only set completedAt the first time, so repeated clicks don't move the sale between days.
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'completed', completedAt: new Date() } },
      { new: true }
    );
    if (order) return res.json({ order });

    const existing = await Order.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Order not found');
    res.json({ order: existing });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.id);
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) throw new HttpError(404, 'Order not found');
    res.json({ ok: true, id: order._id, orderNumber: order.orderNumber });
  })
);

export default router;
