const dotenv = require("dotenv");
dotenv.config();
const { validationResult } = require("express-validator");

const s3 = require("../middleware/s3Client.js");
const Event = require("../models/event.js");
const EventAnalytics = require("../models/event-analytics.js");
const Organisation = require("../models/organisation");
const OrganisationAdmin = require("../models/organisation-admin");
const User = require("../models/user");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const sharp = require("sharp");

exports.getSingleEvent = async (req, res, next) => {
  try {
    const { organisationId, eventId } = req.params;

    const event = await Event.findById(eventId);

    if (!event || event.created_by_organisation.toString() !== organisationId) {
      const error = new Error("Event not found or not authorized.");
      error.statusCode = 404;
      throw error;
    }

    const eventObj = event.toObject();

    if (event.posterImage) {
      const command = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: event.posterImage,
      });
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      eventObj.imageUrl = signedUrl;
    }

    return res.status(200).json(eventObj);
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    console.log(errors);

    const organisationId = req.params.organisationId;
    const createdBy = req.userId;

    const organisation = await Organisation.findById(organisationId);

    if (!organisation) {
      const error = new Error("You need to create an organisation first.");
      error.statusCode = 403;
      throw error;
    }

    if (!req.file) {
      const error = new Error("Poster image is required to create an event.");
      error.statusCode = 422;
      throw error;
    }
    const file = req.file;

    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    ) {
      const error = new Error("Only .jpg, .png, or .webp images are allowed.");
      error.statusCode = 422;
      throw error;
    }

    const randomImageName = (bytes = 32) =>
      crypto.randomBytes(bytes).toString("hex");

    const imageName = randomImageName();

    // Store uploaded image as-is (no resizing, no aspect ratio enforcement)
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: imageName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    console.log("Image has been sent to AWS.");

    const {
      title,
      description,
      registeration_deadline,
      start_date,
      end_date,
      venue,
      mode,
      price,
      max_attendees,
      organiser_contact,
    } = req.body;

    const now = new Date();
    const regDt = new Date(registeration_deadline);
    const startDt = new Date(start_date);
    const endDt = new Date(end_date);

    if (isNaN(regDt) || isNaN(startDt) || isNaN(endDt)) {
      const err = new Error("Invalid date/time format.");
      err.statusCode = 422;
      throw err;
    }
    if (regDt < now) {
      const err = new Error("Registration deadline cannot be in the past (date/time).");
      err.statusCode = 422;
      throw err;
    }
    if (regDt > startDt) {
      const err = new Error(
        "Registration deadline must be before or equal to the event start date/time."
      );
      err.statusCode = 422;
      throw err;
    }
    if (endDt < startDt) {
      const err = new Error("End date/time must be on or after the start date/time.");
      err.statusCode = 422;
      throw err;
    }

    const event = new Event({
      created_by_organisation: organisationId,
      created_by_admin: createdBy,
      title,
      description,
      registeration_deadline: regDt,
      start_date: startDt,
      end_date: endDt,
      venue,
      mode,
      price,
      max_attendees,
      organiser_contact,
      posterImage: imageName,
    });

    await event.save();
    return res
      .status(201)
      .json({ message: "Event created successfully. Thanks for registering!" });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.editCreatedEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const organisationId = req.params.organisationId;

    const organisation = await Organisation.findById(organisationId);

    if (!organisation) {
      const error = new Error("No organisation found.");
      error.statusCode = 404;
      throw error;
    }

    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);

    if (!event) {
      const error = new Error("Event does not exist.");
      error.statusCode = 404;
      throw error;
    }

    if (event.created_by_organisation.toString() !== organisationId) {
      const error = new Error(
        "This event does not belong to the given organisation."
      );
      error.statusCode = 403;
      throw error;
    }

    const {
      title,
      description,
      registeration_deadline,
      start_date,
      end_date,
      venue,
      mode,
      price,
      max_attendees,
      organiser_contact,
    } = req.body;

    const now = new Date();
    // Only validate fields provided (allow partial updates)
    const regDt = registeration_deadline
      ? new Date(registeration_deadline)
      : new Date(event.registeration_deadline);
    const startDt = start_date
      ? new Date(start_date)
      : new Date(event.start_date);
    const endDt = end_date ? new Date(end_date) : new Date(event.end_date);

    if ([regDt, startDt, endDt].some((d) => isNaN(d))) {
      const err = new Error("Invalid date/time format.");
      err.statusCode = 422;
      throw err;
    }
    if (regDt < now) {
      const err = new Error("Registration deadline cannot be in the past (date/time).");
      err.statusCode = 422;
      throw err;
    }
    if (regDt > startDt) {
      const err = new Error(
        "Registration deadline must be before or equal to the event start date/time."
      );
      err.statusCode = 422;
      throw err;
    }
    if (endDt < startDt) {
      const err = new Error("End date/time must be on or after the start date/time.");
      err.statusCode = 422;
      throw err;
    }

    event.title = title || event.title;
    event.description = description || event.description;
    event.registeration_deadline = regDt;
    event.start_date = startDt;
    event.end_date = endDt;
    event.venue = venue || event.venue;
    event.mode = mode || event.mode;
    event.price = price || event.price;
    event.max_attendees = max_attendees || event.max_attendees;
    event.organiser_contact = organiser_contact || event.organiser_contact;

      if (req.file) {
        if (event.posterImage) {
          const deleteParams = {
            Bucket: process.env.BUCKET_NAME,
            Key: event.posterImage,
          };
          await s3.send(new DeleteObjectCommand(deleteParams));
        }

        const file = req.file;

        if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
          const error = new Error("Only .jpg, .png, or .webp images are allowed.");
          error.statusCode = 422;
          throw error;
        }

        // Do not enforce aspect ratio or resize. Store the uploaded file as-is.
        const randomImageName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
        const imageName = randomImageName();

        const uploadParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: imageName,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(uploadParams);

        await s3.send(command);

        event.posterImage = imageName;
      }

    await event.save();
    return res.status(200).json({ message: "Event updated successfully!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const { organisationId, eventId } = req.params;

    const organisation = await Organisation.findById(organisationId);
    if (!organisation) {
      const error = new Error("Organisation not found.");
      error.statusCode = 404;
      throw error;
    }

    const event = await Event.findById(eventId);
    if (!event) {
      const error = new Error("Event not found.");
      error.statusCode = 404;
      throw error;
    }

    if (event.created_by_organisation.toString() !== organisationId) {
      const error = new Error(
        "This event does not belong to the given organisation."
      );
      error.statusCode = 403;
      throw error;
    }

    if (event.posterImage) {
      const deleteParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: event.posterImage,
      };
      await s3.send(new DeleteObjectCommand(deleteParams));
    }

    await Event.findByIdAndDelete(eventId);

    return res.status(200).json({ message: "Event deleted successfully." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getEventAnalytics = async (req, res, next) => {
  try {
    const { eventId, organisationId } = req.params;
    const event = await Event.findById(eventId).populate(
      "attendees",
      "name email age college_name college_id"
    );

    if (!event) {
      const error = new Error("No events found!");
      error.statusCode = 404;
      throw error;
    }
    if (event.created_by_organisation.toString() !== organisationId) {
      const error = new Error(
        "This event does not belong to the given organisation."
      );
      error.statusCode = 403;
      throw error;
    }

    const organisation = await Organisation.findById(organisationId);
    if (!organisation) {
      const error = new Error("Organisation not found.");
      error.statusCode = 404;
      throw error;
    }

    const registered_Users = event.attendees.map((user) => ({
      name: user.name,
      email: user.email,
      age: user.age,
      college_name: user.college_name,
      college_id: user.college_id,
    }));
    const registerationsCount = event.attendees?.length || 0;

    const analytics = await EventAnalytics.findOneAndUpdate(
      { event: eventId },
      {
        $set: {
          registerations: registerationsCount,
          registered_Users,
          "payout.payoutMode": "manual",
        },
        $setOnInsert: {
          event: eventId,
          "revenue.currency": "INR",
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: "Analytics generated!", analytics });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.getCreatedEvents = async (req, res, next) => {
  try {
    const { organisationId } = req.params;

    // Fetch all events for this org
    const events = await Event.find({ created_by_organisation: organisationId })
      .select("_id title registeration_deadline posterImage")
      .lean();

    if (!events || events.length === 0) {
      return res.status(404).json({ message: "No events found for this organisation.", events: [] });
    }

    // Attach signed poster URLs if present
    const mapped = await Promise.all(
      events.map(async (e) => {
        let imageUrl = null;
        if (e.posterImage) {
          try {
            const cmd = new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: e.posterImage });
            imageUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });
          } catch (_) {}
        }
        return {
          _id: e._id,
          title: e.title,
          registeration_deadline: e.registeration_deadline,
          imageUrl,
        };
      })
    );

    return res.status(200).json({ events: mapped });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

// Lightweight probe: owner or assigned admin; never throws
exports.isMember = async (req, res) => {
  const userId = req.userId;
  try {
    // 1) Owner of any organisation
    const owned = await Organisation.findOne({ createdBy: userId })
      .select("_id")
      .lean()
      .catch(() => null);

    if (owned?._id) {
      return res.status(200).json({
        orgAdmin: true,
        organisationId: owned._id,
        isOwner: true,
      });
    }

    // 2) Assigned via OrganisationAdmin mapping
    const link = await OrganisationAdmin.findOne({ user: userId })
      .select("organisation")
      .lean()
      .catch(() => null);

    if (link?.organisation) {
      return res.status(200).json({
        orgAdmin: true,
        organisationId: link.organisation,
        isOwner: false,
      });
    }

    // 3) Fallback: user.organisation_Admin array (legacy)
    const u = await User.findById(userId)
      .select("organisation_Admin")
      .lean()
      .catch(() => null);

    if (u?.organisation_Admin?.length) {
      return res.status(200).json({
        orgAdmin: true,
        organisationId: u.organisation_Admin[0],
        isOwner: false,
      });
    }

    return res.status(200).json({
      orgAdmin: false,
      organisationId: null,
      isOwner: false,
    });
  } catch {
    // Never surface a 500; return negative
    return res.status(200).json({
      orgAdmin: false,
      organisationId: null,
      isOwner: false,
    });
  }
};
