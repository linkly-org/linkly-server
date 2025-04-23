import express from "express";
import { PrismaClient } from "../../generated/prisma";
import logger from "../common/logger";
import { isShortUrlExists } from "../services/urlService";
import { generateShortUrl } from "../utils/utils";

const prisma = new PrismaClient();
export const createShortUrl = async (
  req: express.Request,
  res: express.Response
) => {
  logger.start("createShortUrl", "urlController");
  const { longUrl, name } = req.body;
  logger.info("Received long URL", longUrl);
  if (!longUrl) {
    logger.error("No long URL provided");
    res.status(400).json({ error: "No long URL provided" });
    return;
  }

  try {
    const existingUrl = await isShortUrlExists(longUrl);

    if (existingUrl) {
      logger.info("URL already exists", existingUrl);
      res.status(409).json({
        error: "URL already exists",
        details: "The provided long URL already exists in the database.",
      });
      return;
    }

    const newUrl = await prisma.urls.create({
      data: {
        name: name, // Replace with actual name if available
        long_url: longUrl,
        short_url: generateShortUrl(), // Generate a random short URL
        updated_at: new Date(),
      },
    });

    logger.info(`Short URL created ${newUrl}`);
    res.status(200).json(newUrl);
  } catch (error) {
    logger.error("Error creating short URL", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getAllShortUrls = async (
  _: express.Request,
  res: express.Response
) => {
  logger.start("getAllShortUrls", "urlController");
  try {
    const urls = await prisma.urls.findMany();
    logger.info(`Fetched all URLs ${JSON.stringify(urls)}`);
    res.status(200).json(urls);
  } catch (error) {
    logger.error("Error fetching URLs", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// export const getShortUrlById = async (
//   req: express.Request,
//   res: express.Response
// ) => {};

// export const deleteShortUrl = async (
//   req: express.Request,
//   res: express.Response
// ) => {};
