/**
 * Generate HTML template for booking confirmation emails
 */
export const generateBookingConfirmationEmail = (booking, suiteLines, paymentMethod, transactionId) => {
  return `
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
        <p style="margin: 4px 0; font-size: 14px;"><strong>Check-In:</strong> ${new Date(booking.checkIn).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} (From 3:00 PM)</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Check-Out:</strong> ${new Date(booking.checkOut).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} (Until 11:00 AM)</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> ${booking.nights} Night(s) · ${booking.roomsCount} Room(s) · ${booking.guests} Guest(s)</p>
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
  `;
};