const express = require("express");
const router = express.Router();

const isAuth = require("../middleware/is-auth.js");

const event_controller = require("../controllers/event-controller.js");

router.get("/events", event_controller.getEvents);

router.get("/eventDetail/:eventId", event_controller.getEventDetail);

router.post(
  "/eventRegistration/:eventId",
  isAuth,
  event_controller.eventRegistration
);

router.get("/registered-events", isAuth, event_controller.registeredEvents);

module.exports = router;
