const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentSchema = new Schema(
  {
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },

    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String }, 
    receipt: { type: String, required: true, unique: true, index: true },

    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    organisation: { type: Schema.Types.ObjectId, ref: "Organisation", required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    platformFee: { type: Number, default: 0, min: 0 },
    orgShare: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },

    method: { type: String },
    email: { type: String },
    contact: { type: String },
    notes: { type: Object },
  },
  { timestamps: true, versionKey: false }
);

PaymentSchema.index({ user: 1, event: 1, createdAt: -1 });
PaymentSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentId: { $exists: true, $ne: null } },
    name: "paymentId_not_null_unique",
  }
);

PaymentSchema.index({ organisation: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ event: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);