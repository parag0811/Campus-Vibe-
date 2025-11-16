const dotenv = require("dotenv");
dotenv.config();

const crypto = require("crypto");
const Razorpay = require("razorpay");

const Event = require("../models/event.js");
const Organisation = require("../models/organisation.js");
const Payment = require("../models/payment.js");
const Ticket = require("../models/ticket.js");
const EventAnalytics = require("../models/event-analytics.js");
const User = require("../models/user.js"); // ADD

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_ID_SECRET;

const razorpay = new Razorpay({
  key_id: RZP_KEY_ID,
  key_secret: RZP_KEY_SECRET,
});

exports.createOrder = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const userId = req.userId;
    if (!eventId)
      return res
        .status(400)
        .json({ success: false, message: "EventId not found." });

    const event = await Event.findById(eventId).lean();
    if (!event)
      return res
        .status(404)
        .json({
          success: false,
          message: "Event not found or does not exist.",
        });

    const now = new Date();
    if (new Date(event.registeration_deadline) < now)
      return res
        .status(409)
        .json({ success: false, message: "Registration deadline has passed." });
    if (new Date(event.start_date) <= now)
      return res
        .status(409)
        .json({
          success: false,
          message: "Event has started. Registration closed.",
        });
    if (
      event.max_attendees &&
      Array.isArray(event.attendees) &&
      event.attendees.length >= event.max_attendees
    )
      return res
        .status(409)
        .json({
          success: false,
          message: "Registrations are full for this event.",
        });
    if (
      Array.isArray(event.attendees) &&
      event.attendees.some((a) => String(a) === String(userId))
    )
      return res
        .status(409)
        .json({
          success: false,
          message: "Already registered for this event.",
        });

    const existingPaid = await Payment.findOne({
      user: userId,
      event: event._id,
      status: "paid",
    }).lean();
    if (existingPaid)
      return res
        .status(409)
        .json({
          success: false,
          message: "Already registered (payment completed).",
        });

    if (!event.price || Number(event.price) <= 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "This event is free or has no price set.",
        });

    const org = await Organisation.findById(
      event.created_by_organisation
    ).lean();
    const feePercent =
      org?.payoutPreferences?.platformFeePercent ??
      Number(process.env.DEFAULT_PLATFORM_FEE_PERCENT || 5);
    const amountPaise = Math.round(Number(event.price) * 100);
    const platformFee = Math.floor((amountPaise * feePercent) / 100);
    const orgShare = Math.max(0, amountPaise - platformFee);

    const existingCreated = await Payment.findOne({
      user: userId,
      event: event._id,
      status: "created",
    }).lean();
    if (existingCreated) {
      return res.status(200).json({
        success: true,
        keyId: RZP_KEY_ID,
        orderId: existingCreated.orderId,
        amount: existingCreated.amount,
        currency: existingCreated.currency || "INR",
        bookingId: existingCreated.receipt,
        eventId: String(event._id),
      });
    }

    const bookingId =
      "CV-" + crypto.randomBytes(8).toString("hex").toUpperCase();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: bookingId,
      notes: { eventId: String(event._id), userId: String(userId) },
    });

    try {
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
    } catch (e) {
      if (e.code === 11000 && e.keyPattern?.paymentId) {
        const fallback = await Payment.findOne({ orderId: order.id }).lean();
        if (fallback) {
          return res.status(200).json({
            success: true,
            keyId: RZP_KEY_ID,
            orderId: fallback.orderId,
            amount: fallback.amount,
            currency: fallback.currency || "INR",
            bookingId: fallback.receipt,
            eventId: String(event._id),
          });
        }
      }
      throw e;
    }

    return res.status(200).json({
      success: true,
      keyId: RZP_KEY_ID,
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      bookingId,
      eventId: String(event._id),
    });
  } catch (err) {
    if (err?.statusCode === 401 || err?.error?.code === "BAD_REQUEST_ERROR") {
      return res.status(502).json({
        success: false,
        message: "Payment gateway auth failed. Check Razorpay keys.",
      });
    }
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const userId = req.userId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing Razorpay verification fields",
        });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RZP_KEY_SECRET)
      .update(body)
      .digest("hex");
    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    const rpPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!rpPayment || rpPayment.order_id !== razorpay_order_id) {
      return res
        .status(400)
        .json({ success: false, message: "Payment mismatch" });
    }
    if (rpPayment.status !== "captured") {
      return res
        .status(400)
        .json({
          success: false,
          message: `Payment not captured (${rpPayment.status})`,
        });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment record not found" });
    }
    if (String(payment.user) !== String(userId)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Payment does not belong to this user",
        });
    }
    const event = await Event.findById(payment.event);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Duplicate / capacity / deadline checks again (race safety)
    const now = new Date();
    if (
      new Date(event.registeration_deadline) < now ||
      new Date(event.start_date) <= now
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Registration period closed." });
    }
    if (
      event.max_attendees &&
      Array.isArray(event.attendees) &&
      event.attendees.length >= event.max_attendees
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Registrations are full." });
    }
    const alreadyAttendee = (event.attendees || []).some(
      (a) => String(a) === String(userId)
    );

    if (payment.status === "paid") {
      // If already marked paid earlier, just return
      const existingTicket = await Ticket.findOne({
        bookingId: payment.receipt,
      }).lean();
      return res.status(200).json({
        success: true,
        bookingId: payment.receipt,
        ticketId: existingTicket?._id,
        eventId: String(payment.event),
      });
    }

    if (alreadyAttendee) {
      // Payment captured but attendee already recorded (edge)
      payment.paymentId = razorpay_payment_id;
      payment.status = "paid";
      payment.method = rpPayment.method;
      payment.email = rpPayment.email;
      payment.contact = rpPayment.contact;
      await payment.save();
      const existingTicket = await Ticket.findOne({
        bookingId: payment.receipt,
      }).lean();
      return res.status(200).json({
        success: true,
        bookingId: payment.receipt,
        ticketId: existingTicket?._id,
        eventId: String(payment.event),
      });
    }

    // Normal success path
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

    event.attendees = event.attendees || [];
    event.attendees.push(userId);
    await event.save();

    await User.updateOne(
      { _id: userId },
      { $addToSet: { registered_Events: event._id } }
    );
    try {
      const u = await User.findById(userId).lean();
      const payload = {
        name: u?.name || null,
        email: u?.email || null,
        age: u?.age || null,
        college_name: u?.college_name || null,
        college_id: u?.college_id || null,
      };
      await EventAnalytics.updateOne(
        {
          event: payment.event,
          "registered_Users.email": { $ne: payload.email },
        },
        {
          $setOnInsert: { event: payment.event, "revenue.currency": "INR" },
          $inc: { registerations: 1 },
          $push: { registered_Users: payload },
        },
        { upsert: true }
      );
    } catch (e) {
      console.warn("Analytics update skipped (paid):", e.message || e);
    }

    await Organisation.findByIdAndUpdate(payment.organisation, {
      $inc: {
        pendingPayoutBalance: payment.orgShare,
        totalEarnings: payment.orgShare,
      },
    });

    const orgData = await Organisation.findById(payment.organisation).lean();

    if (!orgData.razorpayAccountId) {
      throw new Error("Organisation is missing Razorpay Route linked account.");
    }

    await razorpay.transfers.create({
      account: orgData.razorpayAccountId,
      amount: payment.orgShare,
      currency: "INR",
      notes: {
        organisation: orgData.name,
        event: event.title,
        paymentId: payment.paymentId,
      },
    });

    // ...existing revenue analytics code remains...
    try {
      const method = (payment.method || "").toLowerCase();
      const methodField =
        method === "upi"
          ? "revenue.methodBreakdown.upi"
          : method === "card"
          ? "revenue.methodBreakdown.card"
          : method === "netbanking"
          ? "revenue.methodBreakdown.netbanking"
          : method === "wallet"
          ? "revenue.methodBreakdown.wallet"
          : method === "emi"
          ? "revenue.methodBreakdown.emi"
          : "revenue.methodBreakdown.other";

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
          $setOnInsert: { event: payment.event, "revenue.currency": "INR" },
          $inc: inc,
          $max: { "revenue.lastPaymentAt": new Date() },
        },
        { upsert: true, new: true }
      );
    } catch (_) {}

    return res.status(200).json({
      success: true,
      bookingId: payment.receipt,
      ticketId: ticket._id,
      eventId: String(payment.event),
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const tickets = await Ticket.find({ user: req.userId })
      .select("_id bookingId event status createdAt")
      .lean();

    const data = tickets.map((t) => ({
      ticketId: String(t._id),
      bookingId: t.bookingId,
      eventId: String(t.event),
      status: t.status || "active",
      createdAt: t.createdAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getTicketDetails = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing bookingId" });
    }

    const ticket = await Ticket.findOne({ bookingId })
      .populate({
        path: "event",
        select:
          "title start_date end_date venue location imageUrl price created_by_organisation",
        populate: { path: "created_by_organisation", select: "name logoUrl" },
      })
      .populate({
        path: "payment",
        select: "orderId paymentId amount currency status method createdAt",
      })
      .lean();

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    if (String(ticket.user) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.status(200).json({
      success: true,
      data: {
        bookingId: ticket.bookingId,
        status: ticket.status || "active",
        issuedAt: ticket.createdAt,
        event: ticket.event
          ? {
              id: String(ticket.event._id),
              title: ticket.event.title,
              start_date: ticket.event.start_date,
              end_date: ticket.event.end_date,
              venue: ticket.event.venue,
              location: ticket.event.location,
              imageUrl: ticket.event.imageUrl,
              price: ticket.event.price,
            }
          : null,
        organisation: ticket.event?.created_by_organisation
          ? {
              name: ticket.event.created_by_organisation.name,
              logoUrl: ticket.event.created_by_organisation.logoUrl,
            }
          : null,
        payment: ticket.payment
          ? {
              orderId: ticket.payment.orderId,
              paymentId: ticket.payment.paymentId,
              amount: ticket.payment.amount,
              currency: ticket.payment.currency || "INR",
              status: ticket.payment.status,
              method: ticket.payment.method,
              createdAt: ticket.payment.createdAt,
            }
          : null,
      },
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
