import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room, { getSuiteRoomNumbers } from "../models/Room.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import { calculateNights } from "../utils/dateUtils.js";
import { generateBookingConfirmationEmail } from "../utils/emailTemplates.js";
/**
 * Core business logic to create a resort booking
 */
export const createBookingService = async (bodyData, user) => {
  const {
    roomId,
    roomName,
    roomCategory,
    roomNumber,
    roomImage,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    guests,
    roomsCount,
    pricePerNight,
    totalPrice,
    suites: requestedSuitesPayload,
    paymentMethod = "Credit/Debit Card",
    cardLast4 = "4242",
    notes,
  } = bodyData;

  if (!checkIn || !checkOut || !guestName || !guestEmail) {
    throw new Error("Check-in, check-out dates, guest name, and email are required");
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    throw new Error("Invalid date format provided");
  }

  if (checkOutDate <= checkInDate) {
    throw new Error("Check-out date must be after check-in date");
  }

  const calculatedNights = Math.max(
    1,
    Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
  );

  let suitesToProcess = [];
  if (Array.isArray(requestedSuitesPayload) && requestedSuitesPayload.length > 0) {
    suitesToProcess = requestedSuitesPayload;
  } else {
    suitesToProcess = [
      {
        roomId,
        roomName,
        roomCategory,
        roomNumber,
        roomImage,
        roomsCount: Number(roomsCount) || 1,
        pricePerNight: Number(pricePerNight),
        totalPrice: Number(totalPrice),
      },
    ];
  }

  const overlappingBookings = await Booking.find({
    status: { $in: ["confirmed", "checked-in"] },
    checkIn: { $lt: checkOutDate },
    checkOut: { $gt: checkInDate },
  });

  const processedSuites = [];
  let overallAllocatedRoomNumbers = [];

  for (const item of suitesToProcess) {
    let matchedRoom = null;
    if (item.roomId && !String(item.roomId).startsWith("default")) {
      matchedRoom = await Room.findById(item.roomId);
    } else if (item.roomNumber) {
      matchedRoom = await Room.findOne({ roomNumber: (item.roomNumber || "").trim().toUpperCase() });
    } else if (item.roomName) {
      matchedRoom = await Room.findOne({
        name: { $regex: new RegExp(item.roomName.trim(), "i") },
      });
    }

    const totalSuiteRooms = Number(matchedRoom?.totalRooms) || 4;
    const suiteRoomNumbers = matchedRoom
      ? getSuiteRoomNumbers(matchedRoom)
      : ["101-1", "101-2", "101-3", "101-4"];

    const roomIdStr = matchedRoom?._id ? matchedRoom._id.toString() : (item.roomId ? String(item.roomId) : null);
    const roomNumberStr = (matchedRoom?.roomNumber || item.roomNumber || "").trim().toUpperCase();

    const bookedRoomNumbersSet = new Set();
    let currentlyBookedCount = 0;

    for (const b of overlappingBookings) {
      const suiteList = Array.isArray(b.suites) && b.suites.length > 0 ? b.suites : [b];
      for (const s of suiteList) {
        const sRoomId = s.room ? s.room.toString() : null;
        const sRoomNumber = (s.roomNumber || "").trim().toUpperCase();
        if ((roomIdStr && sRoomId === roomIdStr) || (roomNumberStr && sRoomNumber === roomNumberStr)) {
          currentlyBookedCount += Number(s.roomsCount) || 1;
          if (Array.isArray(s.allocatedRoomNumbers)) {
            s.allocatedRoomNumbers.forEach((rn) => bookedRoomNumbersSet.add(rn));
          }
        }
      }
    }

    const bookedRoomNumbers = [...bookedRoomNumbersSet];
    const freeRoomsCount = Math.max(0, totalSuiteRooms - bookedRoomNumbers.length);
    const requestedRoomsCount = Math.max(1, Number(item.roomsCount) || 1);

    if (requestedRoomsCount > freeRoomsCount) {
      throw new Error(`Only ${freeRoomsCount} room(s) available in Suite "${matchedRoom?.name || item.roomName}" for the selected dates.`);
    }

    const availableRoomNumbers = suiteRoomNumbers.filter((rn) => !bookedRoomNumbers.includes(rn));
    const allocatedForThisSuite = availableRoomNumbers.slice(0, requestedRoomsCount);
    allocatedForThisSuite.forEach((rn) => bookedRoomNumbersSet.add(rn));

    overallAllocatedRoomNumbers = [...overallAllocatedRoomNumbers, ...allocatedForThisSuite];

    const rate = Number(item.pricePerNight) || matchedRoom?.pricePerNight || 15000;
    const suiteSubtotal = calculatedNights * rate * requestedRoomsCount;

    processedSuites.push({
      room: matchedRoom?._id || (item.roomId && !String(item.roomId).startsWith("default") ? item.roomId : null),
      roomName: item.roomName?.trim() || matchedRoom?.name || "Travertine Ocean Horizon Pavilion",
      roomCategory: item.roomCategory?.trim() || matchedRoom?.category || "Ocean View Suite",
      roomNumber: item.roomNumber?.trim() || matchedRoom?.roomNumber || "101",
      roomsCount: requestedRoomsCount,
      pricePerNight: rate,
      totalPrice: suiteSubtotal,
      allocatedRoomNumbers: allocatedForThisSuite,
    });

    if (matchedRoom) {
      matchedRoom.status = currentlyBookedCount + requestedRoomsCount >= totalSuiteRooms ? "booked" : "available";
      await matchedRoom.save();
    }
  }

  // Concurrency Guard (Fix #6): Verify no other concurrent booking claimed these rooms
  if (overallAllocatedRoomNumbers.length > 0) {
    const concurrentConflict = await Booking.findOne({
      status: { $in: ["confirmed", "checked-in"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      allocatedRoomNumbers: { $in: overallAllocatedRoomNumbers },
    });

    if (concurrentConflict) {
      throw new Error(
        "One or more selected rooms were just reserved by another guest in a simultaneous session. Please select alternative dates or suites."
      );
    }
  }

  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const bookingReference = `VR-${randomSuffix}`;
  const transactionId = `TXN-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

  const totalRoomsCountAllSuites = processedSuites.reduce((sum, s) => sum + s.roomsCount, 0);
  const computedTotalPrice = processedSuites.reduce((sum, s) => sum + s.totalPrice, 0);
  const finalTotalPrice = Number(totalPrice) || computedTotalPrice;

  let payingUser = null;
  const primarySuite = processedSuites[0];
  const combinedNames = processedSuites.map((s) => s.roomName).join(" & ");
  const combinedCategories = [...new Set(processedSuites.map((s) => s.roomCategory))].join(" · ");
  const combinedNumbers = processedSuites.map((s) => s.roomNumber).join(", ");

  if (paymentMethod === "Wallet") {
    if (!user) {
      throw new Error("You must be logged in to pay with your Viceroy Guest Wallet.");
    }
    // Atomic deduction with precondition check to eliminate race conditions
    payingUser = await User.findOneAndUpdate(
      { _id: user._id, walletBalance: { $gte: finalTotalPrice } },
      {
        $inc: { walletBalance: -finalTotalPrice },
        $push: {
          walletTransactions: {
            type: "debit",
            amount: finalTotalPrice,
            description: `Reservation payment for #${bookingReference} (${combinedNames})`,
            bookingReference,
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!payingUser) {
      const checkUser = await User.findById(user._id);
      const currentBal = checkUser?.walletBalance || 0;
      throw new Error(
        `Insufficient Viceroy Guest Wallet balance. Current balance is ₹${currentBal.toLocaleString("en-IN")}, but reservation total is ₹${finalTotalPrice.toLocaleString("en-IN")}.`
      );
    }
  }

  const resolvedTxnId = paymentMethod === "Wallet" ? `WAL-${Date.now().toString().slice(-6)}` : transactionId;

  const booking = await Booking.create({
    bookingReference,
    user: user?._id || null,
    room: primarySuite.room,
    roomName: combinedNames,
    roomCategory: combinedCategories,
    roomNumber: combinedNumbers,
    roomImage: primarySuite.roomImage || roomImage || "/images/home1.png",
    guestName: guestName.trim(),
    guestEmail: guestEmail.trim().toLowerCase(),
    guestPhone: guestPhone?.trim() || "",
    checkIn: checkInDate,
    checkOut: checkOutDate,
    nights: calculatedNights,
    roomsCount: totalRoomsCountAllSuites,
    allocatedRoomNumbers: overallAllocatedRoomNumbers,
    suites: processedSuites,
    guests: Number(guests) || 2,
    pricePerNight: primarySuite.pricePerNight,
    totalPrice: finalTotalPrice,
    paymentStatus: paymentMethod === "Pay at Resort" ? "unpaid" : "paid",
    paymentMethod: paymentMethod || "Razorpay",
    transactionId: resolvedTxnId,
    status: "confirmed",
    notes: notes?.trim() || "",
  });

  await Payment.create({
    booking: booking._id,
    bookingReference: booking.bookingReference,
    user: user?._id || null,
    guestEmail: booking.guestEmail,
    transactionId: booking.transactionId,
    paymentMethod: booking.paymentMethod,
    amount: finalTotalPrice,
    status: paymentMethod === "Pay at Resort" ? "pending" : "successful",
    cardLast4: paymentMethod === "Wallet" ? "WALL" : "4242",
    paidAt: new Date(),
  });

  return { booking, walletBalance: payingUser ? payingUser.walletBalance : undefined };
};

