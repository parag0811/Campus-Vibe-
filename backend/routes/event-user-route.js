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

// User's own events (upcoming / past)
router.get("/my-events", isAuth, event_controller.getMyEvents);

// Cancel a registration
router.delete("/cancel/:eventId", isAuth, event_controller.cancelRegistration);

// Search & filters
router.get("/search", event_controller.getEventsFiltered);

// Organisation public page
router.get("/org/:orgId", event_controller.getEventsByOrganisation);

// Trending / popular events
router.get("/trending", event_controller.getTrendingEvents);

module.exports = router;
