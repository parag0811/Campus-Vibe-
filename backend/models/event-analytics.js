const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventAnalyticsSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },

    registerations: { type: Number, default: 0, min: 0 },

    registered_Users: [
      {
        name: { type: String },
        email: { type: String },
        age: { type: Number },
        college_name: { type: String },
        college_id: { type: String },
      },
    ],

    revenue: {
      currency: { type: String, default: "INR" },
      ticketsSold: { type: Number, default: 0, min: 0 },
      grossAmountPaise: { type: Number, default: 0, min: 0 },
      platformFeePaise: { type: Number, default: 0, min: 0 },
      orgSharePaise: { type: Number, default: 0, min: 0 },
      lastPaymentAt: { type: Date },
      methodBreakdown: {
        upi: { type: Number, default: 0 },
        card: { type: Number, default: 0 },
        netbanking: { type: Number, default: 0 },
        wallet: { type: Number, default: 0 },
        emi: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
    },

    payout: {
      payoutMode: { type: String, enum: ["manual"], default: "manual" },
      paidOutPaise: { type: Number, default: 0, min: 0 },
      pendingPayoutPaise: { type: Number, default: 0, min: 0 },
      lastPayoutAt: { type: Date, default: null },
    },
  },
  { timestamps: true, versionKey: false }
);

eventAnalyticsSchema.index({ "revenue.lastPaymentAt": -1 });

module.exports = mongoose.model("EventAnalytics", eventAnalyticsSchema);
