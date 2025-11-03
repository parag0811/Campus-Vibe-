const express = require("express");
const router = express.Router();    

const isAuth = require("../middleware/is-auth.js");
const paymentController = require("../controllers/paymentController.js");

router.post("/create-order", isAuth, paymentController.createOrder);

router.post("/verify-payment", isAuth, paymentController.verifyPayment);

module.exports = router;