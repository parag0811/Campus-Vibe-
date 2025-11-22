const dotenv = require("dotenv");
dotenv.config();
const { validationResult } = require("express-validator");

const Event = require("../models/event.js");
const Organisation = require("../models/organisation.js");
const OrganisationAdmin = require("../models/organisation-admin.js");
const User = require("../models/user.js");
const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const sharp = require("sharp");
const s3 = require("../middleware/s3Client.js");
// const Razorpay = require("razorpay");
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_ID_SECRET,
// });

exports.getMyOrganisation = async (req, res, next) => {
  try {
    const userId = req.userId;

    const organisation = await Organisation.findOne({
      createdBy: userId,
    }).lean();

    if (!organisation) {
      return res.status(200).json({
        hasOrganisation: false,
        organisation: null,
        organisationId: null,
      });
    }

    let imageUrl = null;

    if (organisation.imageName) {
      try {
        const getObjectParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: organisation.imageName,
        };
        const command = new GetObjectCommand(getObjectParams);
        imageUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      } catch (s3Error) {
        console.error("Failed to generate signed URL:", s3Error.message);
      }
    }

    return res.status(200).json({
      hasOrganisation: true,
      organisation,
      imageUrl,
      organisationId: organisation._id,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createOrganisation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const userId = req.userId;

    const existingOrg = await Organisation.findOne({ createdBy: userId });
    if (existingOrg) {
      return res.status(400).json({
        message: "You already have an organisation. You can only update it.",
      });
    }

    const {
      name,
      contact_email,
      description = "",
      kyc = {},
      bankAccountName,
      bankAccountNumber,
      bankIfsc,
      bankAddress
    } = req.body;

    const kycFullName = kyc.fullName || req.body["kyc.fullName"];
    const kycPhoneNumber = kyc.phoneNumber || req.body["kyc.phoneNumber"];

    const imageFile = req.files?.image?.[0];
    const docFile = req.files?.document?.[0];

    if (!imageFile) {
      const error = new Error("Organisation image is required.");
      error.statusCode = 422;
      throw error;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.mimetype)) {
      const error = new Error("Only .jpg, .png, or .webp images are allowed for logo.");
      error.statusCode = 422;
      throw error;
    }

    if (!docFile) {
      const error = new Error("KYC document is required.");
      error.statusCode = 422;
      throw error;
    }
    const allowedDocTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedDocTypes.includes(docFile.mimetype)) {
      const error = new Error("KYC document must be an image or PDF.");
      error.statusCode = 422;
      throw error;
    }

    if (!kycFullName || !kycPhoneNumber) {
      const error = new Error("KYC full name and phone number are required.");
      error.statusCode = 422;
      throw error;
    }

    // Bank validations
    const accName = (bankAccountName || "").trim();
    const accNum = (bankAccountNumber || "").trim();
    const ifsc = (bankIfsc || "").trim().toUpperCase();
    const addr = (bankAddress || "").trim();

    if (!accName) throw Object.assign(new Error("Bank account name is required."), { statusCode: 422 });
    if (!/^[0-9]{9,18}$/.test(accNum)) throw Object.assign(new Error("Invalid bank account number."), { statusCode: 422 });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw Object.assign(new Error("Invalid IFSC code."), { statusCode: 422 });
    if (addr.length < 5) throw Object.assign(new Error("Bank address is too short."), { statusCode: 422 });

    const randomName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
    const imageKey = `org/${userId}/${randomName()}`;
    const docKey = `org/${userId}/kyc/${randomName()}`;

    const imageBuffer = await sharp(imageFile.buffer)
      .resize({ height: 200, width: 200, fit: "contain" })
      .toBuffer();
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: imageKey,
      Body: imageBuffer,
      ContentType: imageFile.mimetype,
    }));

    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: docKey,
      Body: docFile.buffer,
      ContentType: docFile.mimetype,
    }));

    const organisation = new Organisation({
      createdBy: userId,
      name,
      description,
      contact_email,
      imageName: imageKey,
      bank: {
        accountName: accName,
        accountNumber: accNum,
        ifsc,
        address: addr,
      },
      kyc: {
        fullName: kycFullName,
        phoneNumber: kycPhoneNumber,
        documentUrl: docKey,
        verified: false,
      },
      payoutPreferences: {
        platformFeePercent: 5,
        minPayoutAmount: 0,
        settlementMode: "manual",
      }
    });

    await organisation.save();

    const user = await User.findById(userId);
    if (user) {
      user.role = "organisationAdmin";
      await user.save({ validateBeforeSave: false });
    }

    return res.status(201).json({
      message: "Organisation created successfully.",
      organisationId: organisation._id,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.updateOrganisationDetail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed. Enter fields correctly.");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const userId = req.userId;
    const organisation = await Organisation.findOne({ createdBy: userId });
    if (!organisation) {
      const error = new Error("No organisation found.");
      error.statusCode = 404;
      throw error;
    }

    organisation.name = req.body.name || organisation.name;
    organisation.description = req.body.description || organisation.description;
    organisation.contact_email =
      req.body.contact_email || organisation.contact_email;

    const kycFullName = req.body.kyc?.fullName || req.body["kyc.fullName"];
    const kycPhoneNumber =
      req.body.kyc?.phoneNumber || req.body["kyc.phoneNumber"];
    if (kycFullName) organisation.kyc.fullName = kycFullName;
    if (kycPhoneNumber) organisation.kyc.phoneNumber = kycPhoneNumber;

    // Bank updates (optional fields)
    const updates = {
      accountName: (req.body.bankAccountName || "").trim(),
      accountNumber: (req.body.bankAccountNumber || "").trim(),
      ifsc: (req.body.bankIfsc || "").trim().toUpperCase(),
      address: (req.body.bankAddress || "").trim(),
    };

    if (updates.accountName)
      organisation.bank.accountName = updates.accountName;
    if (updates.accountNumber) {
      if (!/^[0-9]{9,18}$/.test(updates.accountNumber)) {
        const e = new Error("Invalid bank account number.");
        e.statusCode = 422;
        throw e;
      }
      organisation.bank.accountNumber = updates.accountNumber;
    }
    if (updates.ifsc) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(updates.ifsc)) {
        const e = new Error("Invalid IFSC code.");
        e.statusCode = 422;
        throw e;
      }
      organisation.bank.ifsc = updates.ifsc;
    }
    if (updates.address) organisation.bank.address = updates.address;

    const imageFile = req.files?.image?.[0];
    const docFile = req.files?.document?.[0];

    if (imageFile) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(imageFile.mimetype)
      ) {
        const error = new Error(
          "Only .jpg, .png, or .webp images are allowed for logo."
        );
        error.statusCode = 422;
        throw error;
      }
      if (organisation.imageName) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: organisation.imageName,
          })
        );
      }
      const newImageKey = `org/${userId}/${crypto
        .randomBytes(16)
        .toString("hex")}`;
      const imageBuffer = await sharp(imageFile.buffer)
        .resize({ height: 200, width: 200, fit: "contain" })
        .toBuffer();
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: newImageKey,
          Body: imageBuffer,
          ContentType: imageFile.mimetype,
        })
      );
      organisation.imageName = newImageKey;
    }

    if (docFile) {
      const allowedDocTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedDocTypes.includes(docFile.mimetype)) {
        const error = new Error("KYC document must be an image or PDF.");
        error.statusCode = 422;
        throw error;
      }
      if (organisation.kyc?.documentUrl) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: organisation.kyc.documentUrl,
          })
        );
      }
      const newDocKey = `org/${userId}/kyc/${crypto
        .randomBytes(16)
        .toString("hex")}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: newDocKey,
          Body: docFile.buffer,
          ContentType: docFile.mimetype,
        })
      );
      organisation.kyc.documentUrl = newDocKey;
      organisation.kyc.verified = false;
    }

    // Ignore any Razorpay account ID updates; payouts are manual.

    await organisation.save();
    return res.status(200).json({ message: "Organisation information updated successfully." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.loadCreatedEvents = async (req, res, next) => {
  const { organisationId } = req.params;

  try {
    const organisation = await Organisation.findById(organisationId).lean();
    if (!organisation) {
      return res.status(404).json({ message: "Organisation not found." });
    }

    let createdEvents = await Event.find({
      created_by_organisation: organisationId,
    })
      .populate("created_by_organisation", "name")
      .lean();

    if (createdEvents.length === 0) {
      return res
        .status(404)
        .json({ message: "No events are created by your organisation." });
    }

    // Attach signed URLs
    for (let event of createdEvents) {
      if (event.posterImage) {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: event.posterImage,
        });

        const signedUrl = await getSignedUrl(s3, command, {
          expiresIn: 60 * 5, // 5 minutes
        });

        event.imageUrl = signedUrl;
      }
    }

    return res.status(200).json({ events: createdEvents });
  } catch (err) {
    console.error("Error loading created events:", err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.searchUser = async (req, res, next) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.assignAdmin = async (req, res, next) => {
  const { userId, organisationId } = req.body;

  try {
    const organisation = await Organisation.findOne({
      _id: organisationId,
      createdBy: req.userId,
    });
    if (!organisation) {
      const error = new Error("Create an organisation first.");
      error.statusCode = 403;
      throw error;
    }

    const adminExists = await OrganisationAdmin.findOne({
      user: userId,
      organisation: organisationId,
    });
    if (adminExists) {
      return res.status(409).json({
        success: false,
        message: "User is already assigned as admin.",
      });
    }

    await new OrganisationAdmin({ user: userId, organisation: organisationId }).save();

    await User.updateOne(
      { _id: userId },
      { $addToSet: { organisation_Admin: organisationId } }
    );

    return res.status(200).json({ message: "Admin assigned successfully." });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.removeAdmin = async (req, res, next) => {
  const { userId, organisationId } = req.body;

  try {
    const organisation = await Organisation.findOne({
      _id: organisationId,
      createdBy: req.userId,
    });
    if (!organisation) {
      const error = new Error("Create an organisation first.");
      error.statusCode = 403;
      throw error;
    }

    const deleteAdmin = await OrganisationAdmin.findOneAndDelete({
      user: userId,
      organisation: organisationId,
    });
    if (!deleteAdmin) {
      const error = new Error("User does not exist.");
      error.statusCode = 404;
      throw error;
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { organisation_Admin: organisationId } }
    );

    return res.status(200).json({ message: "Admin removed successfully." });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.deleteOrganisation = async (req, res, next) => {
  try {
    const userId = req.userId;
    const organisation = await Organisation.findOne({ createdBy: userId });
    if (!organisation) {
      const error = new Error("No organisation found for this user.");
      error.statusCode = 404;
      throw error;
    }

    await OrganisationAdmin.deleteMany({ organisation: organisation._id });
    await User.updateMany(
      { organisation_Admin: organisation._id },
      { $pull: { organisation_Admin: organisation._id } }
    );

    await organisation.deleteOne();

    const [ownerOwnsAny, ownerLinks] = await Promise.all([
      Organisation.exists({ createdBy: userId }),
      User.findById(userId).select("organisation_Admin role").lean(),
    ]);
    if (!ownerOwnsAny && (!ownerLinks?.organisation_Admin || ownerLinks.organisation_Admin.length === 0)) {
      await User.updateOne({ _id: userId }, { $set: { role: "student" } });
    }

    return res.status(200).json({ message: "Organisation deleted successfully." });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.loadAdmins = async (req, res, next) => {
  const { organisationId } = req.params;
  try {
    const organisation = await Organisation.findById(organisationId).lean();
    if (!organisation) {
      return res.status(404).json({ message: "Organisation not found." });
    }

    const fetchAdmin = await OrganisationAdmin.find({
      organisation: organisationId,
    })
      .populate("user", "name email profileImage")
      .lean();

    const admins = fetchAdmin.map((admin) => ({
      user: admin.user._id,
      userName: admin.user.name,
      userEmail: admin.user.email,
      profileImage: admin.user.profileImage || null,
      createdAt: admin.createdAt,
    }));

    return res.status(200).json({ admins });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
