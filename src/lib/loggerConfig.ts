import { configureGlobalLogger, LogLevel } from './logger';

/**
 * Configure global logger settings based on environment
 */
export function setupLogger() {
  // In development, show all logs
  if (process.env.NODE_ENV === 'development') {
    configureGlobalLogger({
      enabled: true,
      minLevel: LogLevel.DEBUG,
      showTimestamp: true
    });
  } 
  // In production, only show warnings and errors
  else if (process.env.NODE_ENV === 'production') {
    configureGlobalLogger({
      enabled: true,
      minLevel: LogLevel.WARN,
      showTimestamp: true
    });
  }
  // In test environment, disable logs
  else if (process.env.NODE_ENV === 'test') {
    configureGlobalLogger({
      enabled: false
    });
  }
  // Default fallback configuration
  else {
    configureGlobalLogger({
      enabled: true,
      minLevel: LogLevel.INFO,
      showTimestamp: true
    });
  }
} 