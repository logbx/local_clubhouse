export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export enum LogCategory {
  TOURNAMENT = 'tournament',
  AUTH = 'auth',
  API = 'api',
  EVENT = 'event',
  GENERAL = 'general'
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.ERROR; // Default to only errors
  private enabledCategories: Set<LogCategory> = new Set();
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {
    // Enable appropriate logging based on environment
    if (this.isDevelopment) {
      this.logLevel = LogLevel.INFO;
      this.enabledCategories = new Set([LogCategory.GENERAL, LogCategory.API]);
    } else {
      // Production: Only show errors and warnings by default
      this.logLevel = LogLevel.WARN;
      this.enabledCategories = new Set([LogCategory.GENERAL]);
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  enableCategory(category: LogCategory): void {
    this.enabledCategories.add(category);
  }

  disableCategory(category: LogCategory): void {
    this.enabledCategories.delete(category);
  }

  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    return level <= this.logLevel && this.enabledCategories.has(category);
  }

  private formatMessage(category: LogCategory, message: string, data?: any): any[] {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${category.toUpperCase()}]`;
    
    if (data) {
      return [prefix, message, data];
    }
    return [prefix, message];
  }

  error(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR, category)) {
      console.error(...this.formatMessage(category, message, data));
    }
  }

  warn(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN, category)) {
      console.warn(...this.formatMessage(category, message, data));
    }
  }

  info(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO, category)) {
      console.log(...this.formatMessage(category, message, data));
    }
  }

  debug(category: LogCategory, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG, category)) {
      console.log(...this.formatMessage(category, message, data));
    }
  }

  // Convenience methods for common patterns
  apiCall(method: string, url: string, data?: any): void {
    this.debug(LogCategory.API, `${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any): void {
    if (status >= 400) {
      this.error(LogCategory.API, `${method} ${url} - ${status}`, data);
    } else {
      this.debug(LogCategory.API, `${method} ${url} - ${status}`, data);
    }
  }

  // Method to quickly disable verbose logging
  quiet(): void {
    this.logLevel = LogLevel.ERROR;
    this.enabledCategories.clear();
    this.enabledCategories.add(LogCategory.GENERAL);
  }

  // Method to enable verbose logging for debugging
  verbose(): void {
    this.logLevel = LogLevel.DEBUG;
    Object.values(LogCategory).forEach(category => {
      this.enabledCategories.add(category);
    });
  }

  // Show current configuration
  showConfig(): void {
    console.log('Logger Configuration:', {
      logLevel: LogLevel[this.logLevel],
      enabledCategories: Array.from(this.enabledCategories),
      isDevelopment: this.isDevelopment
    });
  }
}

export const logger = Logger.getInstance();

// Export convenience functions
export const log = {
  error: (category: LogCategory, message: string, data?: any) => logger.error(category, message, data),
  warn: (category: LogCategory, message: string, data?: any) => logger.warn(category, message, data),
  info: (category: LogCategory, message: string, data?: any) => logger.info(category, message, data),
  debug: (category: LogCategory, message: string, data?: any) => logger.debug(category, message, data),
  quiet: () => logger.quiet(),
  verbose: () => logger.verbose(),
  showConfig: () => logger.showConfig()
};

// Add global functions for browser console control
if (typeof window !== 'undefined') {
  (window as any).logQuiet = () => {
    logger.quiet();
    console.log('🔇 Logging set to quiet mode (errors only)');
  };
  
  (window as any).logVerbose = () => {
    logger.verbose();
    console.log('📢 Logging set to verbose mode (all categories)');
  };
  
  (window as any).logConfig = () => {
    logger.showConfig();
  };
  
  (window as any).logHelp = () => {
    console.log(`
🚀 Logging Control Commands:
  logQuiet()   - Show only errors
  logVerbose() - Show all logs (debug mode)
  logConfig()  - Show current configuration
  logHelp()    - Show this help message

📂 Categories: ${Object.values(LogCategory).join(', ')}
📊 Levels: ERROR, WARN, INFO, DEBUG
    `);
  };
  
  // Show help on first load
  console.log('🚀 Type logHelp() in console for logging controls');
} 