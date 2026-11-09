import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "Coastal Sanctuary",
    },
    totalRooms: {
      type: Number,
      default: 4,
      min: [1, "Total rooms must be at least 1"],
    },
    category: {
      type: String,
      required: [true, "Room category is required"],
      trim: true,
      default: "Deluxe Room",
    },
    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [0, "Price cannot be negative"],
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      default: 2,
      min: [1, "Capacity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["available", "booked", "maintenance"],
      default: "available",
    },
    image: {
      type: String,
      default: "/images/home1.png",
      trim: true,
    },
    amenities: {
      type: [String],
      default: ["Ocean View", "King Bed", "High-speed Wi-Fi", "Air Conditioning", "Breakfast Included"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    roomNumbers: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Utility helper to get all individual room numbers for a suite
export const getSuiteRoomNumbers = (room) => {
  const total = Number(room.totalRooms) || 4;
  const base = (room.roomNumber || "101").trim().toUpperCase();

  if (Array.isArray(room.roomNumbers) && room.roomNumbers.length >= total) {
    return room.roomNumbers.slice(0, total);
  }

  const list = [];
  for (let i = 1; i <= total; i++) {
    list.push(`${base}-${i}`);
  }
  return list;
};

const Room = mongoose.model("Room", roomSchema);

export default Room;
