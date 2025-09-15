const dotenv = require("dotenv");
dotenv.config();
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/mailSender.js");

const User = require("../models/user.js");

exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const isUserExists = await User.findOne({ email: email });
    if (isUserExists) {
      const error = new Error("E-mail already exists.");
      error.statusCode = 409;
      throw error;
    }

    if (confirmPassword !== password) {
      const error = new Error("Password must be same in both the field.");
      error.statusCode = 409;
      throw error;
    }

    const encryptedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      password: encryptedPassword,
    });
    await user.save();
    return res
      .status(201)
      .json({ success: true, message: "Registered Successfully." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await User.findOne({ email: email }).select("+password");
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

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userRole: user.role,
        profileCompleted : user.profileCompleted
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login Successfull!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.makeProfile = async (req, res, next) => {
  const name = req.body.name;
  const age = req.body.age;
  const college_name = req.body.college_name;
  const college_id = req.body.college_id;

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
    user.profileCompleted = true;

    await user.save();
    return res.status(200).json({
      success: true,
      message:
        "Thanks for completing the profile. Now browse your favourite events!.",
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

    const { _id, name, age, email, college_name, college_id, role } = user;
    return res.status(200).json({
      success: true,
      data: { _id, name, age, email, college_name, college_id, role },
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

    const { name, age, email, college_name, college_id } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Please login to update user details.",
      });
    }

    if (user.email !== email) {
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        const error = new Error("E-mail already exists!");
        error.statusCode = 409;
        throw error;
      }
      user.email = email;
    }

    user.name = name || user.name;
    user.age = age || user.age;
    user.college_id = college_id || user.college_id;
    user.college_name = college_name || user.college_name;
    user.profileCompleted = true;

    await user.save();
    return res.status(200).json({
      success: true,
      message: "Profile information updated successfully!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

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

    const resetURL = `http://localhost:3000/reset-password/${token}`;

    await sendEmail(
      user.email,
      "Password Reset",
      `Hey, Looks like you forgot some personal data. No worry! Reset via: ${resetURL}`
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
  return res.status(200).json({
    loggedIn: true,
    userId: req.userId,
    userRole: req.userRole,
  });
};

exports.logoutCheck = async (req, res, next) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/", // ensure it matches cookie path
  });
  return res.status(200).json({ message: "Logged Out" });
};
