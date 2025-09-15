const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const organisationSchema = new Schema(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    contact_email: {
      type: String,
      required: true,
      unique: true,
    },
    imageName: {
      required: true,
      unique: true,
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organisation", organisationSchema);
