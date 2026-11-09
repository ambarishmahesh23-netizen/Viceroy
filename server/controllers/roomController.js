import Room, { getSuiteRoomNumbers } from "../models/Room.js";
import Enquiry from "../models/Enquiry.js";
import Booking from "../models/Booking.js";

// Helper to compute room numbers, booked room counts, available room counts, and specific room numbers
export const getRoomAvailabilityDetails = (room, overlappingBookings = []) => {
  const totalRooms = Number(room.totalRooms) || 4;
  const suiteRoomNumbers = getSuiteRoomNumbers(room);
  const roomIdStr = room._id ? room._id.toString() : null;
  const roomNumberStr = (room.roomNumber || "").trim().toUpperCase();

  const bookedRoomNumbersSet = new Set();
  let totalBookedCount = 0;

  for (const b of overlappingBookings) {
    if (Array.isArray(b.suites) && b.suites.length > 0) {
      for (const s of b.suites) {
        const sRoomId = s.room ? s.room.toString() : null;
        const sRoomNumber = (s.roomNumber || "").trim().toUpperCase();
        if ((roomIdStr && sRoomId === roomIdStr) || (roomNumberStr && sRoomNumber === roomNumberStr)) {
          totalBookedCount += Number(s.roomsCount) || 1;
          if (Array.isArray(s.allocatedRoomNumbers) && s.allocatedRoomNumbers.length > 0) {
            s.allocatedRoomNumbers.forEach((rn) => bookedRoomNumbersSet.add(rn));
          }
        }
      }
    } else {
      const bRoomId = b.room ? b.room.toString() : null;
      const bRoomNumber = (b.roomNumber || "").trim().toUpperCase();
      if ((roomIdStr && bRoomId === roomIdStr) || (roomNumberStr && bRoomNumber === roomNumberStr)) {
        totalBookedCount += Number(b.roomsCount) || 1;
        if (Array.isArray(b.allocatedRoomNumbers) && b.allocatedRoomNumbers.length > 0) {
          b.allocatedRoomNumbers.forEach((rn) => bookedRoomNumbersSet.add(rn));
        }
      }
    }
  }

  // Ensure bookedRoomNumbers array matches the count
  const bookedRoomNumbers = [...bookedRoomNumbersSet];
  if (bookedRoomNumbers.length < totalBookedCount) {
    for (const rn of suiteRoomNumbers) {
      if (!bookedRoomNumbers.includes(rn) && bookedRoomNumbers.length < totalBookedCount) {
        bookedRoomNumbers.push(rn);
      }
    }
  }

  const bookedRoomsCount = Math.min(totalRooms, Math.max(totalBookedCount, bookedRoomNumbers.length));
  const freeRoomsCount = Math.max(0, totalRooms - bookedRoomsCount);
  const availableRoomNumbers = suiteRoomNumbers.filter((rn) => !bookedRoomNumbers.includes(rn));

  const isMaintenance = room.status === "maintenance";
  // Suite is available for booking as long as at least 1 room is free and not under maintenance!
  const isAvailableForDates = freeRoomsCount > 0 && !isMaintenance;

  return {
    totalRooms,
    roomNumbers: suiteRoomNumbers,
    bookedRoomsCount,
    freeRoomsCount,
    bookedRoomNumbers,
    availableRoomNumbers,
    isAvailableForDates,
    status: isMaintenance ? "maintenance" : freeRoomsCount === 0 ? "booked" : "available",
    occupancyStatus: isMaintenance
      ? "maintenance"
      : freeRoomsCount === 0
      ? "booked"
      : bookedRoomsCount > 0
      ? "partially-booked"
      : "available",
    availabilityReason: isMaintenance
      ? "Under Maintenance"
      : freeRoomsCount === 0
      ? "Fully Booked for Selected Dates"
      : bookedRoomsCount > 0
      ? `Available (${freeRoomsCount} of ${totalRooms} Rooms Free · ${bookedRoomsCount} Booked)`
      : `Available (All ${totalRooms} Rooms Free)`,
  };
};

