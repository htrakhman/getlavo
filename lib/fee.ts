// Default take rate: 17.5% (midpoint of 15–20% range).
// Change FEE_RATE to adjust platform fee across all bookings.
const FEE_RATE = 0.175;

export function calculateFee(
  grossCents: number,
  rate: number = FEE_RATE,
): { gross: number; fee: number; net: number } {
  const fee = Math.floor(grossCents * rate);
  return { gross: grossCents, fee, net: grossCents - fee };
}
