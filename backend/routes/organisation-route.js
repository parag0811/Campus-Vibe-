const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const isAuth = require("../middleware/is-auth.js");
const isAuthorize = require("../middleware/authorize-roles.js");
const isOrgOwnerOrAdmin = require("../middleware/is-organisation-admin-owner.js");
const isOnlyOnwer  = require("../middleware/organisation-owner.js");
const organisation_controller = require("../controllers/organisation-controller.js");
const upload = require("../middleware/upload.js");

// Validators
const organisationValidate = [
  body("name")
    .notEmpty().trim().withMessage("Name field can not be empty.")
    .isLength({ min: 6, max: 60 }).withMessage("Name must be in between 6-60 characters.").escape(),
  body("description")
    .notEmpty().trim().withMessage("Description field can not be empty.")
    .isLength({ min: 6, max: 100 }).withMessage("Description must be in between 6-100 characters.").escape(),
  body("contact_email")
    .notEmpty().withMessage("E-mail field can not be empty.")
    .isEmail().withMessage("Enter a valid email.")
    .trim().toLowerCase().normalizeEmail(),
];

const kycValidate = [
  body("kyc.fullName")
    .notEmpty().withMessage("KYC full name is required.")
    .isLength({ min: 2, max: 80 }).withMessage("Full name must be 2-80 chars.")
    .trim().escape(),
  body("kyc.phoneNumber")
    .notEmpty().withMessage("KYC phone number is required.")
    .matches(/^[0-9+\-\s]{6,15}$/).withMessage("Enter a valid phone number."),
];

// Razorpay Account ID required at creation
const payoutAccountValidate = [
  body("razorpayAccountId")
    .notEmpty().withMessage("Razorpay Account ID is required.")
    .bail()
    .matches(/^acc_[A-Za-z0-9]+$/).withMessage("Enter a valid Razorpay Account ID (starts with acc_).")
    .isLength({ min: 10, max: 40 }).withMessage("Invalid Razorpay Account ID length.")
];

// Anyone logged-in can view their org
router.get(
  "/organisationAdmin/my-organisation",
  isAuth,
  organisation_controller.getMyOrganisation
);

// Create organisation (KYC + Razorpay Account ID)
router.post(
  "/organisationAdmin/create-organisation",
  isAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  organisationValidate,
  kycValidate,
  payoutAccountValidate,
  organisation_controller.createOrganisation
);

// Update org (owner). Razorpay Account ID is NOT editable here.
router.put(
  "/organisationAdmin/update-organisation-detail",
  isAuth,
  isOnlyOnwer,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  organisationValidate,
  organisation_controller.updateOrganisationDetail
);

router.delete(
  "/organisationAdmin/delete-organisation",
  isAuth,
  isOnlyOnwer,
  organisation_controller.deleteOrganisation
);

router.get(
  "/organisation/:organisationId/createdEvents",
  isAuth,
  isOrgOwnerOrAdmin,
  organisation_controller.loadCreatedEvents
);

router.get(
  "/organisation/searchUser",
  isAuth,
  isAuthorize("organisationAdmin"),
  isOnlyOnwer,
  organisation_controller.searchUser
);

router.post(
  "/organisationAdmin/assign-organisation-admin",
  isAuth,
  isAuthorize("organisationAdmin"),
  isOnlyOnwer,
  organisation_controller.assignAdmin
);

router.post(
  "/organisationAdmin/remove-organisation-admin",
  isAuth,
  isAuthorize("organisationAdmin"),
  isOnlyOnwer,
  organisation_controller.removeAdmin
);

router.get(
  "/organisation/:organisationId/all-admins",
  isAuth,
  isOrgOwnerOrAdmin,
  organisation_controller.loadAdmins
);

module.exports = router;
