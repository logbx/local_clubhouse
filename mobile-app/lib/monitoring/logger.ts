import { storage } from '../storage';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  requestId?: string;
  userId?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;

  constructor() {
    // Load persisted logs asynchronously without blocking
    this.loadPersistedLogs().catch(error => 
      console.warn('Logger initialization failed:', error)
    );
  }

  private async loadPersistedLogs() {
    try {
      const persistedLogs = await storage.get<LogEntry[]>('app_logs');
      if (persistedLogs && Array.isArray(persistedLogs)) {
        this.logs = persistedLogs.slice(-this.maxLogs);
      }
    } catch (error) {
      console.warn('Failed to load persisted logs:', error);
      // Continue without persisted logs
    }
  }

  private async persistLogs() {
    try {
      await storage.set('app_logs', this.logs.slice(-this.maxLogs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (__DEV__) {
      const levelName = LogLevel[level];
      const timestamp = new Date(entry.timestamp).toISOString();
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`[${timestamp}] DEBUG: ${message}`, data || '');
          break;
        case LogLevel.INFO:
          console.info(`[${timestamp}] INFO: ${message}`, data || '');
          break;
        case LogLevel.WARN:
          console.warn(`[${timestamp}] WARN: ${message}`, data || '');
          break;
        case LogLevel.ERROR:
          console.error(`[${timestamp}] ERROR: ${message}`, data || '');
          break;
      }
    }

    // Persist logs every 10 entries
    if (this.logs.length % 10 === 0) {
      this.persistLogs();
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.persistLogs();
  }

  async exportLogs(): Promise<string> {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }
}

export const logger = new Logger();