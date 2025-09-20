const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentOrderSchema = new Schema(
  {
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    orderId: { type: String, required: true, unique: true, index: true }, // razorpay_order_id
    receipt: { type: String, required: true, index: true },               // your bookingId
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    organisation: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },
    amount: { type: Number, required: true, min: 0 }, // paise
    currency: { type: String, default: "INR", uppercase: true },
    status: { type: String, enum: ["created", "paid", "failed", "expired"], default: "created", index: true },
    notes: { type: Object },
    attempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

PaymentOrderSchema.index({ user: 1, event: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentOrder", PaymentOrderSchema);