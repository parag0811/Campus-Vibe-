const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    status: {
      type: String,
      enum: ["processing", "succeeded", "failed", "refunded"],
      default: "processing",
      index: true,
    },

    // Entities
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    organisation: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },

    // Money
    amount: { type: Number, required: true, min: 0 }, // paise
    currency: { type: String, default: "INR", uppercase: true },
    platformFee: { type: Number, default: 0, min: 0 }, // paise
    orgShare: { type: Number, default: 0, min: 0 },    // paise

    // Provider refs
    orderId: { type: String, index: true },   // razorpay_order_id
    paymentId: { type: String, index: true }, // razorpay_payment_id
    signature: { type: String },
    transferIds: [{ type: String }],          // transfer IDs to org account

    // Booking/Ticket
    bookingId: { type: String, unique: true, index: true }, // human-friendly code

    // Idempotency / audit
    idempotencyKey: { type: String, index: true },
    metadata: { type: Object },
  },
  { timestamps: true, versionKey: false }
);

// Fast lookups
TransactionSchema.index({ user: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", TransactionSchema);