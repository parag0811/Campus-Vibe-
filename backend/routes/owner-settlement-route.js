const express = require("express");
const router = express.Router();

const isAuth = require("../middleware/is-auth");
const isSiteOwner = require("../middleware/is-site-owner");
const ctrl = require("../controllers/owner-settlement-controller");

router.get("/settlements", isAuth, isSiteOwner, ctrl.getOrganisationSettlements);

router.post(
  "/settlements/:organisationId/settle",
  isAuth,
  isSiteOwner,
  ctrl.markOrganisationPayoutSettled
);

module.exports = router;