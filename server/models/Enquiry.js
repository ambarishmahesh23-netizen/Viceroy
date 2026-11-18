import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    lastName: {
      type: String,
      trim: true,
      default: "",
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    emailAddress: {
      type: String,
      trim: true,
      lowercase: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    suitePreference: {
      type: String,
      trim: true,
      default: "Deluxe Room",
    },

    subject: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

enquirySchema.pre("save", function (next) {
  if (this.name && (!this.firstName || !this.lastName)) {
    const parts = this.name.trim().split(" ");
    this.firstName = this.firstName || parts[0];
    this.lastName = this.lastName || parts.slice(1).join(" ") || parts[0];
  }
  if (!this.name && (this.firstName || this.lastName)) {
    this.name = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }
  if (this.email && !this.emailAddress) this.emailAddress = this.email;
  if (this.emailAddress && !this.email) this.email = this.emailAddress;
  if (this.phone && !this.phoneNumber) this.phoneNumber = this.phone;
  if (this.phoneNumber && !this.phone) this.phone = this.phoneNumber;
  if (this.subject && !this.suitePreference) this.suitePreference = this.subject;
  if (this.suitePreference && !this.subject) this.subject = this.suitePreference;
  if (this.message && !this.remarks) this.remarks = this.message;
  if (this.remarks && !this.message) this.message = this.remarks;
  if (typeof next === "function") {
    next();
  }
});

const Enquiry = mongoose.model("Enquiry", enquirySchema);

export default Enquiry;
