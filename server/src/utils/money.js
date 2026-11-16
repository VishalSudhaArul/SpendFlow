/** Rounds to 2 decimal places, avoiding float artifacts like 0.1 + 0.2 = 0.30000000000000004. */
export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
