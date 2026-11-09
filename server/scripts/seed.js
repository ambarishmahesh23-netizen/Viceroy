import mongoose from "mongoose";
import bcrypt from "bcrypt";
import "dotenv/config";

import User from "../models/User.js";
import Room from "../models/Room.js";
import Enquiry from "../models/Enquiry.js";
import Review from "../models/Review.js";

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/viceroy_resort";
    console.log(`Connecting to MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully for seeding.");

    // 1. Seed Admin User
    const adminEmail = "admin@viceroyresort.com";
    let adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      adminUser = await User.create({
        fullName: "Viceroy Administrator",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log(`Created default admin user: ${adminEmail} (password: admin123)`);
    } else {
      adminUser.role = "admin";
      await adminUser.save();
      console.log(`Admin user already exists: ${adminEmail} (ensured role is 'admin')`);
    }

    // 2. Seed Rooms if none exist
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      const initialRooms = [
        {
          roomNumber: "101",
          name: "Travertine Ocean Horizon Pavilion",
          location: "Maldives Horizon Coast",
          totalRooms: 4,
          category: "Ocean View Suite",
          pricePerNight: 15000,
          capacity: 4,
          status: "available",
          image: "/images/viceroy-bedroom.jpg",
          amenities: ["Panoramic Oceanfront", "4 Luxury Rooms", "King Beds", "Private Terrace", "Complimentary Breakfast", "High-speed Wi-Fi"],
          description: "Perched above the turquoise coastline in Maldives with 4 private rooms, uninterrupted panoramic ocean views and bespoke travertine bath fixtures.",
        },
        {
          roomNumber: "102",
          name: "Private Garden Sanctuary",
          location: "Bali Tropical Botanical Valley",
          totalRooms: 4,
          category: "Luxury Suite",
          pricePerNight: 10000,
          capacity: 4,
          status: "available",
          image: "/images/viceroy-bath.jpg",
          amenities: ["Tropical Garden View", "4 Restorative Rooms", "Deep Soaking Tub", "Outdoor Rain Shower", "King Beds", "Espresso Bar"],
          description: "Nestled within secluded botanical gardens in Bali, featuring 4 serene rooms, restorative wellness bath rituals and serene natural lighting.",
        },
        {
          roomNumber: "103",
          name: "Architectural Coastal Residence",
          location: "Phuket Azure Peninsula",
          totalRooms: 4,
          category: "Royal Beach Villa",
          pricePerNight: 25000,
          capacity: 4,
          status: "booked",
          image: "/images/viceroy-villa.jpg",
          amenities: ["Private Infinity Pool", "4 Oceanfront Rooms", "Direct Beach Access", "Butler Service", "Sunset Deck"],
          description: "Exclusive multi-level architectural sanctuary in Phuket offering 4 spacious bedroom suites, bespoke beachside living and private plunge pool.",
        },
      ];

      await Room.insertMany(initialRooms);
      console.log(`Seeded ${initialRooms.length} luxury suites (each with 4 rooms in different locations).`);
    } else {
      console.log(`Rooms already present in database (${roomCount} rooms found). Ensuring locations and 4 rooms assigned.`);
      await Room.updateMany(
        { $or: [{ location: { $exists: false } }, { location: "" }, { location: null }] },
        { $set: { location: "Maldives Horizon Coast", totalRooms: 4 } }
      );
      await Room.updateOne(
        { roomNumber: "102" },
        { $set: { location: "Bali Tropical Botanical Valley", totalRooms: 4 } }
      );
      await Room.updateOne(
        { roomNumber: "103" },
        { $set: { location: "Phuket Azure Peninsula", totalRooms: 4 } }
      );
    }

    // 3. Seed Sample Enquiries if none exist
    const enquiryCount = await Enquiry.countDocuments();
    if (enquiryCount === 0) {
      const sampleEnquiries = [
        {
          firstName: "Eleanor",
          lastName: "Vance",
          emailAddress: "eleanor.vance@example.com",
          phoneNumber: "+1 555-0199",
          suitePreference: "Ocean View Suite",
          remarks: "Celebrating our 10th anniversary. Would love to request a complimentary champagne bottle and high floor.",
          status: "New",
        },
        {
          firstName: "Julian",
          lastName: "Mercer",
          emailAddress: "julian.mercer@example.com",
          phoneNumber: "+44 20 7946 0912",
          suitePreference: "Royal Beach Villa",
          remarks: "Inquiring about private yacht charter options during our stay next month for a party of 4.",
          status: "New",
        },
        {
          firstName: "Sophia",
          lastName: "Chen",
          emailAddress: "sophia.chen@example.com",
          phoneNumber: "+65 9123 4567",
          suitePreference: "Presidential Suite",
          remarks: "Requesting early check-in at 10 AM on December 15th if available.",
          status: "Replied",
          replySubject: "Regarding your early check-in request for Presidential Suite",
          replyMessage: "Dear Sophia,\n\nWe would be delighted to accommodate your early check-in at 10 AM on December 15th. Your suite will be fully prepared and ready for your arrival.\n\nWarmest regards,\nViceroy Concierge Team",
          repliedAt: new Date(Date.now() - 86400000),
          repliedBy: "Viceroy Administrator",
        },
      ];

      await Enquiry.insertMany(sampleEnquiries);
      console.log(`Seeded ${sampleEnquiries.length} sample inquiries (2 New, 1 Replied).`);
    } else {
      console.log(`Enquiries already present in database (${enquiryCount} inquiries found).`);
    }

    // 4. Seed Reviews if none exist (Module 8)
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0) {
      const sampleReviews = [
        {
          user: adminUser._id,
          userName: "Lady Claire Harrington",
          userEmail: "claire.h@luxurytravel.com",
          suiteName: "Travertine Ocean Horizon Pavilion",
          rating: 5,
          title: "An unhurried coastal paradise",
          comment: "The panoramic horizon vistas and soothing travertine bath rituals made our weekend unforgettable. The personalized concierge care was exemplary.",
          isVerifiedStay: true,
          status: "published",
        },
        {
          user: adminUser._id,
          userName: "Marcus Sterling",
          userEmail: "marcus.s@investments.co.uk",
          suiteName: "Architectural Coastal Residence",
          rating: 5,
          title: "Unrivaled architectural sanctuary",
          comment: "Private beach access and the infinity plunge pool were perfection. Every detail from the linen textures to sunset dining exceeded our expectations.",
          isVerifiedStay: true,
          status: "published",
        },
        {
          user: adminUser._id,
          userName: "Ananya Deshmukh",
          userEmail: "ananya.d@designstudio.in",
          suiteName: "Private Garden Sanctuary",
          rating: 5,
          title: "Deeply restorative wellness escape",
          comment: "Waking up to tropical botanical gardens and the ocean breeze was sublime. Can't wait to return next winter.",
          isVerifiedStay: true,
          status: "published",
        },
      ];
      await Review.insertMany(sampleReviews);
      console.log(`Seeded ${sampleReviews.length} verified guest reviews.`);
    }

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
