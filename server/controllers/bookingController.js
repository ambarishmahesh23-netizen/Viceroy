import Booking from "../models/Booking.js";
import Room, { getSuiteRoomNumbers } from "../models/Room.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";

// @desc    Create new resort booking / reservation with overlap prevention & payment record
// @route   POST /api/bookings
// @access  Private (Logged-in customer / user)
export const createBooking = async (req, res) => {
  try {
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
    } = req.body;

    // Administrator check: Admins cannot create bookings
    if (req.user?.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrators cannot make bookings. Residence reservations are reserved for customer accounts.",
      });
    }

    // Validate required fields
    if (!checkIn || !checkOut || !guestName || !guestEmail) {
      return res.status(400).json({
        success: false,
        message: "Check-in, check-out dates, guest name, and email are required",
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format provided",
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Check-out date must be after check-in date",
      });
    }

    const calculatedNights = Math.max(
      1,
      Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
    );

    // Normalize requested suites (supports multiple suites at a time or single suite)
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

    // Find all overlapping active bookings for the requested date range
    const overlappingBookings = await Booking.find({
      status: { $in: ["confirmed", "checked-in"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    });

    const processedSuites = [];
    let overallAllocatedRoomNumbers = [];

    // Verify room availability and allocate room numbers for each requested suite
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

      // Find room numbers already booked in this suite for overlapping dates
      const bookedRoomNumbersSet = new Set();
      let currentlyBookedCount = 0;

      for (const b of overlappingBookings) {
        if (Array.isArray(b.suites) && b.suites.length > 0) {
          for (const s of b.suites) {
            const sRoomId = s.room ? s.room.toString() : null;
            const sRoomNumber = (s.roomNumber || "").trim().toUpperCase();
            if ((roomIdStr && sRoomId === roomIdStr) || (roomNumberStr && sRoomNumber === roomNumberStr)) {
              currentlyBookedCount += Number(s.roomsCount) || 1;
              if (Array.isArray(s.allocatedRoomNumbers)) {
                s.allocatedRoomNumbers.forEach((rn) => bookedRoomNumbersSet.add(rn));
              }
            }
          }
        } else {
          const bRoomId = b.room ? b.room.toString() : null;
          const bRoomNumber = (b.roomNumber || "").trim().toUpperCase();
          if ((roomIdStr && bRoomId === roomIdStr) || (roomNumberStr && bRoomNumber === roomNumberStr)) {
            currentlyBookedCount += Number(b.roomsCount) || 1;
            if (Array.isArray(b.allocatedRoomNumbers)) {
              b.allocatedRoomNumbers.forEach((rn) => bookedRoomNumbersSet.add(rn));
            }
          }
        }
      }

      const bookedRoomNumbers = [...bookedRoomNumbersSet];
      if (bookedRoomNumbers.length < currentlyBookedCount) {
        for (const rn of suiteRoomNumbers) {
          if (!bookedRoomNumbers.includes(rn) && bookedRoomNumbers.length < currentlyBookedCount) {
            bookedRoomNumbers.push(rn);
          }
        }
      }

      const freeRoomsCount = Math.max(0, totalSuiteRooms - bookedRoomNumbers.length);
      const requestedRoomsCount = Math.max(1, Number(item.roomsCount) || 1);

      if (requestedRoomsCount > freeRoomsCount) {
        return res.status(400).json({
          success: false,
          message: `Only ${freeRoomsCount} room(s) available in Suite "${matchedRoom?.name || item.roomName}" for the selected dates (you requested ${requestedRoomsCount}).`,
        });
      }

      // Allocate available room numbers for this suite
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

      // Update room status: marked booked ONLY if all rooms are booked, else available
      if (matchedRoom) {
        if (currentlyBookedCount + requestedRoomsCount >= totalSuiteRooms) {
          matchedRoom.status = "booked";
        } else {
          matchedRoom.status = "available";
        }
        await matchedRoom.save();
      }
    }

    // Generate unique booking reference and transaction ID
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const bookingReference = `VR-${randomSuffix}`;
    const transactionId = `TXN-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    const totalRoomsCountAllSuites = processedSuites.reduce((sum, s) => sum + s.roomsCount, 0);
    const computedTotalPrice = processedSuites.reduce((sum, s) => sum + s.totalPrice, 0);
    const finalTotalPrice = Number(totalPrice) || computedTotalPrice;

    // Handle Wallet Payment Verification & Debit
    let payingUser = null;
    if (paymentMethod === "Wallet") {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "You must be logged in to pay with your Viceroy Guest Wallet.",
        });
      }
      payingUser = await User.findById(req.user._id);
      if (!payingUser) {
        return res.status(404).json({
          success: false,
          message: "Guest user account not found.",
        });
      }
      if ((payingUser.walletBalance || 0) < finalTotalPrice) {
        return res.status(400).json({
          success: false,
          message: `Insufficient Viceroy Guest Wallet balance. You have ₹${(payingUser.walletBalance || 0).toLocaleString("en-IN")}, but total required is ₹${finalTotalPrice.toLocaleString("en-IN")}.`,
        });
      }
    }

    const primarySuite = processedSuites[0];
    const combinedNames = processedSuites.map((s) => s.roomName).join(" & ");
    const combinedCategories = [...new Set(processedSuites.map((s) => s.roomCategory))].join(" · ");
    const combinedNumbers = processedSuites.map((s) => s.roomNumber).join(", ");

    // If paying via wallet, debit the balance and log the transaction
    if (payingUser && paymentMethod === "Wallet") {
      payingUser.walletBalance = (payingUser.walletBalance || 0) - finalTotalPrice;
      if (!Array.isArray(payingUser.walletTransactions)) {
        payingUser.walletTransactions = [];
      }
      payingUser.walletTransactions.push({
        type: "debit",
        amount: finalTotalPrice,
        description: `Reservation payment for #${bookingReference} (${combinedNames})`,
        bookingReference,
        date: new Date(),
      });
      await payingUser.save();
    }

    const resolvedTxnId =
      paymentMethod === "Wallet"
        ? `WAL-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`
        : req.body.razorpayPaymentId || transactionId;

    const booking = await Booking.create({
      bookingReference,
      user: req.user?._id || null,
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
      razorpayOrderId: req.body.razorpayOrderId || "",
      razorpayPaymentId: req.body.razorpayPaymentId || "",
      razorpaySignature: req.body.razorpaySignature || "",
      status: "confirmed",
      notes: notes?.trim() || "",
    });

    // Create Payment Record (Module 5)
    await Payment.create({
      booking: booking._id,
      bookingReference: booking.bookingReference,
      user: req.user?._id || null,
      guestEmail: booking.guestEmail,
      transactionId: booking.transactionId,
      razorpayOrderId: req.body.razorpayOrderId || "",
      razorpayPaymentId: req.body.razorpayPaymentId || "",
      razorpaySignature: req.body.razorpaySignature || "",
      paymentMethod: booking.paymentMethod,
      amount: finalTotalPrice,
      status: paymentMethod === "Pay at Resort" ? "pending" : "successful",
      cardLast4: paymentMethod === "Wallet" ? "WALL" : cardLast4 ? cardLast4.slice(-4) : "0000",
      paidAt: new Date(),
    });

    // Send confirmation email
    try {
      const suiteLines = processedSuites
        .map(
          (s) =>
            `${s.roomName} (${s.roomsCount} Room${s.roomsCount > 1 ? "s" : ""}, Room Numbers: ${s.allocatedRoomNumbers.join(", ")})`
        )
        .join("; ");

      await sendEmail({
        to: booking.guestEmail,
        subject: `Reservation Confirmed [${booking.bookingReference}] - Viceroy Resort`,
        text: `Dear ${booking.guestName},\n\nYour reservation at Viceroy Resort is guaranteed.\n\nBooking Reference: ${booking.bookingReference}\nTransaction ID: ${transactionId}\nSuites: ${suiteLines}\nCheck-in: ${booking.checkIn.toDateString()}\nCheck-out: ${booking.checkOut.toDateString()}\nTotal Amount: ₹${booking.totalPrice.toLocaleString("en-IN")}\n\nWe look forward to welcoming you.\n\nWarm regards,\nViceroy Concierge Team`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 620px; margin: 0 auto; padding: 36px 28px; background: #faf8f5; border: 1px solid #e2dad0; color: #232d25;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #142217; letter-spacing: 3px; font-size: 26px; text-transform: uppercase; margin: 0;">Viceroy Resort</h1>
              <p style="color: #c49d68; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 6px 0 0;">Official Reservation Confirmation</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2dad0; margin: 20px 0;" />
            <p style="font-size: 16px;">Dear ${booking.guestName},</p>
            <p style="line-height: 1.6; color: #3a453c;">
              We are pleased to confirm your stay with us at Viceroy Resort. Your coastal residence is guaranteed.
            </p>
            <div style="background: #ffffff; padding: 20px; border: 1px solid #e6ded3; border-radius: 6px; margin: 24px 0;">
              <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 1px; color: #c49d68; text-transform: uppercase; font-weight: bold;">Reservation Details</p>
              <p style="margin: 4px 0; font-size: 15px;"><strong>Confirmation Reference:</strong> <span style="color: #142217; font-weight: bold;">${booking.bookingReference}</span></p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Transaction ID:</strong> ${transactionId}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Suites & Booked Rooms:</strong> ${suiteLines}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Check-In:</strong> ${booking.checkIn.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} (From 3:00 PM)</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Check-Out:</strong> ${booking.checkOut.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} (Until 11:00 AM)</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> ${booking.nights} Night(s) · ${totalRoomsCountAllSuites} Room(s) · ${booking.guests} Guest(s)</p>
              <hr style="border: none; border-top: 1px dashed #e6ded3; margin: 14px 0;" />
              <p style="margin: 4px 0; font-size: 16px; color: #142217;"><strong>Total Paid:</strong> ₹${booking.totalPrice.toLocaleString("en-IN")} (${paymentMethod})</p>
            </div>
            <p style="font-size: 13px; color: #666; line-height: 1.6;">
              Complimentary coastal breakfast, valet parking, and private concierge check-in are included in your reservation.
            </p>
            <p style="margin-top: 28px; font-size: 14px; color: #555;">
              Warm regards,<br>
              <strong style="color: #142217;">The Viceroy Concierge Team</strong>
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Booking confirmation email dispatch skipped:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Reservation confirmed successfully",
      booking,
      walletBalance: payingUser ? payingUser.walletBalance : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create reservation",
    });
  }
};

