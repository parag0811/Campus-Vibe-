const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organisationSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

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

    // settlements are manual

    bank: {
      accountName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
      ifsc: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"],
      },
      address: { type: String, required: true, trim: true },
    },
    payoutPreferences: {
      settlementMode: { type: String, enum: ["manual"], default: "manual" },
      platformFeePercent: { type: Number, default: 5, min: 0, max: 25 },
      minPayoutAmount: { type: Number, default: 0, min: 0 },
    },

    pendingPayoutBalance: { type: Number, default: 0, min: 0 },
    totalEarnings: { type: Number, default: 0, min: 0 },

    kyc: {
      fullName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      documentUrl: { type: String, required: true },
      verified: { type: Boolean, default: false },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Organisation", organisationSchema);
