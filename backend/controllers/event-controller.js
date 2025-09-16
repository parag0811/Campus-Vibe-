const dotenv = require("dotenv");
dotenv.config();

const Event = require("../models/event.js");

exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.find();
    if (!events || events.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No events are currently happening.",
      });
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

    return res.status(200).json({ event });
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

exports.registeredEvents = async (req, res, next) => {
  try {
    const registeredEvents = await Event.find({ attendees: req.userId });
    if (!registeredEvents || registeredEvents.length === 0) {
      return res.status(409).json({
        success: false,
        message: "No registerations for now. Participate now!",
      });
    }

    return res.status(200).json({ registeredEvents });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
