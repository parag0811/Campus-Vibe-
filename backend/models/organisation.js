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

    // Razorpay Connect (direct payouts to org)
    razorpayAccountId: { type: String, index: true }, // e.g., acc_XXXX
    payoutPreferences: {
      platformFeePercent: {
        type: Number,
        default: 5,
        min: 0,
        max: 25, // keep sane bounds
      },
      minPayoutAmount: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Organisation", organisationSchema);
