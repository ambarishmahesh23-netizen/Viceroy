import mongoose from "mongoose";

const resortContentSchema = new mongoose.Schema(
  {
    resortName: {
      type: String,
      default: "Viceroy Resort",
      trim: true,
    },
    tagline: {
      type: String,
      default: "Where Luxury Meets the Horizon",
      trim: true,
    },
    heroEyebrow: {
      type: String,
      default: "EXCLUSIVE COASTAL SANCTUARY",
      trim: true,
    },
    heroTitle: {
      type: String,
      default: "Where Luxury Meets the Horizon",
      trim: true,
    },
    heroDescription: {
      type: String,
      default:
        "Experience untamed coastal elegance, secluded private residences, and deeply restorative wellness spaces beside the ocean.",
      trim: true,
    },
    heroBannerImage: {
      type: String,
      default: "/images/home1.png",
    },
    aboutEyebrow: {
      type: String,
      default: "A TIMELESS REFUGE",
      trim: true,
    },
    aboutTitle: {
      type: String,
      default: "Crafted for serenity, immersed in nature.",
      trim: true,
    },
    aboutDescription: {
      type: String,
      default:
        "Viceroy Resort harmonizes organic architectural lines with panoramic ocean vistas, creating a private retreat where refined hospitality and coastal tranquility converge.",
      trim: true,
    },
    aboutImage: {
      type: String,
      default: "/images/viceroy-bedroom.jpg",
    },
    experienceEyebrow: {
      type: String,
      default: "THE ART OF SLOW LIVING",
      trim: true,
    },
    experienceTitle: {
      type: String,
      default: "Your time, beautifully uninterrupted.",
      trim: true,
    },
    experienceDescription: {
      type: String,
      default:
        "Reconnect with nature through private wellness experiences, restorative spaces, and personalized resort hospitality.",
      trim: true,
    },
    contactEmail: {
      type: String,
      default: "concierge@viceroyresort.com",
      trim: true,
    },
    contactPhone: {
      type: String,
      default: "+91 98765 43210",
      trim: true,
    },
    contactAddress: {
      type: String,
      default: "Viceroy Sanctuary, Azure Coastline, Maldives",
      trim: true,
    },
    amenities: {
      type: [String],
      default: [
        "Private Plunge Pools",
        "Michelin Dining",
        "Ayurvedic Spa & Wellness",
        "24/7 Butler Service",
        "Secluded Oceanfront Access",
      ],
    },
  },
  {
    timestamps: true,
  }
);

const ResortContent = mongoose.model("ResortContent", resortContentSchema);

export default ResortContent;
