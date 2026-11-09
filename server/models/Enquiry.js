import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    emailAddress: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    suitePreference: {
      type: String,
      required: [true, "Suite preference is required"],
      trim: true,
      default: "Deluxe Room",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["New", "Contacted", "Replied", "Resolved"],
      default: "New",
    },

    replySubject: {
      type: String,
      trim: true,
      default: "",
    },

    replyMessage: {
      type: String,
      trim: true,
      default: "",
    },

    repliedAt: {
      type: Date,
      default: null,
    },

    repliedBy: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const Enquiry = mongoose.model("Enquiry", enquirySchema);

export default Enquiry;
