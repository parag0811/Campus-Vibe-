const Organisation = require("../models/organisation.js");
const Payment = require("../models/payment.js");

exports.getOrganisationEarnings = async (req, res, next) => {
  try {
    const userId = req.userId;

    // OWNER-ONLY: must be the organisation creator
    const org = await Organisation.findOne({ createdBy: userId })
      .select("_id name")
      .lean();

    if (!org) {
      return res.status(403).json({ message: "Only the organisation owner can view earnings." });
    }

    const orgMatchAny = {
      $or: [
        { organisationId: org._id },
        { organisation: org._id },
        { orgId: org._id },
      ],
    };
    const statusOk = { status: { $in: ["paid", "captured", "succeeded"] } };

    const matchStage = { $and: [orgMatchAny, statusOk] };

    const [totalsAgg] = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          ticketsSold: { $sum: 1 },
          grossAmountPaise: {
            $sum: { $ifNull: ["$amountPaise", { $ifNull: ["$amount", 0] }] },
          },
          platformFeePaise: {
            $sum: { $ifNull: ["$platformFeePaise", { $ifNull: ["$platformFee", 0] }] },
          },
          orgSharePaise: {
            $sum: { $ifNull: ["$orgSharePaise", { $ifNull: ["$orgShare", 0] }] },
          },
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
          grossAmountPaise: {
            $sum: { $ifNull: ["$amountPaise", { $ifNull: ["$amount", 0] }] },
          },
          platformFeePaise: {
            $sum: { $ifNull: ["$platformFeePaise", { $ifNull: ["$platformFee", 0] }] },
          },
          orgSharePaise: {
            $sum: { $ifNull: ["$orgSharePaise", { $ifNull: ["$orgShare", 0] }] },
          },
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