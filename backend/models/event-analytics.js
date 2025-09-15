const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventAnalyticsSchema = new Schema({
  event: {
    type: Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  registerations: {
    type: Number,
    default: 0,
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
});

module.exports = mongoose.model("EventAnalytics", eventAnalyticsSchema);