// @desc    Check room availability for a requested date range (Module 4)
// @route   GET /api/rooms/check-availability
// @access  Public
export const checkRoomAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, category } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: "Both checkIn and checkOut dates are required",
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in or check-out date range",
      });
    }

    // Find all overlapping active bookings
    const overlappingBookings = await Booking.find({
      status: { $in: ["confirmed", "checked-in"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });

    const roomFilter = {};
    if (category && category !== "all") {
      roomFilter.category = category;
    }

    const allRooms = await Room.find(roomFilter);

    const roomsWithAvailability = allRooms.map((room) => {
      const details = getRoomAvailabilityDetails(room, overlappingBookings);
      return {
        ...room.toObject(),
        ...details,
      };
    });

    const availableRooms = roomsWithAvailability.filter((r) => r.isAvailableForDates);

    return res.status(200).json({
      success: true,
      totalRooms: allRooms.length,
      availableCount: availableRooms.length,
      rooms: roomsWithAvailability,
      availableRooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check room availability",
    });
  }
};

// @desc    Get all rooms (supports filter by status, category, search)
// @route   GET /api/rooms
// @access  Public / Admin
export const getRooms = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { roomNumber: regex },
        { category: regex },
        { location: regex },
      ];
    }

    const rooms = await Room.find(filter).sort({ roomNumber: 1 });

    const activeBookings = await Booking.find({
      status: { $in: ["confirmed", "checked-in"] },
    });

    let enrichedRooms = rooms.map((room) => {
      const details = getRoomAvailabilityDetails(room, activeBookings);
      return {
        ...room.toObject(),
        ...details,
      };
    });

    if (status && status !== "all") {
      const target = status.toLowerCase();
      if (target === "available") {
        enrichedRooms = enrichedRooms.filter((r) => r.freeRoomsCount > 0 && r.status !== "maintenance");
      } else if (target === "booked") {
        enrichedRooms = enrichedRooms.filter((r) => r.freeRoomsCount === 0 || r.status === "booked");
      } else if (target === "maintenance") {
        enrichedRooms = enrichedRooms.filter((r) => r.status === "maintenance");
      }
    }

    return res.status(200).json({
      success: true,
      count: enrichedRooms.length,
      rooms: enrichedRooms,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch rooms",
    });
  }
};

// @desc    Get counts: available rooms, booked rooms, total rooms, enquiry stats
// @route   GET /api/rooms/stats
// @access  Admin only (or public stats overview)
export const getRoomStats = async (req, res) => {
  try {
    const allRooms = await Room.find({});
    const activeBookings = await Booking.find({
      status: { $in: ["confirmed", "checked-in"] },
    });

    let totalRoomsCount = 0;
    let totalBookedRoomsCount = 0;
    let availableSuitesCount = 0;
    let bookedSuitesCount = 0;
    let maintenanceSuitesCount = 0;

    for (const room of allRooms) {
      const details = getRoomAvailabilityDetails(room, activeBookings);
      totalRoomsCount += details.totalRooms;
      totalBookedRoomsCount += details.bookedRoomsCount;

      if (room.status === "maintenance") {
        maintenanceSuitesCount++;
      } else if (details.freeRoomsCount === 0) {
        bookedSuitesCount++;
      } else {
        availableSuitesCount++;
      }
    }

    const availableRoomsCount = Math.max(0, totalRoomsCount - totalBookedRoomsCount);
    const occupancyRate =
      totalRoomsCount > 0 ? Math.round((totalBookedRoomsCount / totalRoomsCount) * 100) : 0;

    const [totalEnquiries, newEnquiries, repliedEnquiries, nonCancelledBookings] = await Promise.all([
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: "New" }),
      Enquiry.countDocuments({ status: "Replied" }),
      Booking.find({ status: { $ne: "cancelled" } }).select("totalPrice"),
    ]);

    const totalRevenue = nonCancelledBookings.reduce(
      (sum, b) => sum + (Number(b.totalPrice) || 0),
      0
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalSuites: allRooms.length,
        availableSuites: availableSuitesCount,
        bookedSuites: bookedSuitesCount,
        maintenanceSuites: maintenanceSuitesCount,
        totalRooms: totalRoomsCount,
        availableRooms: availableRoomsCount,
        bookedRooms: totalBookedRoomsCount,
        occupancyRate,
        totalEnquiries,
        newEnquiries,
        repliedEnquiries,
        totalRevenue,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate room statistics",
    });
  }
};

