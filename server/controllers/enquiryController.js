import Enquiry from "../models/Enquiry.js";
import sendEmail from "../utils/sendEmail.js";

// @desc    Submit new guest inquiry
// @route   POST /api/enquiries
// @access  Public
export const createEnquiry = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
      suitePreference,
      remarks,
    } = req.body;

    if (!firstName || !lastName || !emailAddress) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email address are required",
      });
    }

    const enquiry = await Enquiry.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emailAddress: emailAddress.trim().toLowerCase(),
      phoneNumber: phoneNumber?.trim() || "",
      suitePreference: suitePreference?.trim() || "Deluxe Room",
      remarks: remarks?.trim() || "",
      status: "New",
    });

    // Optionally attempt sending an automated confirmation to guest
    try {
      await sendEmail({
        to: enquiry.emailAddress,
        subject: "We have received your inquiry - Viceroy Resort",
        text: `Dear ${enquiry.firstName},\n\nThank you for contacting Viceroy Resort regarding the ${enquiry.suitePreference}. Our concierge team has received your inquiry and will reach out to you shortly.\n\nWarm regards,\nViceroy Concierge Team`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #faf8f5; border: 1px solid #e2dad0; color: #232d25;">
            <h1 style="color: #142217; letter-spacing: 2px; font-size: 22px; text-transform: uppercase; margin-bottom: 8px;">Viceroy Resort</h1>
            <p style="color: #c49d68; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 0;">Concierge Service</p>
            <hr style="border: none; border-top: 1px solid #e2dad0; margin: 20px 0;" />
            <p style="font-size: 16px;">Dear ${enquiry.firstName} ${enquiry.lastName},</p>
            <p style="line-height: 1.6; color: #3a453c;">Thank you for contacting Viceroy Resort. We have received your inquiry regarding the <strong>${enquiry.suitePreference}</strong>.</p>
            <p style="line-height: 1.6; color: #3a453c;">Our dedicated concierge team is curating the details for your stay and will reply to you shortly.</p>
            <div style="background: #ffffff; padding: 16px; border-left: 3px solid #c49d68; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #555;"><strong>Your Message:</strong></p>
              <p style="margin: 6px 0 0; font-style: italic; color: #666;">"${enquiry.remarks || "No additional remarks"}"</p>
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #666;">Warm regards,<br><strong style="color: #142217;">The Viceroy Concierge Team</strong></p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Automated enquiry confirmation email could not be sent:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      enquiry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit enquiry",
    });
  }
};

// @desc    Get all guest inquiries with filtering and stats
// @route   GET /api/enquiries
// @access  Admin only
export const getEnquiries = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { emailAddress: regex },
        { phoneNumber: regex },
        { suitePreference: regex },
      ];
    }

    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });

    const totalCount = await Enquiry.countDocuments();
    const newCount = await Enquiry.countDocuments({ status: "New" });
    const repliedCount = await Enquiry.countDocuments({ status: "Replied" });

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      stats: {
        total: totalCount,
        new: newCount,
        replied: repliedCount,
      },
      enquiries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch enquiries",
    });
  }
};

// @desc    Get single enquiry by ID
// @route   GET /api/enquiries/:id
// @access  Admin only
export const getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      enquiry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch enquiry",
    });
  }
};

// @desc    Reply to a guest inquiry (updates status & dispatches email)
// @route   POST /api/enquiries/:id/reply
// @access  Admin only
export const replyEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage, replySubject } = req.body;

    if (!replyMessage || !replyMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const enquiry = await Enquiry.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const subject =
      replySubject?.trim() ||
      `Viceroy Resort - Regarding your enquiry for ${enquiry.suitePreference}`;

    const adminName = req.user?.fullName || "Concierge Management";

    // Attempt to dispatch email via nodemailer
    let emailSent = false;
    let emailError = null;

    try {
      await sendEmail({
        to: enquiry.emailAddress,
        subject,
        text: `Dear ${enquiry.firstName} ${enquiry.lastName},\n\n${replyMessage}\n\nRegarding your inquiry:\nSuite: ${enquiry.suitePreference}\nYour Note: ${enquiry.remarks || "None"}\n\nWarm regards,\n${adminName}\nViceroy Resort Concierge Team`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 36px 28px; background: #faf8f5; border: 1px solid #e2dad0; color: #232d25;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #142217; letter-spacing: 3px; font-size: 24px; text-transform: uppercase; margin: 0;">Viceroy Resort</h1>
              <p style="color: #c49d68; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0;">Concierge Residence Care</p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e2dad0; margin: 20px 0;" />
            
            <p style="font-size: 16px; margin-bottom: 16px;">Dear ${enquiry.firstName} ${enquiry.lastName},</p>
            
            <div style="font-size: 15px; line-height: 1.7; color: #2e3b31; white-space: pre-line; margin-bottom: 24px;">
              ${replyMessage.trim()}
            </div>

            <div style="background: #ffffff; padding: 18px 20px; border-left: 3px solid #c49d68; border-radius: 4px; margin: 28px 0;">
              <p style="margin: 0 0 6px; font-size: 12px; letter-spacing: 1px; color: #8a7c6a; text-transform: uppercase; font-weight: bold;">Original Inquiry Details</p>
              <p style="margin: 0; font-size: 14px; color: #333;"><strong>Suite:</strong> ${enquiry.suitePreference}</p>
              ${enquiry.remarks ? `<p style="margin: 6px 0 0; font-size: 13px; color: #555;"><strong>Note:</strong> "${enquiry.remarks}"</p>` : ""}
            </div>

            <p style="margin-top: 32px; font-size: 14px; color: #555; line-height: 1.5;">
              Warmest regards,<br>
              <strong style="color: #142217; font-size: 15px;">${adminName}</strong><br>
              <span style="color: #8a7c6a;">Viceroy Resort Concierge Team</span>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2dad0; margin: 24px 0 16px;" />
            <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">
              Viceroy Resort & Residences · Luxury Coastal Living · concierge@viceroyresort.com
            </p>
          </div>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.error("Email dispatch failed:", err.message);
      emailError = err.message;
    }

    // Update enquiry record
    enquiry.replySubject = subject;
    enquiry.replyMessage = replyMessage.trim();
    enquiry.status = "Replied";
    enquiry.repliedAt = new Date();
    enquiry.repliedBy = adminName;

    await enquiry.save();

    return res.status(200).json({
      success: true,
      message: emailSent
        ? "Reply sent to customer successfully via email!"
        : `Reply saved in system. Note: Email delivery returned (${emailError || "check mail credentials"}).`,
      emailSent,
      enquiry,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reply to enquiry",
    });
  }
};

// @desc    Delete an enquiry
// @route   DELETE /api/enquiries/:id
// @access  Admin only
export const deleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const enquiry = await Enquiry.findByIdAndDelete(id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete enquiry",
    });
  }
};

export default {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  replyEnquiry,
  deleteEnquiry,
};
