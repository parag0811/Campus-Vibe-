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

    const bookingId =
      "CV-" + crypto.randomBytes(8).toString("hex").toUpperCase();

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


exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.userId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay verification fields" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!rpPayment || rpPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Payment mismatch" });
    }
    if (rpPayment.status !== "captured") {
      return res.status(400).json({ success: false, message: `Payment not captured (${rpPayment.status})` });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }
    if (String(payment.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Payment does not belong to this user" });
    }
    if (payment.status === "paid") {
      // Idempotent success
      const existingTicket = await Ticket.findOne({ bookingId: payment.receipt }).lean();
      return res.status(200).json({
        success: true,
        bookingId: payment.receipt,
        ticketId: existingTicket?._id,
      });
    }

    payment.paymentId = razorpay_payment_id;
    payment.status = "paid";
    payment.method = rpPayment.method;
    payment.email = rpPayment.email;
    payment.contact = rpPayment.contact;
    await payment.save();

    let ticket = await Ticket.findOne({ bookingId: payment.receipt });
    if (!ticket) {
      ticket = await Ticket.create({
        bookingId: payment.receipt,
        user: payment.user,
        event: payment.event,
        payment: payment._id,
        status: "active",
      });
    }

    const ev = await Event.findById(payment.event);
    if (ev) {
      const exists = (ev.attendees || []).some((a) => String(a) === String(userId));
      if (!exists) {
        ev.attendees = ev.attendees || [];
        ev.attendees.push(userId);
        await ev.save();
      }
    }

    await Organisation.findByIdAndUpdate(payment.organisation, {
      $inc: {
        pendingPayoutBalance: payment.orgShare,
        totalEarnings: payment.orgShare,
      },
    });

    // analytics
    try {
      const analytics = await EventAnalytics.findOne({ event: payment.event });
      if (analytics) {
        if (typeof analytics.registerations === "number") {
          analytics.registerations += 1;
        }
        if (Array.isArray(analytics.registered_Users) && payment.email) {
          analytics.registered_Users.push({ email: payment.email });
        }
        await analytics.save();
      }
    } catch (_) {}

    try {
      const ev = await Event.findById(payment.event).select("_id created_by_organisation").lean();
      const org = await Organisation.findById(payment.organisation).select("razorpayAccountId").lean();


      const method = (payment.method || "").toLowerCase();
      const methodField =
        method === "upi" ? "revenue.methodBreakdown.upi"
        : method === "card" ? "revenue.methodBreakdown.card"
        : method === "netbanking" ? "revenue.methodBreakdown.netbanking"
        : method === "wallet" ? "revenue.methodBreakdown.wallet"
        : method === "emi" ? "revenue.methodBreakdown.emi"
        : "revenue.methodBreakdown.other";

      // Build $inc for amounts
      const inc = {
        "revenue.ticketsSold": 1,
        "revenue.grossAmountPaise": payment.amount || 0,
        "revenue.platformFeePaise": payment.platformFee || 0,
        "revenue.orgSharePaise": payment.orgShare || 0,
        "payout.pendingPayoutPaise": payment.orgShare || 0,
      };
      inc[methodField] = 1;

      await EventAnalytics.findOneAndUpdate(
        { event: payment.event },
        {
          $setOnInsert: {
            event: payment.event,
            "revenue.currency": "INR",
            "payout.payoutMode": "auto",
            "payout.linkedRazorpayAccountId": org?.razorpayAccountId || undefined,
          },
          $inc: inc,
          $max: { "revenue.lastPaymentAt": new Date() },
        },
        { upsert: true, new: true }
      );
    } catch (_) {
    }

    return res.status(200).json({
      success: true,
      bookingId: payment.receipt,
      ticketId: ticket._id,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
