import { Router } from 'express';
import Order from '../models/Order.js';

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Start and end (UTC instants) of the current calendar day in India Standard Time.
export function istDayRange(now = new Date()) {
  const istNow = now.getTime() + IST_OFFSET_MS;
  const startMs = Math.floor(istNow / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  return { start: new Date(startMs), end: new Date(startMs + DAY_MS) };
}

router.get('/', async (req, res, next) => {
  try {
    const { start, end } = istDayRange();
    const [pendingOrders, completedOrders, todayAgg] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'completed' }),
      Order.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      pendingOrders,
      completedOrders,
      todaySales: todayAgg[0]?.total ?? 0,
      todayCompletedOrders: todayAgg[0]?.count ?? 0,
      businessDay: { start, end, timezone: 'Asia/Kolkata' },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
