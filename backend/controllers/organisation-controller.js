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
    // Check if organisation already exists
    const existingOrg = await Organisation.findOne({ createdBy: userId });
    if (existingOrg) {
      return res.status(400).json({
        message: "You already have an organisation. You can only update it.",
      });
    }

    const { name, contact_email, description = "" } = req.body;

    if (!req.file) {
      const error = new Error("Image is required to create an organisation.");
      error.statusCode = 422;
      throw error;
    }
    const file = req.file;

    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    ) {
      const error = new Error("Only .jpg, .png, or .webp images are allowed.");
      error.statusCode = 422;
      throw error;
    }

    const randomImageName = (bytes = 32) =>
      crypto.randomBytes(bytes).toString("hex");

    const imageName = randomImageName();

    const buffer = await sharp(req.file.buffer)
      .resize({ height: 200, width: 200, fit: "contain" })
      .toBuffer();

    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: imageName,
      Body: buffer,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);

    await s3.send(command);

    const organisation = new Organisation({
      createdBy: userId,
      name,
      description,
      contact_email,
      imageName,
    });

    await organisation.save();

    return res
      .status(201)
      .json({ message: "Organisation created sucessfully!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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

    // if (!req.file) {
    //   const error = new Error("Image is required to create an organisation.");
    //   error.statusCode = 422;
    //   throw error;
    // }

    if (req.file) {
      if (organisation.imageName) {
        const deleteParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: organisation.imageName,
        };
        await s3.send(new DeleteObjectCommand(deleteParams));
      }

      const file = req.file;
      const randomImageName = (bytes = 32) =>
        crypto.randomBytes(bytes).toString("hex");
      const imageName = randomImageName();
      const buffer = await sharp(req.file.buffer)
        .resize({ height: 200, width: 200, fit: "contain" })
        .toBuffer();

      const uploadParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: imageName,
        Body: buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(uploadParams);

      await s3.send(command);

      organisation.imageName = imageName;
    }

    await organisation.save();

    return res
      .status(200)
      .json({ message: "Organisation information updated successfully." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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
    if (!organisation.imageName) {
      const error = new Error(
        "Organisation image not found. Deletion aborted."
      );
      error.statusCode = 400;
      throw error;
    }
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: organisation.imageName,
    };
    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    await organisation.deleteOne();
    return res
      .status(200)
      .json({ message: "Organisation deleted successfully." });
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
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

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

    const newAdmin = new OrganisationAdmin({
      user: userId,
      organisation: organisationId,
    });

    await newAdmin.save();

    return res.status(200).json({ message: "Admin assigned successfully." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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
    return res.status(200).json({ message: "Admin removed successfully." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
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

    // Populate user details for each admin
    const fetchAdmin = await OrganisationAdmin.find({
      organisation: organisationId,
    })
      .populate("user", "name email profilePicture")
      .lean();

    // Transform to include user details
    const admins = fetchAdmin.map(admin => ({
      user: admin.user._id,
      userName: admin.user.name,
      userEmail: admin.user.email,
      profilePicture: admin.user.profilePicture || null,
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

