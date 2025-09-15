const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    age: {
      type: Number,
      min: 12,
      max: 99,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    college_name: {
      type: String,
      function() {
        return this.role === "student";
      },
    },
    college_id: {
      type: String,
      function() {
        return this.role === "student";
      },
    },
    role: {
      type: String,
      enum: ["organisationAdmin", "student"],
      default: "student",
    },
    registered_Events: [
      {
        type: Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    organisation_Admin: [
      {
        type: Schema.Types.ObjectId,
        ref: "Organisation",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
