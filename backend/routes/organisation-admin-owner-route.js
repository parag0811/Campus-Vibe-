const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const isAuth = require("../middleware/is-auth.js");
const isOrgOwnerOrAdmin = require("../middleware/is-organisation-admin-owner.js");

const organisation_admin_controller = require("../controllers/organisation-admin-owner-controller.js");

const upload = require("../middleware/upload.js");

const eventCreationValidations = [
  // Title
  body("title")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Event title is required.")
    .bail()
    .isLength({ max: 40 })
    .withMessage("Event title must be at most 40 characters long."),

  // Description
  body("description")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 60, max: 600 })
    .withMessage("Description must be between 60 and 600 characters."),

  // Registration Deadline
  body("registeration_deadline")
    .isISO8601()
    .withMessage("Registration deadline must be a valid ISO date.")
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error("Registration deadline must not be in the past.");
      }
      return true;
    }),

  // Start Date
  body("start_date")
    .isISO8601()
    .withMessage("Start date must be a valid ISO date.")
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error("Start date must not be in the past.");
      }
      return true;
    }),

  // End Date
  body("end_date")
    .isISO8601()
    .withMessage("End date must be a valid ISO date.")
    .toDate()
    .custom((value, { req }) => {
      if (value < new Date()) {
        throw new Error("End date must not be in the past.");
      }
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error("End date must be after the start date.");
      }
      return true;
    }),

  // Venue
  body("venue")
    .notEmpty()
    .withMessage("Venue is required.")
    .isLength({ max: 100 })
    .withMessage("Venue can be at most 100 characters long."),

  // Mode
  body("mode")
    .isIn(["online", "offline", "hybrid"])
    .withMessage("Mode must be either 'online', 'offline', or 'hybrid'."),

  // Price
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number."),

  // Max Attendees
  body("max_attendees")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max attendees must be a positive number."),

  // Organiser Contact
  body("organiser_contact")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Organiser contact must be at most 50 characters long."),

  // Attendees
  body("attendees")
    .optional()
    .custom((value, { req }) => {
      const max = req.body.max_attendees;
      if (typeof max === "number" && Array.isArray(value)) {
        if (value.length > max) {
          throw new Error("Number of attendees exceeds the max allowed.");
        }
      }
      return true;
    }),

  // Poster Image (required field - multer handles file but validate key presence)
  body("posterImage").custom((_, { req }) => {
    if (!req.file && !req.body.posterImage) {
      throw new Error("Poster image is required.");
    }
    return true;
  }),
];

const eventEditValidations = [
  // Title
  body("title")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Event title is required.")
    .isLength({ max: 40 })
    .withMessage("Event title must be at most 40 characters long."),

  // Description
  body("description")
    .optional()
    .trim()
    .escape()
    .isLength({ min: 60, max: 600 })
    .withMessage("Description must be between 60 and 600 characters."),

  // Registration Deadline
  body("registeration_deadline")
    .isISO8601()
    .withMessage("Registration deadline must be a valid ISO date.")
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error("Registration deadline must not be in the past.");
      }
      return true;
    }),

  // Start Date
  body("start_date")
    .isISO8601()
    .withMessage("Start date must be a valid ISO date.")
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error("Start date must not be in the past.");
      }
      return true;
    }),

  // End Date
  body("end_date")
    .isISO8601()
    .withMessage("End date must be a valid ISO date.")
    .toDate()
    .custom((value, { req }) => {
      if (value < new Date()) {
        throw new Error("End date must not be in the past.");
      }
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error("End date must be after the start date.");
      }
      return true;
    }),

  // Venue
  body("venue")
    .notEmpty()
    .withMessage("Venue is required.")
    .isLength({ max: 100 })
    .withMessage("Venue can be at most 100 characters long."),

  // Mode
  body("mode")
    .isIn(["online", "offline", "hybrid"])
    .withMessage("Mode must be either 'online', 'offline', or 'hybrid'."),

  // Price
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a non-negative number."),

  // Max Attendees
  body("max_attendees")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max attendees must be a positive number."),

  // Organiser Contact
  body("organiser_contact")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("Organiser contact must be at most 50 characters long."),

  // Attendees
  body("attendees")
    .optional()
    .custom((value, { req }) => {
      const max = req.body.max_attendees;
      if (typeof max === "number" && Array.isArray(value)) {
        if (value.length > max) {
          throw new Error("Number of attendees exceeds the max allowed.");
        }
      }
      return true;
    }),
];

router.get(
  "/organisation/:organisationId/event/:eventId",
  isAuth,
  isOrgOwnerOrAdmin,
  organisation_admin_controller.getSingleEvent
);

router.post(
  "/organisation/:organisationId/register-new-event",
  isAuth,
  isOrgOwnerOrAdmin,
  upload.single("image"),
  eventCreationValidations,
  organisation_admin_controller.createEvent
);

router.put(
  "/organisation/:organisationId/edit-existing-event/:eventId",
  isAuth,
  isOrgOwnerOrAdmin,
  upload.single("image"),
  eventEditValidations,
  organisation_admin_controller.editCreatedEvent
);

router.delete(
  "/organisation/:organisationId/delete-event/:eventId",
  isAuth,
  isOrgOwnerOrAdmin,
  organisation_admin_controller.deleteEvent
);

router.get(
  "/organisation/:organisationId/event/:eventId/eventAnalytics",
  isAuth,
  isOrgOwnerOrAdmin,
  organisation_admin_controller.getEventAnalytics
);

module.exports = router;
