const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    profileCompleted: { type: Boolean, default: false },

    name: { type: String, trim: true },

    profileImage: { type: String, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
      index: true,
    },

    isVerified: { type: Boolean, default: false },
    emailVerificationOTP: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    lastOtpSentAt: { type: Date },

    password: { type: String, required: true, select: false },

    age: { type: Number, min: 12, max: 99 },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // Student-only fields
    college_name: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "student" && this.profileCompleted === true;
      },
    },
    college_id: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "student" && this.profileCompleted === true;
      },
    },
    college_department: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "student" && this.profileCompleted === true;
      },
    },
    college_year: {
      type: Number,
      min: 1,
      max: 10,
      required: function () {
        return this.role === "student" && this.profileCompleted === true;
      },
    },

    role: {
      type: String,
      enum: ["organisationAdmin", "student"],
      default: "student",
      index: true,
    },

    registered_Events: [{ type: Schema.Types.ObjectId, ref: "Event" }],

    organisation_Admin: [{ type: Schema.Types.ObjectId, ref: "Organisation" }],

    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
