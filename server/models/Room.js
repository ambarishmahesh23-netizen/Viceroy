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
    title: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: "Maldives Horizon Coast",
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
    price: {
      type: Number,
      min: 0,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      default: 2,
      min: [1, "Capacity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["available", "booked", "maintenance", "Available", "Booked", "Maintenance"],
      default: "available",
    },
    image: {
      type: String,
      default: "/images/viceroy-bedroom.jpg",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roomSchema.pre("save", function (next) {
  if (this.name && !this.title) this.title = this.name;
  if (this.title && !this.name) this.name = this.title;
  if (this.pricePerNight !== undefined && this.price === undefined) this.price = this.pricePerNight;
  if (this.price !== undefined && this.pricePerNight === undefined) this.pricePerNight = this.price;
  if (this.image && (!this.images || this.images.length === 0)) this.images = [this.image];
  if (!this.image && this.images && this.images.length > 0) this.image = this.images[0];
  if (this.status) this.status = this.status.toLowerCase();
  if (typeof next === "function") {
    next();
  }
});

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