// @desc    Get single room by ID
// @route   GET /api/rooms/:id
// @access  Public
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch room details",
    });
  }
};

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Admin only
export const createRoom = async (req, res) => {
  try {
    const {
      roomNumber,
      name,
      location,
      totalRooms,
      category,
      pricePerNight,
      capacity,
      status,
      image,
      amenities,
      description,
    } = req.body;

    if (!roomNumber || !name || pricePerNight === undefined) {
      return res.status(400).json({
        success: false,
        message: "Room number, name, and price per night are required",
      });
    }

    const existingRoom = await Room.findOne({
      roomNumber: roomNumber.trim().toUpperCase(),
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: `Room with number ${roomNumber.trim().toUpperCase()} already exists`,
      });
    }

    // Process amenities array
    let parsedAmenities = amenities;
    if (typeof amenities === "string") {
      parsedAmenities = amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    }

    const newRoom = await Room.create({
      roomNumber: roomNumber.trim().toUpperCase(),
      name: name.trim(),
      location: location?.trim() || "Coastal Sanctuary",
      totalRooms: totalRooms ? Number(totalRooms) : 4,
      category: category?.trim() || "Deluxe Room",
      pricePerNight: Number(pricePerNight),
      capacity: capacity ? Number(capacity) : 4,
      status: status?.toLowerCase() || "available",
      image: image?.trim() || "/images/home1.png",
      amenities: Array.isArray(parsedAmenities) && parsedAmenities.length > 0
        ? parsedAmenities
        : ["Ocean View", "King Bed", "High-speed Wi-Fi", "Air Conditioning", "Breakfast Included"],
      description: description?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: newRoom,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create room",
    });
  }
};

// @desc    Update room details
// @route   PUT /api/rooms/:id
// @access  Admin only
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.roomNumber) {
      updateData.roomNumber = updateData.roomNumber.trim().toUpperCase();

      // Check for room number duplicate
      const duplicate = await Room.findOne({
        roomNumber: updateData.roomNumber,
        _id: { $ne: id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Room number ${updateData.roomNumber} is already in use by another room`,
        });
      }
    }

    if (updateData.pricePerNight !== undefined) {
      updateData.pricePerNight = Number(updateData.pricePerNight);
    }

    if (updateData.capacity !== undefined) {
      updateData.capacity = Number(updateData.capacity);
    }

    if (updateData.totalRooms !== undefined) {
      updateData.totalRooms = Number(updateData.totalRooms);
    }

    if (typeof updateData.amenities === "string") {
      updateData.amenities = updateData.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    }

    const updatedRoom = await Room.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedRoom) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room: updatedRoom,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update room",
    });
  }
};

// @desc    Toggle room status (available <-> booked)
// @route   PATCH /api/rooms/:id/status
// @access  Admin only
export const toggleRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (status) {
      room.status = status.toLowerCase();
    } else {
      // Toggle between available and booked
      room.status = room.status === "available" ? "booked" : "available";
    }

    await room.save();

    return res.status(200).json({
      success: true,
      message: `Room status updated to ${room.status}`,
      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle room status",
    });
  }
};

// @desc    Remove / delete a room
// @route   DELETE /api/rooms/:id
// @access  Admin only
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findByIdAndDelete(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Room ${room.roomNumber} (${room.name}) deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete room",
    });
  }
};
