const express = requrie("express");
const { body } = require("express-validator");
const router = express.Router();    

const isAuth = require("../middleware/is-auth.js");
const paymentController = require("../controllers/paymentController.js");

router.post("/payment/create-order", isAuth, paymentController.createOrder);

module.exports = router;