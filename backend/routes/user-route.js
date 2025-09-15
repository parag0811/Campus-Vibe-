const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const isAuth = require("../middleware/is-auth.js");
const user_controller = require("../controllers/user-controller.js");

const profileValidate = [
  body("name")
    .notEmpty()
    .withMessage("Please enter a valid name.")
    .bail()
    .isLength({ max: 16 })
    .withMessage("Name must be within 16 characters")
    .trim()
    .escape(),
  body("age")
    .notEmpty()
    .withMessage("Please enter a valid age.")
    .bail()
    .trim()
    .bail()
    .isInt({ min: 13, max: 99 })
    .withMessage("Age must be between 13 and 99."),
  body("college_name")
    .notEmpty()
    .withMessage("Please enter a valid college information.")
    .bail()
    .isLength({ max: 60 })
    .withMessage("College must be within 60 characters")
    .escape(),
  body("college_id")
    .notEmpty()
    .withMessage("Please enter a valid college id.")
    .bail()
    .isLength({ max: 24 })
    .withMessage("Id must be within 24 characters")
    .escape(),
];

router.post(
  "/register-new-user",
  [
    body("email")
      .notEmpty()
      .withMessage("E-mail must not be an empty field.")
      .bail()
      .isEmail()
      .withMessage("E-mail must be valid.")
      .bail()
      .trim()
      .toLowerCase()
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password cannot be an empty field.")
      .bail()
      .trim()
      .isLength({ min: 8, max: 18 })
      .withMessage("Password must be 8-18 characters long.")
      .bail()
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase character.")
      .bail()
      .matches(/[0-9]/)
      .withMessage("Password must contain atleast one number."),
  ],
  user_controller.registerUser
);

router.post("/login-user", user_controller.loginUser);

router.post(
  "/user-profile",
  isAuth,
  profileValidate,
  user_controller.makeProfile
);

router.get("/update-user-profile", isAuth, user_controller.getProfile);

router.put(
  "/update-user-profile",
  isAuth,
  profileValidate,
  user_controller.updateProfile
);

router.post("/forgot-password", user_controller.forgotPassword);

router.post(
  "/reset-password/:token",
  [
    body("password")
      .notEmpty()
      .withMessage("Password cannot be an empty field.")
      .bail()
      .trim()
      .isLength({ min: 8, max: 18 })
      .withMessage("Password must be 8-18 characters long.")
      .bail()
      .matches(/[A-Z]/)
      .withMessage("Password must contain atleast one uppercase character.")
      .bail()
      .matches(/[0-9]/)
      .withMessage("Password must contain atleast one number."),
  ],
  user_controller.resetPassword
);

router.get("/check-login", isAuth, user_controller.checkLogin);

router.post("/logout", user_controller.logoutCheck);
module.exports = router;
