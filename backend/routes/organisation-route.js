const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const isAuth = require("../middleware/is-auth.js");
const isAuthorize = require("../middleware/authorize-roles.js");
const isOrgOwnerOrAdmin = require("../middleware/is-organisation-admin-owner.js");
const isOnlyOnwer  =require("../middleware/organisation-owner.js")
const organisation_controller = require("../controllers/organisation-controller.js");
const upload = require("../middleware/upload.js");

const organisationValidate = [
  body("name")
    .notEmpty()
    .trim()
    .withMessage("Name field can not be empty.")
    .isLength({ min: 6, max: 60 })
    .withMessage("Name must be in between 6-60 characters.").escape(),
  body("description")
    .notEmpty()
    .trim()
    .withMessage("Description field can not be empty.")
    .isLength({ min: 6, max: 100 })
    .withMessage("Description must be in between 6-100 characters.").escape(),
  body("contact_email")
    .notEmpty()
    .withMessage("E-mail field can not be empty.")
    .isEmail()
    .withMessage("Enter a valid email.")
    .trim()
    .toLowerCase().normalizeEmail(),
];

router.get(
  "/organisationAdmin/my-organisation",
  isAuth,
  isAuthorize("organisationAdmin"),
  organisation_controller.getMyOrganisation
);

router.post(
  "/organisationAdmin/create-organisation",
  isAuth,
  isAuthorize("organisationAdmin"),
  upload.single("image"),
  organisationValidate,
  organisation_controller.createOrganisation
);

router.put(
  "/organisationAdmin/update-organisation-detail",
  isAuth,
  isAuthorize("organisationAdmin"),
  upload.single("image"), 
  isOnlyOnwer,
  organisationValidate,
  organisation_controller.updateOrganisationDetail
);

router.delete(
  "/organisationAdmin/delete-organisation",
  isAuth,
  isAuthorize("organisationAdmin"),
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
)

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