/**
 * Core business logic to cancel a booking and process wallet refunds
 */
export const cancelBookingService = async (bookingIdentifier, user, cancellationReason = "") => {
  let booking = null;
  const cleanId = String(bookingIdentifier).trim();

  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    booking = await Booking.findById(cleanId);
  }
  if (!booking) {
    booking = await Booking.findOne({
      bookingReference: new RegExp(`^${cleanId}$`, "i"),
    });
  }

  if (!booking) {
    throw new Error("Booking not found");
  }

  const isOwner =
    user.role === "admin" ||
    (booking.user && booking.user.toString() === user._id.toString()) ||
    booking.guestEmail.toLowerCase() === user.email.toLowerCase();

  if (!isOwner) {
    throw new Error("Not authorized to cancel this booking");
  }

  if (booking.status === "cancelled") {
    throw new Error("Booking is already cancelled");
  }

  const wasPaid = booking.paymentStatus === "paid" || booking.paymentMethod === "Wallet" || booking.paymentMethod === "Razorpay";
  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.paymentStatus = wasPaid ? "refunded" : "cancelled";
  if (cancellationReason) {
    booking.cancellationReason = cancellationReason.trim();
  }

  if (booking.room) {
    await Room.findByIdAndUpdate(booking.room, { status: "available" });
  }

  let walletRefunded = false;
  let newWalletBalance = null;

  // Security & Integrity Fix: ONLY credit refund if reservation was actually paid!
  // Unpaid "Pay at Resort" bookings must NOT receive free wallet credits.
  if (wasPaid && Number(booking.totalPrice) > 0) {
    const refundAmt = Number(booking.totalPrice);
    booking.refundedToWallet = true;
    booking.refundAmount = refundAmt;

    let targetUserId = booking.user;
    if (!targetUserId && booking.guestEmail) {
      const foundUser = await User.findOne({ email: booking.guestEmail.trim().toLowerCase() });
      if (foundUser) targetUserId = foundUser._id;
    }

    if (targetUserId) {
      const updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        {
          $inc: { walletBalance: refundAmt },
          $push: {
            walletTransactions: {
              type: "credit",
              amount: refundAmt,
              description: `Full refund for cancelled reservation #${booking.bookingReference}`,
              bookingReference: booking.bookingReference,
              date: new Date(),
            },
          },
        },
        { new: true }
      );

      if (updatedUser) {
        walletRefunded = true;
        newWalletBalance = updatedUser.walletBalance;
      }
    }
  }

  await booking.save();
  if (wasPaid) {
    await Payment.updateMany(
      { booking: booking._id },
      { status: "refunded", refundedAt: new Date(), refundAmount: Number(booking.totalPrice) }
    );
  }

  return { booking, walletRefunded, newWalletBalance };
};