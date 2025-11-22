const dotenv = require("dotenv");
dotenv.config();

const Event = require("../models/event.js");
const EventAnalytics = require("../models/event-analytics.js");
const User = require("../models/user.js");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../middleware/s3Client.js");

const orgPublicSelect = "name contact_email image"; // safe public fields

const signOrNull = async (key) => {
  if (!key) return null;
  try {
    const cmd = new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key });
    return await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
  } catch (_) {
    return null;
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    // populate organisation; do NOT populate admin
    const events = await Event.find()
      .populate({ path: "created_by_organisation", select: orgPublicSelect })
      .lean();

    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No events are currently happening.",
      });
    }

    for (const ev of events) {
      ev.imageUrl = await signOrNull(ev.posterImage);
      const org = ev.created_by_organisation || {};
      const orgLogoUrl = await signOrNull(org.image);
      ev.organisation = {
        _id: org?._id,
        name: org?.name || null,
        contact_email: org?.contact_email || null,
        logoUrl: orgLogoUrl,
      };

      // clean up
      delete ev.created_by_admin;
    }

    return res.status(200).json({ events });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getEventDetail = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;

    const event = await Event.findById(eventId)
      .populate({ path: "created_by_organisation", select: orgPublicSelect })
      .lean();

    if (!event) {
      const error = new Error("Event not available.");
      error.statusCode = 404;
      throw error;
    }

    const posterSigned = await signOrNull(event.posterImage);

    const org = event.created_by_organisation || {};
    const orgLogoUrl = await signOrNull(org.image);

    const eventObj = {
      ...event,
      imageUrl: posterSigned,
      organisation: {
        _id: org?._id,
        name: org?.name || null,
        contact_email: org?.contact_email || null,
        logoUrl: orgLogoUrl,
      },
    };

    delete eventObj.created_by_admin;

    return res.status(200).json({ event: eventObj });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.eventRegistration = async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) {
      const error = new Error("Event not available.");
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    if (new Date(event.registeration_deadline) < now) {
      return res.status(409).json({ success: false, message: "Registration deadline has passed." });
    }

    if (event.start_date <= new Date()) {
      return res.status(409).json({
        success: false,
        message: "Registration are closed for this event.",
      });
    }

    const attendeesList = event.attendees;
    const isUserExists = event.attendees.some(
      (userId) => userId.toString() === req.userId.toString()
    );
    if (isUserExists) {
      return res.status(409).json({
        success: false,
        message: "Already registered for this event.",
      });
    }

    const max_attendees = event.max_attendees;
    if (max_attendees && event.attendees.length >= max_attendees) {
      return res.status(409).json({
        success: false,
        message: "Registration are full for this event.",
      });
    }
    if (max_attendees && attendeesList.length <= max_attendees) {
      attendeesList.push(req.userId);
    } else if (!max_attendees) {
      attendeesList.push(req.userId);
    } else {
      return res.status(409).json({
        success: false,
        message: "All registration are full. Can not register for this event.",
      });
    }

    await event.save();

    await User.updateOne(
      { _id: req.userId },
      { $addToSet: { registered_Events: event._id } }
    );

    try {
      const u = await User.findById(req.userId).lean();
      const payload = {
        name: u?.name || null,
        email: u?.email || null,
        age: u?.age || null,
        college_name: u?.college_name || null,
        college_id: u?.college_id || null,
      };
      await EventAnalytics.updateOne(
        { event: event._id, "registered_Users.email": { $ne: payload.email } },
        {
          $setOnInsert: { event: event._id, "revenue.currency": "INR" },
          $inc: { registerations: 1 },
          $push: { registered_Users: payload },
        },
        { upsert: true }
      );
    } catch (e) {
      console.warn("Analytics update skipped (free):", e.message || e);
    }

    return res.status(201).json({ message: "Registration Successfull!" });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getMyEvents = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const events = await Event.find({ attendees: userId })
      .populate("created_by_organisation", orgPublicSelect)
      .lean();

    const now = new Date();
    const upcoming = [];
    const past = [];

    events.forEach((ev) => {
      const endDate = ev.end_date ? new Date(ev.end_date) : new Date(ev.start_date);
      if (isNaN(endDate.getTime())) {
        past.push(ev);
      } else if (endDate >= now) {
        upcoming.push(ev);
      } else {
        past.push(ev);
      }
    });

    // enrich with poster + org
    const addMediaAndOrg = async (ev) => {
      ev.imageUrl = await signOrNull(ev.posterImage);
      const org = ev.created_by_organisation || {};
      ev.organisation = {
        _id: org?._id,
        name: org?.name || null,
        contact_email: org?.contact_email || null,
        logoUrl: await signOrNull(org.image),
      };
      delete ev.created_by_admin;
      return ev;
    };

    for (let i = 0; i < upcoming.length; i++) upcoming[i] = await addMediaAndOrg(upcoming[i]);
    for (let i = 0; i < past.length; i++) past[i] = await addMediaAndOrg(past[i]);

    return res.status(200).json({ success: true, data: { upcoming, past } });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.cancelRegistration = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const isRegistered = (event.attendees || []).some(
      (a) => String(a) === String(userId)
    );
    if (!isRegistered) {
      return res.status(400).json({ success: false, message: "You are not registered for this event." });
    }

    event.attendees = (event.attendees || []).filter(
      (a) => String(a) !== String(userId)
    );
    await event.save();

    // ADD: remove from user's registered_Events
    await User.updateOne(
      { _id: userId },
      { $pull: { registered_Events: event._id } }
    );

    try {
      const analytics = await EventAnalytics.findOne({ event: event._id });
      if (analytics) {
        if (typeof analytics.registerations === "number") {
          analytics.registerations = Math.max(0, analytics.registerations - 1);
        }
        const user = await User.findById(userId).lean();
        if (user && user.email && Array.isArray(analytics.registered_Users)) {
          analytics.registered_Users = analytics.registered_Users.filter(
            (u) => u.email !== user.email
          );
        }
        await analytics.save();
      }
    } catch (e) {
      console.warn("Analytics update skipped:", e.message || e);
    }

    return res.status(200).json({ success: true, message: "Registration cancelled successfully." });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getEventsFiltered = async (req, res, next) => {
  try {
    const {
      q,
      free,
      mode,
      upcoming,
      page = 1,
      limit = 20,
      sort = "newest",
    } = req.query;

    const query = {};

    if (q && typeof q === "string") {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ title: regex }, { description: regex }, { location: regex }];
    }

    if (free === "true") {
      query.price = 0;
    } else if (free === "false") {
      query.price = { $gt: 0 };
    }

    if (mode && typeof mode === "string") {
      query.mode = new RegExp(`^${mode}$`, "i");
    }

    if (typeof upcoming !== "undefined") {
      const now = new Date();
      if (upcoming === "true") {
        query.$or = query.$or || [];
        query.$or.push({ end_date: { $gte: now } }, { end_date: { $exists: false }, start_date: { $gte: now } });
      } else if (upcoming === "false") {
        const now2 = new Date();
        query.$and = query.$and || [];
        query.$and.push({
          $or: [{ end_date: { $lt: now2 } }, { end_date: { $exists: false }, start_date: { $lt: now2 } }],
        });
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * lim;

    let sortObj = { createdAt: -1 };
    if (sort === "popular") {
      sortObj = { "analytics.registerations": -1, attendeesCount: -1, createdAt: -1 };
    } else if (sort === "newest") {
      sortObj = { createdAt: -1 };
    }

    const pipeline = [{ $match: query }];

    pipeline.push({
      $addFields: {
        attendeesCount: { $size: { $ifNull: ["$attendees", []] } },
      },
    });

    pipeline.push({
      $lookup: {
        from: "eventanalytics",
        localField: "_id",
        foreignField: "event",
        as: "analyticsData",
      },
    });

    pipeline.push({
      $addFields: {
        analytics: { $arrayElemAt: ["$analyticsData", 0] },
      },
    });

    pipeline.push({
      $project: {
        analyticsData: 0,
      },
    });

    pipeline.push({ $sort: sortObj });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: lim });

    const events = await Event.aggregate(pipeline).allowDiskUse(true);

    // Attach signed URLs
    for (let ev of events) {
      if (ev.posterImage) {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: ev.posterImage,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
        ev.imageUrl = signedUrl;
      }
    }

    const total = await Event.countDocuments(query);

    return res.status(200).json({ success: true, data: { events, total, page: pageNum, limit: lim } });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getEventsByOrganisation = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { upcoming, page = 1, limit = 20 } = req.query;

    if (!orgId) {
      return res.status(400).json({ success: false, message: "Organisation id required" });
    }

    const query = { created_by_organisation: orgId };

    if (typeof upcoming !== "undefined") {
      const now = new Date();
      if (upcoming === "true") {
        query.$or = [{ end_date: { $gte: now } }, { end_date: { $exists: false }, start_date: { $gte: now } }];
      } else if (upcoming === "false") {
        const now2 = new Date();
        query.$and = [{ $or: [{ end_date: { $lt: now2 } }, { end_date: { $exists: false }, start_date: { $lt: now2 } }] }];
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * lim;

    const events = await Event.find(query)
      .sort({ start_date: -1 })
      .skip(skip)
      .limit(lim)
      .lean();

    // Attach signed URLs
    for (let ev of events) {
      if (ev.posterImage) {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: ev.posterImage,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
        ev.imageUrl = signedUrl;
      }
    }

    const total = await Event.countDocuments(query);

    return res.status(200).json({ success: true, data: { events, total, page: pageNum, limit: lim } });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getTrendingEvents = async (req, res, next) => {
  try {
    const { limit = 6 } = req.query;
    const lim = Math.max(1, Math.min(50, parseInt(limit, 10) || 6));

    const pipeline = [
      {
        $addFields: {
          attendeesCount: { $size: { $ifNull: ["$attendees", []] } },
        },
      },
      {
        $lookup: {
          from: "eventanalytics",
          localField: "_id",
          foreignField: "event",
          as: "analyticsData",
        },
      },
      {
        $addFields: {
          analytics: { $arrayElemAt: ["$analyticsData", 0] },
        },
      },
      {
        $addFields: {
          score: {
            $ifNull: ["$analytics.registerations", "$attendeesCount"],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $limit: lim },
      {
        $project: {
          analyticsData: 0,
        },
      },
    ];

    const events = await Event.aggregate(pipeline).allowDiskUse(true);

    // Attach signed URLs
    for (let ev of events) {
      if (ev.posterImage) {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: ev.posterImage,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
        ev.imageUrl = signedUrl;
      }
    }

    return res.status(200).json({ success: true, data: { events } });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getEventAnalytics = async (req, res, next) => {
  try {
    const { orgId, eventId } = req.params;

    const event = await Event.findById(eventId).select("created_by_organisation title").lean();
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    if (String(event.created_by_organisation) !== String(orgId)) {
      return res.status(403).json({ message: "Forbidden: organisation mismatch." });
    }

    const analytics = await EventAnalytics.findOne({ event: event._id }).lean();
    if (!analytics) {
      return res.status(200).json({
        analytics: {
          eventId,
          title: event.title,
          registerations: 0,
          revenue: {
            currency: "INR",
            ticketsSold: 0,
            grossAmountPaise: 0,
            platformFeePaise: 0,
            orgSharePaise: 0,
            lastPaymentAt: null
          },
          payout: {
            payoutMode: "manual",
            paidOutPaise: 0,
            pendingPayoutPaise: 0,
            lastPayoutAt: null
          },
          registered_Users: []
        }
      });
    }

    const gross = analytics.revenue?.grossAmountPaise || 0;
    const platformCut = analytics.revenue?.platformFeePaise || 0;
    const orgShare = analytics.revenue?.orgSharePaise || 0;
    const currency = analytics.revenue?.currency || "INR";
    const pending = analytics.payout?.pendingPayoutPaise || orgShare - (analytics.payout?.paidOutPaise || 0);

    return res.status(200).json({
      analytics: {
        eventId,
        title: event.title,
        registerations: analytics.registerations || 0,
        registered_Users: analytics.registered_Users || [],
        revenue: {
          currency,
          ticketsSold: analytics.revenue?.ticketsSold || 0,
          grossAmountPaise: gross,
          platformFeePaise: platformCut,
          orgSharePaise: orgShare,
          lastPaymentAt: analytics.revenue?.lastPaymentAt || null
        },
        payout: {
          linkedRazorpayAccountId: null,
          payoutMode: "manual",
          paidOutPaise: analytics.payout?.paidOutPaise || 0,
          pendingPayoutPaise: pending,
          lastPayoutAt: analytics.payout?.lastPayoutAt || null
        }
      }
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};
