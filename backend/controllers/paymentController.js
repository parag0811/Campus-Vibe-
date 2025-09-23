const dotenv = require("dotenv");
dotenv.config();

const crypto = require("crypto");
const Razorpay = require("razorpay");

const Event = require("../models/event.js");
const Organisation = require("../models/organisation.js");
const Payment = require("../models/payment.js");
const Ticket = require("../models/ticket.js");
const EventAnalytics = require("../models/event-analytics.js");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_ID_SECRET,
});

exports.createOrder = async (req, res, next) => {
  try {
    const options = {
      amount: Number(req.body.price*100),
      currency: "INR",
    }; // Current order i am getting

    const order = await razorpay.orders.create(options); // Making order out of the data

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
