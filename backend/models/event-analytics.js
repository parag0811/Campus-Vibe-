const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventAnalyticsSchema = new Schema(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true, // one analytics doc per event
      index: true,
    },

    registerations: {
      type: Number,
      default: 0,
      min: 0,
    },
    registered_Users: [
      {
        name: { type: String },
        email: { type: String },
        age: { type: Number },
        college_name: { type: String },
        college_id: { type: String },
      },
    ],

    // payment and payout analytics(all amounts in paise)
    revenue: {
      currency: { type: String, default: "INR" },
      ticketsSold: { type: Number, default: 0, min: 0 }, // count of paid tickets
      grossAmountPaise: { type: Number, default: 0, min: 0 }, // sum of order amounts
      platformFeePaise: { type: Number, default: 0, min: 0 },
      orgSharePaise: { type: Number, default: 0, min: 0 },
      lastPaymentAt: { type: Date }
    },

    // payout readiness (per event)
    payout: {
      linkedRazorpayAccountId: { type: String }, 
      payoutMode: { type: String, enum: ["auto"], default: "auto" },
      paidOutPaise: { type: Number, default: 0, min: 0 }, // later mark event-specific payouts
      pendingPayoutPaise: { type: Number, default: 0, min: 0 }, // revenue.orgSharePaise - paidOutPaise
      lastPayoutAt: { type: Date },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("EventAnalytics", eventAnalyticsSchema);
