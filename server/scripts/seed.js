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

    // 1b. Seed Demo Customer User (Alexander Vance)
    const customerEmail = "alexander.vance@example.com";
    let customerUser = await User.findOne({ email: customerEmail });
    if (!customerUser) {
      const customerPassword = await bcrypt.hash("Password@123", 10);
      customerUser = await User.create({
        fullName: "Alexander Vance",
        email: customerEmail,
        password: customerPassword,
        role: "customer",
        phone: "+1 415 555 0192",
        walletBalance: 15000,
      });
      console.log(`Created demo customer user: ${customerEmail} (password: Password@123, wallet: 15000)`);
    } else {
      console.log(`Demo customer already exists: ${customerEmail}`);
    }

    // 2. Seed Rooms if none exist
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
      const initialRooms = [
        {
          roomNumber: "101",
          name: "Highland Family Villa",
          location: "Munnar Tea Slopes · 5,200 ft",
          totalRooms: 4,
          category: "Family Rooms",
          pricePerNight: 16000,
          capacity: 6,
          status: "available",
          image: "/images/munnar-room-living.jpg",
          images: [
            "/images/munnar-room-living.jpg",
            "/images/munnar-room-bedroom.jpg",
            "/images/balcony.png",
            "/images/dinningarea.png"
          ],
          amenities: [
            "Multiple Beds & Family Living Space",
            "Wood-Burning Stone Fireplace",
            "Misty Mountain View Balcony",
            "Complimentary High Tea for Family",
            "High-speed Wi-Fi",
            "Children's Welcome Kit"
          ],
          description: "Multiple beds and space for families. Features a stone fireplace, private balcony overlooking tea estates, interconnected sleeping spaces, and plenty of space to relax together above the clouds."
        },
        {
          roomNumber: "102",
          name: "Botanical Garden Villa",
          location: "Munnar Botanical Valley · 5,200 ft",
          totalRooms: 4,
          category: "Garden Rooms",
          pricePerNight: 14000,
          capacity: 4,
          status: "available",
          image: "/images/garden.png",
          images: [
            "/images/garden.png",
            "/images/munnar-signup.jpg",
            "/images/poolarea.png",
            "/images/balcony.png"
          ],
          amenities: [
            "Private Villa Surrounded by Greenery",
            "Direct Garden & Pathway Access",
            "Stone Walkway & Stream Bridge Views",
            "Private Outdoor Deck",
            "Organic Tea Bar",
            "Deep Soaking Tub"
          ],
          description: "Private villa surrounded by greenery, misty slopes, and lush flora. Features direct garden access, stone pathways, wooden bridge views, secluded outdoor sitting deck, and peaceful nature walks."
        },
        {
          roomNumber: "103",
          name: "Royal Presidential Sanctuary",
          location: "Munnar Summit Peak · 5,200 ft",
          totalRooms: 4,
          category: "Presidential Rooms",
          pricePerNight: 25000,
          capacity: 4,
          status: "available",
          image: "/images/munnar-room-bedroom.jpg",
          images: [
            "/images/munnar-room-bedroom.jpg",
            "/images/munnar-room-dining.jpg",
            "/images/munnar-room-bath.jpg",
            "/images/frontview.png"
          ],
          amenities: [
            "Premium Accommodation with Multiple Rooms",
            "Master Four-Poster Teak Suite",
            "Private Arched Dining Salon",
            "Artisan Copper & Slate Luxury Bath",
            "24/7 Dedicated Butler Service",
            "Panoramic 360° Cloud & Estate Views"
          ],
          description: "Premium accommodation with multiple rooms. Features a grand four-poster master suite, separate arched dining salon, handcrafted copper & slate bath, panoramic 360° cloud views, and dedicated 24/7 personal butler care."
        }
      ];

      await Room.insertMany(initialRooms);
      console.log(`Seeded ${initialRooms.length} luxury suites for Munnar.`);
    } else {
      console.log(`Rooms already present in database (${roomCount} rooms found).`);
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
