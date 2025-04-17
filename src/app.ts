import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import logger from "./common/logger";

class App {
  private app: express.Application;
  constructor() {
    dotenv.config();
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors());
  }

  public init() {
    logger.start("init", this.constructor.name);
    if (!process.env.PORT) {
      logger.info(`No port value specified...`);
    }
    const PORT = parseInt(process.env.PORT as string, 10);
    this.app.get("/", (req, res) => {
      res.json("Hello World!");
    });

    this.app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });
  }
}

const server = new App();
server.init();
