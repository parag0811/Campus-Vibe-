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
    .isInt({ min: 13, max: 99 })
    .withMessage("Age must be between 13 and 99."),
  body("college_name")
    .notEmpty()
    .withMessage("Please enter a valid college information.")
    .bail()
    .isLength({ max: 60 })
    .withMessage("College must be within 60 characters")
    .trim()
    .escape(),
  body("college_id")
    .notEmpty()
    .withMessage("Please enter a valid college id.")
    .bail()
    .isLength({ max: 24 })
    .withMessage("Id must be within 24 characters")
    .trim()
    .escape(),
  body("college_department")
    .notEmpty()
    .withMessage("Please enter your department/program.")
    .bail()
    .isLength({ max: 60 })
    .withMessage("Department must be within 60 characters")
    .trim()
    .escape(),
  body("college_year")
    .notEmpty()
    .withMessage("Please enter your current year/semester.")
    .bail()
    .isInt({ min: 1, max: 10 })
    .withMessage("Year must be between 1 and 10."),
];

const updateProfileValidate = [
  body("name").optional().isLength({ max: 16 }).trim().escape(),
  body("age").optional().isInt({ min: 13, max: 99 }),
  body("college_name").optional().isLength({ max: 60 }).trim().escape(),
  body("college_id").optional().isLength({ max: 24 }).trim().escape(),
  body("college_department").optional().isLength({ max: 60 }).trim().escape(),
  body("college_year").optional().isInt({ min: 1, max: 10 }),
];

const emailOnly = [
  body("email")
    .notEmpty()
    .withMessage("E-mail must not be empty.")
    .bail()
    .isEmail()
    .withMessage("E-mail must be valid.")
    .bail()
    .trim()
    .toLowerCase()
    .normalizeEmail(),
];

const emailAndOtp = [
  ...emailOnly,
  body("otp")
    .notEmpty()
    .withMessage("OTP is required.")
    .bail()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits.")
    .trim(),
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
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required.")
      .bail()
      .custom((v, { req }) => v === req.body.password)
      .withMessage("Password must be same in both the field."),
  ],
  user_controller.registerUser
);

// Login validators
router.post(
  "/login-user",
  [
    body("email").notEmpty().isEmail().trim().toLowerCase().normalizeEmail(),
    body("password").notEmpty().isLength({ min: 8, max: 72 }),
  ],
  user_controller.loginUser
);

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
  updateProfileValidate,
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
    body("confirmPassword")
      .notEmpty()
      .withMessage("Confirm password is required.")
      .bail()
      .custom((v, { req }) => v === req.body.password)
      .withMessage("Password must be same in both the field."),
  ],
  user_controller.resetPassword
);

router.get("/check-login", isAuth, user_controller.checkLogin);

router.post("/logout", user_controller.logoutCheck);

// OTP routes 
router.post(
  "/send-email-otp",
  emailOnly,
  user_controller.sendVerificationOTP
);
router.post(
  "/resend-email-otp",
  emailOnly,
  user_controller.resendVerificationOTP
);
router.post(
  "/verify-email-otp",
  emailAndOtp,
  user_controller.verifyOTP
);

module.exports = router;
