const mongoose = require("mongoose");
const Payment = require("../models/payment");
const Organisation = require("../models/organisation");

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.BUCKET_REGION,
  credentials:
    process.env.ACCESS_KEY && process.env.SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.ACCESS_KEY,
          secretAccessKey: process.env.SECRET_ACCESS_KEY,
        }
      : undefined,
});

async function signOrNull(key, expiresIn = 900) {
  if (!key) return null;
  try {
    const cmd = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(s3, cmd, { expiresIn });
  } catch {
    return null;
  }
}

function toObjectId(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

exports.getOrganisationSettlements = async (req, res, next) => {
  try {
    const minPendingPaise = Number.isFinite(Number(req.query.minPendingPaise))
      ? Number(req.query.minPendingPaise)
      : 0;
    const q = (req.query.q || "").trim();

    const DEFAULT_PLATFORM_FEE_PERCENT = Number(
      process.env.DEFAULT_PLATFORM_FEE_PERCENT || 5
    );

    // Aggregate payments per organisation
    const pipeline = [
      {
        $match: {
          // captured/paid/succeeded payments only
          status: { $in: ["captured", "paid", "succeeded"] },
        },
      },
      {
        $project: {
          createdAt: 1,
          orgId: {
            $ifNull: ["$organisationId", { $ifNull: ["$organisation", "$orgId"] }],
          },
          // Use amountPaise if present; fallback to amount (assumed paise from Razorpay)
          amountPaise: {
            $ifNull: ["$amountPaise", { $ifNull: ["$amount", 0] }]
          },
          platformFeePaise: {
            $ifNull: [
              "$platformFeePaise",
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $ifNull: [
                          "$amountPaise",
                          { $ifNull: ["$amount", 0] }
                        ]
                      },
                      (Number(process.env.DEFAULT_PLATFORM_FEE_PERCENT || 5) / 100)
                    ]
                  },
                  0
                ]
              }
            ]
          },
          payoutStatus: 1,
          orgSharePaiseExisting: "$orgSharePaise",
        },
      },
      {
        $addFields: {
          orgSharePaise: {
            $ifNull: [
              "$orgSharePaiseExisting",
              { $subtract: ["$amountPaise", "$platformFeePaise"] }
            ]
          },
          paidOutPart: {
            $cond: [{ $in: ["$payoutStatus", ["paid", "settled"]] }, "$orgSharePaise", 0]
          }
        }
      },
      { $match: { orgId: { $ne: null } } },
      {
        $group: {
          _id: "$orgId",
          grossAmountPaise: { $sum: "$amountPaise" },
          platformFeePaise: { $sum: "$platformFeePaise" },
          orgSharePaise: { $sum: "$orgSharePaise" },
          paidOutPaise: { $sum: "$paidOutPart" },
          latestPaymentAt: { $max: "$createdAt" },
          paymentsCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          pendingPayoutPaise: {
            $max: [{ $subtract: ["$orgSharePaise", "$paidOutPaise"] }, 0],
          },
        },
      },
      { $match: { pendingPayoutPaise: { $gte: minPendingPaise } } },
      {
        $lookup: {
          from: "organisations",
          localField: "_id",
          foreignField: "_id",
          as: "org",
        },
      },
      { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
      ...(q
        ? [
            {
              $match: {
                $or: [
                  { "org.name": { $regex: q, $options: "i" } },
                  { "org.contact_email": { $regex: q, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          organisationId: "$_id",
          _id: 0,
          organisationName: { $ifNull: ["$org.name", "Unknown Organisation"] },
          organisationEmail: "$org.contact_email",
          imageName: "$org.imageName",
          totals: {
            grossAmountPaise: { $ifNull: ["$grossAmountPaise", 0] },
            platformFeePaise: { $ifNull: ["$platformFeePaise", 0] },
            orgSharePaise: { $ifNull: ["$orgSharePaise", 0] },
            paidOutPaise: { $ifNull: ["$paidOutPaise", 0] },
            pendingPayoutPaise: { $ifNull: ["$pendingPayoutPaise", 0] },
          },
          latestPaymentAt: 1,
          paymentsCount: 1,
        },
      },
      { $sort: { "totals.pendingPayoutPaise": -1, latestPaymentAt: -1 } },
    ];

    const rows = await Payment.aggregate(pipeline);
    // Sign organisation logos
    const signed = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        logoUrl: await signOrNull(r.imageName),
        currency: "INR",
      }))
    );

    return res.status(200).json({
      settlements: signed,
      count: signed.length,
      currency: "INR",
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

// Optional: mark payouts as settled (records only a marker; wire actual payout in your payment controller)
exports.markOrganisationPayoutSettled = async (req, res, next) => {
  try {
    const orgId = toObjectId(req.params.organisationId);
    if (!orgId) return res.status(400).json({ message: "Invalid organisationId" });

    // Mark all un-settled payments as settled by setting payoutStatus = 'settled'
    const result = await Payment.updateMany(
      {
        $and: [
          {
            $or: [
              { organisationId: orgId },
              { organisation: orgId },
              { orgId: orgId },
            ],
          },
          { status: { $in: ["captured", "paid", "succeeded"] } },
          { payoutStatus: { $nin: ["paid", "settled"] } },
        ],
      },
      {
        $set: {
          payoutStatus: "settled",
          payoutSettledAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      message: "Marked pending payouts as settled.",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};