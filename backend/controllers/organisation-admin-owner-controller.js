const dotenv = require("dotenv");
dotenv.config();
const { validationResult } = require("express-validator");

const io = require("../socket.js");
const s3 = require("../middleware/s3Client.js");
const Event = require("../models/event.js");
const EventAnalytics = require("../models/event-analytics.js");
const Organisation = require("../models/organisation.js");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
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

    const buffer = await sharp(req.file.buffer)
      .resize({ height: 800, width: 1200, fit: "contain" })
      .toBuffer();

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: imageName,
      Body: buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    console.log("IMage has been sent to AWS.");

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

    const event = new Event({
      created_by_organisation: organisationId,
      created_by_admin: createdBy,
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
      posterImage: imageName,
    });

    await event.save();

    // io.getIO().emit("event", { action: "create", event: event });

    return res
      .status(201)
      .json({ message: "Event created successfully. Thanks for registering!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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

    event.title = title || event.title;
    event.description = description || event.description;
    event.registeration_deadline =
      registeration_deadline || event.registeration_deadline;
    event.start_date = start_date || event.start_date;
    event.end_date = end_date || event.end_date;
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

      if (
        !file ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
      ) {
        const error = new Error(
          "Only .jpg, .png, or .webp images are allowed."
        );
        error.statusCode = 422;
        throw error;
      }

      const randomImageName = (bytes = 32) =>
        crypto.randomBytes(bytes).toString("hex");
      const imageName = randomImageName();
      const buffer = await sharp(req.file.buffer)
        .resize({ height: 800, width: 1200, fit: "contain" })
        .toBuffer();

      const uploadParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: imageName,
        Body: buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(uploadParams);

      await s3.send(command);

      event.posterImage = imageName;
    }

    await event.save();
    // io.getIO().emit("event", { action: "update", event: event });
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

    // io.getIO().emit("event", { action: "delete", eventId: eventId });

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
      {
        event: eventId,
      },
      {
        event: eventId,
        registerations: registerationsCount,
        registered_Users: registered_Users,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return res.status(200).json({ message: "Analytics generated!", analytics });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
