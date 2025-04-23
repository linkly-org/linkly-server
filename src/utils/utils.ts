import { randomBytes } from "crypto";

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const DEFAULT_LENGTH = 7;

/**
 * Generates a cryptographically secure short URL string.
 *
 * @param length - Length of the short URL string (default is 7)
 * @param charset - Characters to use for the short URL (default is alphanumeric)
 * @returns A random short URL string
 */
export function generateShortUrl(
  length: number = DEFAULT_LENGTH,
  charset: string = DEFAULT_CHARSET
): string {
  if (length <= 0) throw new Error("Length must be a positive integer.");
  const charsetLength = charset.length;

  // Generate random bytes
  const randomBuffer = randomBytes(length);
  let shortUrl = "";

  for (let i = 0; i < length; i++) {
    // Convert each byte to a valid index in the charset
    const index = randomBuffer[i] % charsetLength;
    shortUrl += charset[index];
  }

  return shortUrl;
}
