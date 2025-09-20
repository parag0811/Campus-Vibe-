const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const WebhookEventSchema = new Schema(
  {
    provider: { type: String, enum: ["razorpay"], default: "razorpay" },
    eventId: { type: String, required: true, unique: true, index: true }, // use payment_id or event id
    eventType: { type: String, index: true },
    payload: { type: Object, required: true },
    signature: { type: String },
    processedAt: { type: Date },
    status: { type: String, enum: ["received", "processed", "skipped"], default: "received" },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("WebhookEvent", WebhookEventSchema);