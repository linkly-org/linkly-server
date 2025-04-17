// logger.ts
import winston from 'winston'
import path from 'path'
import fs from 'fs'
import { LRUCache } from 'lru-cache' // Install using `npm install lru-cache`

type LoggerOptions = {
  service?: string
  level?: string
  logDir?: string
  silent?: boolean
}

/**
 * A custom logger class that wraps the Winston logging library for structured logging.
 */
export class Logger {
  private logger!: winston.Logger
  private rateLimiter: LRUCache<string, number>

  /**
   * Creates an instance of the Logger class.
   * Ensures the log directory exists and initializes the logger with specified options.
   *
   * @param {LoggerOptions} [options] - Configuration options for the logger.
   * @param {string} [options.service] - The name of the service using the logger.
   * @param {string} [options.level] - The logging level (e.g., 'info', 'debug').
   * @param {string} [options.logDir] - The directory where log files will be stored.
   * @param {boolean} [options.silent] - Whether to suppress logging output.
   */
  constructor(options: LoggerOptions = {}) {
    // Initialize rate limiter with a time-to-live (TTL) for log entries
    this.rateLimiter = new LRUCache({
      max: 1000, // Maximum number of unique log entries to track
      ttl: 1000 * 60 // Time-to-live for each log entry (e.g., 1 minute)
    })
    const {
      level = process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      logDir = 'logs',
      silent = process.env.NODE_ENV === 'test'
    } = options

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const combinedLogPath =
      process.env.COMBINED_LOG_PATH || path.join(logDir, 'combined.log')
    const errorLogPath =
      process.env.ERROR_LOG_PATH || path.join(logDir, 'error.log')

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Sanitize sensitive data
        if (meta && meta.password) {
          meta.password = '***'
        }
        return `${timestamp} [${level.toUpperCase()}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ''
        }`
      })
    )
    try {
      this.logger = winston.createLogger({
        level,
        format: logFormat,
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(
                (info) => `[${info.timestamp}] [${info.level}]:${info.message}`
              )
            ),
            level: 'info'
          }),
          new winston.transports.File({
            filename: combinedLogPath,
            level: 'info'
          }),
          new winston.transports.File({
            filename: errorLogPath,
            level: 'error'
          })
        ],
        silent
      })
    } catch (error) {
      console.error('Failed to initialize logger:', error)
    }
  }

  /**
   * Logs a message with rate limiting.
   *
   * @param {string} level - The log level (e.g., 'info', 'error', 'debug').
   * @param {string} message - The log message.
   * @param {unknown} [meta] - Additional metadata to include with the log.
   */
  private rateLimitedLog(level: string, message: string, meta?: unknown) {
    const logKey = `${level}:${message}` // Unique key for the log entry

    // Check if the log entry is rate-limited
    if (this.rateLimiter.has(logKey)) {
      return // Skip logging if the message is rate-limited
    }

    // Add the log entry to the rate limiter
    this.rateLimiter.set(logKey, 1)

    // Log the message
    this.logger.log(level, message, meta)
  }
  /**
   * Logs the start of a function or process with contextual information.
   *
   * @param {string | Function | Record<string, unknown>} functionName - The name of the function or process.
   * @param {string | Record<string, unknown>} [className] - The name of the class or object containing the function.
   * @param {string} [fileName] - The name of the file where the function is located.
   */
  public start(
    functionName:
      | string
      | ((...args: unknown[]) => unknown)
      | Record<string, unknown>,
    className?: string | Record<string, unknown>,
    fileName?: string
  ) {
    try {
      // Get function name
      let funName = ''
      if (arguments.length >= 1) {
        switch (typeof functionName) {
          case 'function':
            funName = functionName.name
            break
          case 'string':
            funName = functionName
            break
          default:
            funName = ''
        }
      }

      // Get class name
      let clsName = ''
      if (arguments.length >= 2) {
        switch (typeof className) {
          case 'string':
            clsName = className
            break
          case 'object':
            if (className !== null && className.constructor !== undefined) {
              clsName = className.constructor.name
            } else {
              clsName = ''
            }
            break
          default:
            clsName = ''
        }
      }

      // Print start log
      if (arguments.length >= 3) {
        this.logger.info(
          `${fileName} : ${clsName} : [${funName.replace(/bound /, '')?.toLocaleUpperCase()}]    start ===>`
        )
      } else if (arguments.length == 2) {
        this.logger.info(
          `[${clsName}.ts] : [${funName.replace(/bound /, '')}()]    start ===>`
        )
      } else {
        this.logger.info(
          `[${funName.replace(/bound /, '')?.toLocaleUpperCase()}]    start ===>`
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.stack)
      } else {
        console.error('An unknown error occurred:', error)
      }
    }
  }

  /**
   * Logs an informational message with rate limiting.
   *
   * @param {string} message - The message to log.
   * @param {unknown} [meta] - Additional metadata to include with the log.
   */
  info(message: string, meta?: unknown) {
    this.rateLimitedLog('info', message, meta)
  }

  /**
   * Logs an error message with rate limiting.
   *
   * @param {string} message - The error message to log.
   * @param {unknown} [meta] - Additional metadata to include with the log.
   */
  error(message: string, meta?: unknown) {
    this.rateLimitedLog('error', message, meta)
  }

  /**
   * Logs a debug message with rate limiting.
   *
   * @param {string} message - The debug message to log.
   * @param {unknown} [meta] - Additional metadata to include with the log.
   */
  debug(message: string, meta?: unknown) {
    this.rateLimitedLog('debug', message, meta)
  }

  /**
   * Logs a warning message with rate limiting.
   *
   * @param {string} message - The warning message to log.
   * @param {unknown} [meta] - Additional metadata to include with the log.
   */
  warn(message: string, meta?: unknown) {
    this.rateLimitedLog('warn', message, meta)
  }

  /**
   * Updates the logging level of the logger.
   *
   * @param {string} level - The new logging level to set.
   */
  public updateLogLevel(level: string) {
    this.logger.level = level
  }

  /**
   * Provides access to the underlying Winston logger instance.
   *
   * @returns {winston.Logger} The Winston logger instance.
   */
  get instance() {
    return this.logger
  }
}

const logger = new Logger()
Object.freeze(logger)
export default logger