// @desc    Get booking by ID or reference
// @route   GET /api/bookings/:id
// @access  Private (Logged-in user)
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    let booking;
    if (id.startsWith("VR-")) {
      booking = await Booking.findOne({ bookingReference: id });
    } else {
      booking = await Booking.findById(id);
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking reservation not found",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch booking details",
    });
  }
};

// @desc    Get bookings of currently logged in user (Customer Profile)
// @route   GET /api/bookings/my
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ user: req.user._id }, { guestEmail: req.user.email }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch your bookings",
    });
  }
};

// @desc    Get all bookings (Admin only)
// @route   GET /api/bookings
// @access  Admin only
export const getAllBookings = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { bookingReference: regex },
        { guestName: regex },
        { guestEmail: regex },
        { roomName: regex },
        { roomNumber: regex },
      ];
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch all bookings",
    });
  }
};

// @desc    Check-In Guest (Module 11)
// @route   PUT /api/bookings/:id/check-in
// @access  Admin only
export const checkInGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Cannot check in a cancelled booking" });
    }

    booking.status = "checked-in";
    booking.checkedInAt = new Date();
    await booking.save();

    // Ensure room is marked booked
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room, { status: "booked" });
    }

    return res.status(200).json({
      success: true,
      message: `Guest ${booking.guestName} successfully checked in.`,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check in guest",
    });
  }
};

