import { randomBytes, randomInt } from "crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Random length 6–8, lowercase letters + digits. */
export function randomReferralCode(): string {
  const length = randomInt(6, 9);
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
