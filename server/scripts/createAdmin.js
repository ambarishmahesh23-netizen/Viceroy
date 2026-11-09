import mongoose from "mongoose";
import bcrypt from "bcrypt";
import "dotenv/config";
import User from "../models/User.js";

const createOrUpdateAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/viceroy_resort";
    await mongoose.connect(mongoUri);

    // Read command line arguments:
    // node scripts/createAdmin.js <email> <password> [fullName]
    const args = process.argv.slice(2);
    const email = args[0] ? args[0].trim().toLowerCase() : "admin@viceroyresort.com";
    const password = args[1] ? args[1].trim() : "admin123";
    const fullName = args[2] ? args[2].trim() : "Viceroy Administrator";

    if (!email || !password) {
      console.log("Usage: node scripts/createAdmin.js <email> <password> [fullName]");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await User.findOne({ email });

    if (user) {
      // Update existing user to admin with new password
      user.password = hashedPassword;
      user.role = "admin";
      if (args[2]) user.fullName = fullName;
      await user.save();
      console.log("\n=======================================================");
      console.log("   ADMIN ACCOUNT UPDATED SUCCESSFULLY");
      console.log("=======================================================");
      console.log(`   Email / Username : ${user.email}`);
      console.log(`   Password         : ${password}`);
      console.log(`   Full Name        : ${user.fullName}`);
      console.log(`   Role in MongoDB  : ${user.role}`);
      console.log("=======================================================\n");
    } else {
      // Create new admin user
      user = await User.create({
        fullName,
        email,
        password: hashedPassword,
        role: "admin",
      });
      console.log("\n=======================================================");
      console.log("   NEW ADMIN ACCOUNT CREATED SUCCESSFULLY");
      console.log("=======================================================");
      console.log(`   Email / Username : ${user.email}`);
      console.log(`   Password         : ${password}`);
      console.log(`   Full Name        : ${user.fullName}`);
      console.log(`   Role in MongoDB  : ${user.role}`);
      console.log("=======================================================\n");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error creating/updating admin:", error.message);
    process.exit(1);
  }
};

createOrUpdateAdmin();
