const mongoose = require("mongoose");
const Organisation = require("../models/organisation.js");
const Payment = require("../models/payment.js");

exports.getOrganisationEarnings = async (req, res, next) => {
  try {
    const userId = req.userId;

    const org = await Organisation.findOne({ createdBy: userId })
      .select("_id name")
      .lean();

    if (!org) {
      return res.status(404).json({ message: "Organisation not found." });
    }

    const matchStage = {
      organisation: org._id,
      status: "paid",
    };

    const [totalsAgg] = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          ticketsSold: { $sum: 1 },
          grossAmountPaise: { $sum: "$amount" },
          platformFeePaise: { $sum: "$platformFee" },
          orgSharePaise: { $sum: "$orgShare" },
          lastPaymentAt: { $max: "$createdAt" },
        },
      },
    ]);

    const eventsBreakdown = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$event",
          ticketsSold: { $sum: 1 },
          grossAmountPaise: { $sum: "$amount" },
          platformFeePaise: { $sum: "$platformFee" },
          orgSharePaise: { $sum: "$orgShare" },
          lastPaymentAt: { $max: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "event",
        },
      },
      { $set: { event: { $first: "$event" } } },
      {
        $project: {
          _id: 0,
          eventId: "$event._id",
          title: "$event.title",
          start_date: "$event.start_date",
          end_date: "$event.end_date",
          price: "$event.price",
          ticketsSold: 1,
          grossAmountPaise: 1,
          platformFeePaise: 1,
          orgSharePaise: 1,
          lastPaymentAt: 1,
        },
      },
      { $sort: { orgSharePaise: -1 } },
    ]);

    const totals = totalsAgg || {
      ticketsSold: 0,
      grossAmountPaise: 0,
      platformFeePaise: 0,
      orgSharePaise: 0,
      lastPaymentAt: null,
    };

    return res.status(200).json({
      organisationId: org._id,
      organisationName: org.name,
      currency: "INR",
      totals: {
        events: eventsBreakdown.length,
        ticketsSold: totals.ticketsSold,
        grossAmountPaise: totals.grossAmountPaise,
        platformFeePaise: totals.platformFeePaise,
        orgSharePaise: totals.orgSharePaise,
        lastPaymentAt: totals.lastPaymentAt,
      },
      eventsBreakdown,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};