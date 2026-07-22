export const features = {
  bookingEnabled: process.env.NEXT_PUBLIC_BOOKING_ENABLED !== "false",
} as const;
