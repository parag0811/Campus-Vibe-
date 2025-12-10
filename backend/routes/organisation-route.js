const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const isAuth = require("../middleware/is-auth.js");
const isAuthorize = require("../middleware/authorize-roles.js");
const isOrgOwnerOrAdmin = require("../middleware/is-organisation-admin-owner.js");
const isOnlyOnwer  = require("../middleware/organisation-owner.js");
const organisation_controller = require("../controllers/organisation-controller.js");
const upload = require("../middleware/upload.js");
const earningsController = require("../controllers/earnings-controller.js");

function normalizeOrgBody(req, _res, next) {
  req.body = req.body || {};
  const setIfMissing = (k, v) => {
    if (v !== undefined && req.body[k] === undefined) req.body[k] = v;
  };
  setIfMissing("bank.accountName", req.body.bankAccountName);
  setIfMissing("bank.accountNumber", req.body.bankAccountNumber);
  setIfMissing("bank.ifsc", (req.body.bankIfsc || "").toUpperCase().trim());
  setIfMissing("bank.address", req.body.bankAddress);
  setIfMissing("kyc.fullName", req.body["kyc.fullName"]);
  setIfMissing("kyc.phoneNumber", req.body["kyc.phoneNumber"]);
  next();
}

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
  body("razorpayAccountId")
    .optional()
    .matches(/^[A-Za-z0-9]{9,15}$/)
    .withMessage("Razorpay account ID must be 9-15 alphanumeric characters.")
    .trim(),
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

// Indian account number: digits only, 9–18; IFSC: ABCD0XXXXXX; address min 5
const bankValidate = [
  body("bank.accountName")
    .notEmpty().withMessage("Bank account name required.")
    .isLength({ min: 2, max: 80 }).withMessage("Account name length invalid.")
    .trim().escape(),
  body("bank.accountNumber")
    .notEmpty().withMessage("Bank account number required.")
    .matches(/^[0-9]{9,18}$/).withMessage("Invalid account number.")
    .trim(),
  body("bank.ifsc")
    .notEmpty().withMessage("IFSC required.")
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage("Invalid IFSC.")
    .trim().toUpperCase(),
  body("bank.address")
    .notEmpty().withMessage("Bank branch address required.")
    .isLength({ min: 5, max: 120 }).withMessage("Address length invalid.")
    .trim().escape()
];

const kycUpdateValidate = [
  body("kyc.fullName")
    .optional()
    .isLength({ min: 2, max: 80 }).withMessage("Full name must be 2-80 chars.")
    .trim().escape(),
  body("kyc.phoneNumber")
    .optional()
    .matches(/^[0-9+\-\s]{6,15}$/).withMessage("Enter a valid phone number.")
];

const bankUpdateValidate = [
  body("bank.accountName")
    .optional()
    .isLength({ min: 2, max: 80 }).withMessage("Account name length invalid.")
    .trim().escape(),
  body("bank.accountNumber")
    .optional()
    .matches(/^[0-9]{9,18}$/).withMessage("Invalid account number.")
    .trim(),
  body("bank.ifsc")
    .optional()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage("Invalid IFSC.")
    .trim().toUpperCase(),
  body("bank.address")
    .optional()
    .isLength({ min: 5, max: 120 }).withMessage("Address length invalid.")
    .trim().escape()
];

// Anyone logged-in can view their org
router.get(
  "/organisationAdmin/my-organisation",
  isAuth,
  organisation_controller.getMyOrganisation
);

router.post(
  "/organisationAdmin/create-organisation",
  isAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  normalizeOrgBody,
  organisationValidate,
  kycValidate,
  bankValidate,
  organisation_controller.createOrganisation
);

router.put(
  "/organisationAdmin/update-organisation-detail",
  isAuth,
  isOnlyOnwer,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  normalizeOrgBody,
  organisationValidate,
  kycUpdateValidate,
  bankUpdateValidate,
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

router.get(
  "/organisationAdmin/earnings",
  isAuth, 
  earningsController.getOrganisationEarnings
);

// PUBLIC: random organisation
router.get(
  "/organisations/public",
  organisation_controller.getPublicOrganisations
);

module.exports = router;
