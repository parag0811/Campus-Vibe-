const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TicketSchema = new Schema(
  {
    // Same as Payment.receipt (human-friendly booking code)
    bookingId: { type: String, required: true, unique: true, index: true },

    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    // Link ticket directly to the successful Payment (no Transaction model)
    payment: { type: Schema.Types.ObjectId, ref: "Payment", required: true, index: true },

    status: {
      type: String,
      enum: ["active", "cancelled", "refunded"],
      default: "active",
      index: true,
    },

    qrCode: { type: String }, // optional QR payload/url
    seat: { type: String },   // optional
    notes: { type: Object },
  },
  { timestamps: true, versionKey: false }
);

// Useful for "my tickets"
TicketSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Ticket", TicketSchema);
