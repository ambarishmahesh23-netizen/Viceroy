/**
 * Calculate the number of nights between check-in and check-out dates
 * Normalizes to UTC midnight to avoid DST / timezone discrepancies
 */
export const calculateNights = (checkInDate, checkOutDate) => {
  if (!checkInDate || !checkOutDate) return 1;

  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 1;
  }

  // Normalize to UTC midnight to eliminate daylight saving time and local timezone drift
  const utcStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const utcEnd = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  const diffDays = Math.round((utcEnd - utcStart) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};