// @desc    Check-Out Guest (Module 11)
// @route   PUT /api/bookings/:id/check-out
// @access  Admin only
export const checkOutGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.status = "checked-out";
    booking.checkedOutAt = new Date();
    await booking.save();

    // Room becomes available upon check-out
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room, { status: "available" });
    }
    if (Array.isArray(booking.suites)) {
      for (const s of booking.suites) {
        if (s.room) {
          await Room.findByIdAndUpdate(s.room, { status: "available" });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Guest ${booking.guestName} successfully checked out. Suite is now available.`,
      booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to check out guest",
    });
  }
};

// @desc    Cancel Reservation (Module 10)
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Guest Owner or Admin)
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Check permission
    const isOwner =
      req.user.role === "admin" ||
      (booking.user && booking.user.toString() === req.user._id.toString()) ||
      booking.guestEmail.toLowerCase() === req.user.email.toLowerCase();

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this booking" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Booking is already cancelled" });
    }

    if (booking.status === "checked-out") {
      return res.status(400).json({ success: false, message: "Completed stays cannot be cancelled" });
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Cancelled by guest";
    booking.paymentStatus = "refunded";

    // Free up the room
    if (booking.room) {
      await Room.findByIdAndUpdate(booking.room, { status: "available" });
    }
    if (Array.isArray(booking.suites)) {
      for (const s of booking.suites) {
        if (s.room) {
          await Room.findByIdAndUpdate(s.room, { status: "available" });
        }
      }
    }

    // Refund paid amount directly to Guest Wallet
    let walletRefunded = false;
    let newWalletBalance = null;
    const wasPaid =
      booking.paymentStatus === "paid" ||
      booking.paymentMethod === "Razorpay" ||
      booking.paymentMethod === "Wallet" ||
      booking.paymentMethod === "Credit/Debit Card";

    if (wasPaid && Number(booking.totalPrice) > 0) {
      let bookingUser = null;
      if (booking.user) {
        bookingUser = await User.findById(booking.user);
      }
      if (!bookingUser && booking.guestEmail) {
        bookingUser = await User.findOne({
          email: booking.guestEmail.trim().toLowerCase(),
        });
      }

      if (bookingUser) {
        const refundAmt = Number(booking.totalPrice);
        bookingUser.walletBalance = (bookingUser.walletBalance || 0) + refundAmt;
        if (!Array.isArray(bookingUser.walletTransactions)) {
          bookingUser.walletTransactions = [];
        }
        bookingUser.walletTransactions.push({
          type: "credit",
          amount: refundAmt,
          description: `Full refund for cancelled reservation #${booking.bookingReference} (${booking.roomName})`,
          bookingReference: booking.bookingReference,
          date: new Date(),
        });
        await bookingUser.save();
        walletRefunded = true;
        newWalletBalance = bookingUser.walletBalance;

        booking.refundedToWallet = true;
        booking.refundAmount = refundAmt;
      }
    }

    await booking.save();

    // Update payment record to refunded
    await Payment.updateMany(
      { booking: booking._id },
      {
        status: "refunded",
        refundedAt: new Date(),
        refundAmount: booking.totalPrice,
      }
    );

    // Send refund confirmation email
    try {
      await sendEmail({
        to: booking.guestEmail,
        subject: `Reservation #${booking.bookingReference} Cancelled & ₹${booking.totalPrice.toLocaleString("en-IN")} Credited to Wallet`,
        text: `Dear ${booking.guestName},\n\nYour reservation #${booking.bookingReference} has been cancelled.\n\n` +
          (walletRefunded
            ? `A full refund of ₹${booking.totalPrice.toLocaleString("en-IN")} has been credited directly to your Viceroy Guest Wallet.\nYour current wallet balance is ₹${newWalletBalance.toLocaleString("en-IN")}. You can use this balance seamlessly for your next booking.`
            : `Your reservation has been cancelled.`) +
          `\n\nWarm regards,\nViceroy Concierge Team`,
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #faf8f5; border: 1px solid #e2dad0; color: #232d25;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #142217; letter-spacing: 2px; font-size: 24px; text-transform: uppercase; margin: 0;">Viceroy Resort</h1>
              <p style="color: #c49d68; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0;">Cancellation & Wallet Refund Notice</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2dad0; margin: 16px 0;" />
            <p style="font-size: 15px;">Dear ${booking.guestName},</p>
            <p style="line-height: 1.6; color: #3a453c;">
              Your reservation <strong>#${booking.bookingReference}</strong> for <strong>${booking.roomName}</strong> has been cancelled.
            </p>
            ${
              walletRefunded
                ? `
            <div style="background: #ffffff; padding: 18px; border: 1px solid #d4c8b8; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 1px; color: #1f7a3f; text-transform: uppercase; font-weight: bold;">✓ Wallet Refund Completed</p>
              <p style="margin: 4px 0; font-size: 16px; color: #142217;"><strong>Refund Credited:</strong> ₹${booking.totalPrice.toLocaleString("en-IN")}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #555;"><strong>Destination:</strong> Viceroy Guest Wallet</p>
              <p style="margin: 4px 0; font-size: 14px; color: #142217;"><strong>Updated Wallet Balance:</strong> ₹${newWalletBalance.toLocaleString("en-IN")}</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #777;">You can apply your wallet balance towards your next resort booking immediately.</p>
            </div>
            `
                : ""
            }
            <p style="margin-top: 24px; font-size: 13px; color: #666;">
              Warm regards,<br>
              <strong style="color: #142217;">The Viceroy Concierge Team</strong>
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Cancellation refund email skipped:", mailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: walletRefunded
        ? `Reservation #${booking.bookingReference} has been cancelled. ₹${booking.totalPrice.toLocaleString("en-IN")} has been credited to your Viceroy Guest Wallet for your next booking.`
        : `Reservation #${booking.bookingReference} has been cancelled.`,
      booking,
      walletRefunded,
      walletBalance: newWalletBalance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel booking",
    });
  }
};
