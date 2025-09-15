const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organisationAdmin = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrganisationAdmin", organisationAdmin);
