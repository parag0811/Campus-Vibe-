const dotenv = require("dotenv");
dotenv.config();

const Event = require("../models/event.js");
const EventAnalytics = require("../models/event-analytics.js");
const User = require("../models/user.js");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../middleware/s3Client.js");

exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.find();
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No events are currently happening.",
      });
    }

    // Attach signed URLs (5 min)
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

    return res.status(200).json({ events });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getEventDetail = async (req, res, next) => {
  try {
    const eventId  = req.params.eventId;
    const event = await Event.findById(eventId);

    if (!event) {
      const error = new Error("Event not available.");
      error.statusCode = 404;
      throw error;
    }

    // Attach signed URL
    const eventObj = event.toObject();
    if (eventObj.posterImage) {
      const command = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: eventObj.posterImage,
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
      eventObj.imageUrl = signedUrl;
    }

    return res.status(200).json({ event: eventObj });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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
    return res.status(201).json({ message: "Registration Successfull!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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
      .populate("created_by_organisation", "name")
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

    // Attach signed URLs
    for (let ev of upcoming) {
      if (ev.posterImage) {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: ev.posterImage,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
        ev.imageUrl = signedUrl;
      }
    }
    for (let ev of past) {
      if (ev.posterImage) {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: ev.posterImage,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });
        ev.imageUrl = signedUrl;
      }
    }

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
