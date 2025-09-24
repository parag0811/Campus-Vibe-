const dotenv = require("dotenv");
dotenv.config();

const crypto = require("crypto");
const Razorpay = require("razorpay");

const Event = require("../models/event.js");
const Organisation = require("../models/organisation.js");
const Payment = require("../models/payment.js");
const Ticket = require("../models/ticket.js");
const EventAnalytics = require("../models/event-analytics.js");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_ID_SECRET,
});

exports.createOrder = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const userId = req.userId;

    if (!eventId) {
      const error = new Error("EventId not found.");
      error.statusCode = 404;
      throw error;
    }

    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or does not exist.",
      });
    }
    if (!event.price || event.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "This event is free or has no price set.",
      });
    }

    const org = await Organisation.findById(event.created_by_organisation);
    const feePercent =
      org.payoutPreferences?.platformFeePercent ??
      Number(process.env.DEFAULT_PLATFORM_FEE_PERCENT || 5);

    const amountPaise = Math.round(Number(event.price) * 100);
    const platformFee = Math.floor((amountPaise * feePercent) / 100);
    const orgShare = Math.max(0, amountPaise - platformFee);

   const bookingId = "CV-" + crypto.randomBytes(8).toString("hex").toUpperCase();


    const options = {
      amount: Number(req.body.price * 100),
      currency: "INR",
      receipt: bookingId,
      notes: { eventId: String(event._id), userId: String(userId) },
    }; // Current order i am getting

    const order = await razorpay.orders.create(options); // Making order out of the data

    await Payment.create({
      provider: "razorpay",
      orderId: order.id,
      paymentId: null,
      receipt: bookingId,
      user: userId,
      event: event._id,
      organisation: event.created_by_organisation,
      amount: amountPaise,
      currency: "INR",
      platformFee,
      orgShare,
      status: "created",
      notes: order.notes,
    });

    return res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
