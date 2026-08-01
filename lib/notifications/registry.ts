/** Maps product events to default channels. Extend notify() kinds to match. */
export const notificationMatrix: Record<
  string,
  { email?: boolean; sms?: boolean; push?: boolean }
> = {
  // Booking confirmations send their own email (with the calendar invite) from
  // lib/booking-confirm, so notify() contributes the in-app row only. SMS is
  // deliberately off for booking events.
  booking_confirmed: { email: true, sms: false, push: true },
  booking_received: { email: true, sms: false, push: true },
  booking_reminder_24h: { email: true, sms: true, push: true },
  operator_en_route: { sms: true, push: true },
  wash_complete: { email: true, sms: true, push: true },
  review_prompt: { email: true, push: true },
  waitlist_building_live: { email: true, sms: true },
  partnership_request: { email: true },
  coi_expiring: { email: true },
  coi_expired: { email: true },
};
