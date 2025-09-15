const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    created_by_organisation: {
      type: Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },
    created_by_admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    registeration_deadline: {
      type: Date,
      required: true,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    max_attendees: {
      type: Number,
    },
    organiser_contact: {
      type: String,
    },
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    posterImage: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
