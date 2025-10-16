const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organisationSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Organisation info
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

    // Razorpay payouts (required at creation; view-only for org owners)
    razorpayAccountId: {
      type: String,
      required: true,
      trim: true,
      match: [/^acc_[A-Za-z0-9]+$/, "Invalid Razorpay Account ID"],
      unique: true,
      index: true,
    },
    razorpayPayoutEnabled: { type: Boolean, default: false },
    payoutPreferences: {
      platformFeePercent: { type: Number, default: 5, min: 0, max: 25 },
      minPayoutAmount: { type: Number, default: 0, min: 0 },
      settlementMode: { type: String, enum: ["auto"], default: "auto" },
    },

    // Aggregates (in paise)
    pendingPayoutBalance: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },

    // Creator's KYC
    kyc: {
      fullName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      documentUrl: { type: String, required: true }, // S3 key
      verified: { type: Boolean, default: false },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Organisation", organisationSchema);
