const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organisationSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    contact_email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    imageName: { type: String, required: true, unique: true },

    // Platform collects now; org payout later (keep fields future-ready)
    razorpayAccountId: { type: String, index: true }, // for future settlements
    payoutPreferences: {
      platformFeePercent: { type: Number, default: 5, min: 0, max: 25 },
      minPayoutAmount: { type: Number, default: 0, min: 0 },
      settlementMode: { type: String, enum: ["manual", "auto"], default: "manual" },
    },

    // Aggregates for dashboards/settlements (in paise)
    pendingPayoutBalance: { type: Number, default: 0, min: 0 }, // accrued orgShare not yet paid
    totalEarnings: { type: Number, default: 0, min: 0 },        // lifetime orgShare
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Organisation", organisationSchema);
