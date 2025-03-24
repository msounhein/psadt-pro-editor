/**
 * Log levels for the application
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Options for the logger
 */
export interface LoggerOptions {
  /** Enable or disable logging */
  enabled?: boolean;
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Include timestamp in logs */
  showTimestamp?: boolean;
  /** Custom function to handle logs (e.g., send to a service) */
  logHandler?: (message: string, level: LogLevel, data?: any) => void;
}

/**
 * Default logger options
 */
const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: process.env.NODE_ENV !== 'production',
  minLevel: LogLevel.DEBUG,
  showTimestamp: true
};

/**
 * Logger class for structured application logging
 */
export class Logger {
  private options: LoggerOptions;
  private fileName: string;
  private className?: string;

  /**
   * Create a new logger instance
   * 
   * @param fileName - The name of the file where the logger is used
   * @param className - Optional class name if used within a class
   * @param options - Logger configuration options
   */
  constructor(fileName: string, className?: string, options: LoggerOptions = {}) {
    this.fileName = fileName;
    this.className = className;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Create a child logger for a specific function
   * 
   * @param functionName - The name of the function
   * @returns A logging function that includes the function context
   */
  forFunction(functionName: string) {
    return {
      debug: (message: string, data?: any) => this.log(LogLevel.DEBUG, message, functionName, data),
      info: (message: string, data?: any) => this.log(LogLevel.INFO, message, functionName, data),
      warn: (message: string, data?: any) => this.log(LogLevel.WARN, message, functionName, data),
      error: (message: string, data?: any) => this.log(LogLevel.ERROR, message, functionName, data)
    };
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, undefined, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, undefined, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, undefined, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, undefined, data);
  }

  /**
   * Internal method to handle logging
   */
  private log(level: LogLevel, message: string, functionName?: string, data?: any) {
    if (!this.options.enabled || this.shouldSkipLogLevel(level)) {
      return;
    }

    const timestamp = this.options.showTimestamp ? new Date().toISOString() : '';
    const context = this.formatContext(functionName);
    const formattedMessage = `${timestamp} [${level}]${context} ${message}`;

    // Use custom log handler if provided, otherwise use console
    if (this.options.logHandler) {
      this.options.logHandler(formattedMessage, level, data);
    } else {
      this.logToConsole(level, formattedMessage, data);
    }
  }

  /**
   * Format the context part of the log message
   */
  private formatContext(functionName?: string): string {
    let context = `[${this.fileName}]`;
    
    if (this.className) {
      context += `[${this.className}]`;
    }
    
    if (functionName) {
      context += `[${functionName}]`;
    }
    
    return context;
  }

  /**
   * Check if a log level should be skipped based on minimum level setting
   */
  private shouldSkipLogLevel(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.options.minLevel || LogLevel.DEBUG);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex < minLevelIndex;
  }

  /**
   * Log to the appropriate console method based on level
   */
  private logToConsole(level: LogLevel, message: string, data?: any) {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, data || '');
        break;
      case LogLevel.INFO:
        console.info(message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, data || '');
        break;
    }
  }
}

/**
 * Create a new logger instance
 * 
 * @param fileName - The name of the file where the logger is used
 * @param className - Optional class name if used within a class
 * @param options - Logger configuration options
 */
export function createLogger(fileName: string, className?: string, options?: LoggerOptions) {
  return new Logger(fileName, className, options);
}

/**
 * Global logger configuration
 * Can be used to set application-wide logging options
 */
export const configureGlobalLogger = (options: LoggerOptions) => {
  Object.assign(DEFAULT_OPTIONS, options);
}; 