import AsyncStorage from '@react-native-async-storage/async-storage';

class DebugLogger {
  private logs: string[] = [];
  private readonly MAX_LOGS = 100;
  private readonly STORAGE_KEY = '@debug_logs';

  // Log different types of events
  info(message: string, data?: any) {
    this.addLog('INFO', message, data);
  }

  error(message: string, data?: any) {
    this.addLog('ERROR', message, data);
    console.error(`[StudyAI] ${message}`, data);
  }

  success(message: string, data?: any) {
    this.addLog('SUCCESS', message, data);
  }

  warning(message: string, data?: any) {
    this.addLog('WARNING', message, data);
  }

  // Add log entry
  private addLog(type: string, message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type}: ${message}${data ? ` | ${JSON.stringify(data)}` : ''}`;
    
    this.logs.unshift(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Console log for development
    console.log(`[StudyAI] ${logEntry}`);

    // Persist logs
    this.saveLogs();
  }

  // Get all logs
  getLogs(): string[] {
    return [...this.logs];
  }

  // Get recent logs (for debugging UI)
  getRecentLogs(count: number = 20): string[] {
    return this.logs.slice(0, count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    AsyncStorage.removeItem(this.STORAGE_KEY);
    this.info('Debug logs cleared');
  }

  // Save logs to storage
  private async saveLogs() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save debug logs:', error);
    }
  }

  // Load logs from storage
  async loadLogs() {
    try {
      const savedLogs = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error('Failed to load debug logs:', error);
    }
  }

  // Get app state summary
  async getAppStateSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      errorCount: this.logs.filter(log => log.includes('ERROR')).length,
      recentErrors: this.logs.filter(log => log.includes('ERROR')).slice(0, 5),
    };
    return summary;
  }
}

export const debugLogger = new DebugLogger();

// Helper function to log user actions
export const logUserAction = (action: string, screen?: string, data?: any) => {
  debugLogger.info(`User Action: ${action}`, { screen, ...data });
};

// Helper function to log auth events
export const logAuthEvent = (event: string, success: boolean, error?: string) => {
  if (success) {
    debugLogger.success(`Auth: ${event}`);
  } else {
    debugLogger.error(`Auth Failed: ${event}`, { error });
  }
};

// Helper function to log navigation
export const logNavigation = (from: string, to: string) => {
  debugLogger.info(`Navigation: ${from} → ${to}`);
};

export default debugLogger;