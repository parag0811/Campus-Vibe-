const dotenv = require("dotenv");
dotenv.config();
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/mailSender.js");

const User = require("../models/user.js");

// Register: create user only; do NOT send OTP here
exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if (confirmPassword !== password) {
      const error = new Error("Password must be same in both the field.");
      error.statusCode = 409;
      throw error;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      const error = new Error("E-mail already exists.");
      error.statusCode = 409;
      throw error;
    }

    const encryptedPassword = await bcrypt.hash(password, 12);
    await User.create({
      email,
      password: encryptedPassword,
      isVerified: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Registered successfully. Please request an OTP to verify your email.",
      email,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.sendVerificationOTP = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = email ? await User.findOne({ email }) : null;
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (user.isVerified)
      return res
        .status(200)
        .json({ success: true, message: "E-mail is already verified." });

    const now = Date.now();
    const last = user.lastOtpSentAt
      ? new Date(user.lastOtpSentAt).getTime()
      : 0;
    if (now - last < 60_000) {
      const wait = Math.ceil((60_000 - (now - last)) / 1000);
      return res
        .status(429)
        .json({
          success: false,
          message: `Please wait ${wait} seconds before requesting OTP again.`,
        });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    user.emailVerificationOTP = await bcrypt.hash(otp, 10);
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.lastOtpSentAt = new Date();
    await user.save();

    await sendEmail(
      email,
      "OTP for Verification",
      `Your Campus Vibe verification code is ${otp}.\nThis code expires in 15 minutes.`
    );

    return res.json({
      success: true,
      message: "Verification OTP sent to email.",
    });
  } catch (error) {
    console.error("sendVerificationOTP error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// resend OTP
exports.resendVerificationOTP = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = email ? await User.findOne({ email }) : null;
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (user.isVerified)
      return res
        .status(200)
        .json({ success: true, message: "E-mail is already verified." });

    const now = Date.now();
    const last = user.lastOtpSentAt
      ? new Date(user.lastOtpSentAt).getTime()
      : 0;
    if (now - last < 60_000) {
      const wait = Math.ceil((60_000 - (now - last)) / 1000);
      return res
        .status(429)
        .json({
          success: false,
          message: `Please wait ${wait} seconds before resending OTP.`,
        });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    user.emailVerificationOTP = await bcrypt.hash(otp, 10);
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    user.lastOtpSentAt = new Date();
    await user.save();

    await sendEmail(
      email,
      "OTP for Verification",
      `Your new Campus Vibe verification code is ${otp}.\nThis code expires in 15 minutes.`
    );

    return res.json({ success: true, message: "OTP re-sent to email." });
  } catch (error) {
    console.error("resendVerificationOTP error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!otp) {
      return res
        .status(400)
        .json({ success: false, message: "OTP cannot be empty." });
    }

    // Include hidden fields
    const user = await User.findOne({ email }).select(
      "+emailVerificationOTP +emailVerificationExpires"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.isVerified) {
      return res
        .status(200)
        .json({ success: true, message: "E-mail already verified" });
    }
    if (!user.emailVerificationOTP || !user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: "OTP not requested or already used.",
      });
    }
    if (Date.now() > new Date(user.emailVerificationExpires).getTime()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.emailVerificationOTP);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationExpires = undefined;
    user.lastOtpSentAt = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.loginUser = async (req, res, next) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password;
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      const error = new Error("User does not exist. Sign-up with the email.");
      error.statusCode = 409;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Invalid Password!");
      error.statusCode = 409;
      throw error;
    }

    if (!user.isVerified) {trolle
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email to continue.",
        email: user.email,
      });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userRole: user.role,
        profileCompleted: user.profileCompleted,
        email:user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: "campus-vibe-backend.onrender.com",
      path : "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login Successfull!",
      isVerified: user.isVerified,
      profileCompleted: user.profileCompleted,
      email: user.email,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.makeProfile = async (req, res, next) => {
  const name = req.body.name;
  const age = req.body.age;
  const college_name = req.body.college_name;
  const college_id = req.body.college_id;
  const college_department = req.body.college_department;
  const college_year = req.body.college_year;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }

    user.name = name;
    user.age = age;
    user.college_name = college_name;
    user.college_id = college_id;
    user.college_department = college_department;
    user.college_year = college_year;
    user.profileCompleted = true;

    await user.save();
    return res.status(200).json({
      success: true,
      message:
        "Thanks for completing the profile. Explore your favourite events seamlessly!.",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Please login to get user details." });
    }

    const {
      _id,
      name,
      age,
      email,
      college_name,
      college_id,
      college_department,
      college_year,
      role,
      isVerified,
    } = user;
    return res.status(200).json({
      success: true,
      data: {
        _id,
        name,
        age,
        email,
        college_name,
        college_id,
        college_department,
        college_year,
        role,
        isVerified,
      },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed.Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const {
      name,
      age,
      college_name,
      college_id,
      college_department,
      college_year,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Please login to update user details.",
      });
    }

    if (typeof name !== "undefined") user.name = name;
    if (typeof age !== "undefined") user.age = age;
    if (typeof college_id !== "undefined") user.college_id = college_id;
    if (typeof college_name !== "undefined") user.college_name = college_name;
    if (typeof college_department !== "undefined")
      user.college_department = college_department;
    if (typeof college_year !== "undefined") user.college_year = college_year;

    const hasAllStudentFields =
      typeof name !== "undefined" &&
      typeof age !== "undefined" &&
      typeof college_name !== "undefined" &&
      typeof college_id !== "undefined" &&
      typeof college_department !== "undefined" &&
      typeof college_year !== "undefined";

    if (!user.profileCompleted && hasAllStudentFields) {
      user.profileCompleted = true;
    }

    await user.save();
    return res.status(200).json({
      success: true,
      message: "Profile information updated successfully!",
      isVerified: user.isVerified,
      verificationRequired: !user.isVerified,
      email: user.email,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.forgotPassword = async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetURL = `${baseUrl.replace(/\/$/, "")}/reset-password/${token}`;

    await sendEmail(
      user.email,
      "Password Reset",
      `Reset your password using this link (valid 10 minutes): ${resetURL}`
    );

    return res
      .status(200)
      .json({ success: true, message: "Password reset link sent to email" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const { token } = req.params;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User does not exist." });

    if (confirmPassword !== password) {
      const error = new Error("Password must be same in both the field.");
      error.statusCode = 409;
      throw error;
    }

    const encryptedPassword = await bcrypt.hash(password, 12);

    user.password = encryptedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password successfully reset" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.checkLogin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select(
      "role isVerified profileCompleted email"
    );
    if (!user) {
      return res.status(401).json({ loggedIn: false });
    }
    return res.status(200).json({
      loggedIn: true,
      userId: req.userId,
      userRole: user.role,
      isVerified: user.isVerified,
      profileCompleted: user.profileCompleted,
      email: user.email,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.logoutCheck = async (req, res, next) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain : "campus-vibe-backend.onrender.com",
    path: "/",
  });
  return res.status(200).json({ message: "Logged Out" });
};
