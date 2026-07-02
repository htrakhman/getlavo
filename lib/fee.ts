// Platform take rate: 10% of every booking.
// Change FEE_RATE to adjust platform fee across all bookings.
const FEE_RATE = 0.1;

export function calculateFee(
  grossCents: number,
  rate: number = FEE_RATE,
): { gross: number; fee: number; net: number } {
  const fee = Math.floor(grossCents * rate);
  return { gross: grossCents, fee, net: grossCents - fee };
}
