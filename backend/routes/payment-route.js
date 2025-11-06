const express = require("express");
const router = express.Router();    

const isAuth = require("../middleware/is-auth.js");
const isProfileCompleted = require("../middleware/completeProfile.js")
const paymentController = require("../controllers/paymentController.js");

router.post("/create-order", isAuth, isProfileCompleted, paymentController.createOrder);

router.post("/verify-payment", isAuth, paymentController.verifyPayment);

router.get("/my-tickets", isAuth, paymentController.getMyTickets);

router.get("/ticket/:bookingId", isAuth, paymentController.getTicketDetails);

module.exports = router;