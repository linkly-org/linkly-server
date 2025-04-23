import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

/**
 * Checks if a short URL exists in the database.
 *
 * @param url The long URL to check for existence.
 * @returns A boolean indicating if the URL exists.
 */
export const isShortUrlExists = async (url: string) => {
  try {
    const existingUrl = await prisma.urls.findFirst({
      where: {
        long_url: url,
      },
    });
    return existingUrl !== null;
  } catch (error) {
    console.error("Error checking URL existence:", error);
    throw new Error("Database error");
  }
};
