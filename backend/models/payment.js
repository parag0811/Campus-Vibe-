const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentSchema = new Schema(
  {
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },

    // Razorpay references
    orderId: { type: String, required: true, unique: true, index: true },   // razorpay_order_id
    paymentId: { type: String, unique: true, sparse: true, index: true },   // razorpay_payment_id (after success)
    receipt: { type: String, required: true, unique: true, index: true },   // bookingId used in UI/ticket

    // Entities
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    organisation: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },

    // Amounts in paise — my platfrm collects now; org settles later
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    platformFee: { type: Number, default: 0, min: 0 }, // my cut damn
    orgShare: { type: Number, default: 0, min: 0 },    // to be settled for later

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },

    // Optional details captured from Razorpay
    method: { type: String },  // card/netbanking/upi/etc
    email: { type: String },
    contact: { type: String },
    notes: { type: Object },
  },
  { timestamps: true, versionKey: false }
);

// Fast lookups
PaymentSchema.index({ user: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);