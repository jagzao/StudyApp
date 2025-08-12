import { databaseService } from './databaseService.platform';

// ==================== ANALYTICS & CRASH REPORTING SERVICE ====================

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

interface CrashReport {
  error: string;
  stack?: string;
  componentStack?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  deviceInfo?: DeviceInfo;
  appVersion?: string;
  buildNumber?: string;
}

interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  version: string;
  model?: string;
  isEmulator?: boolean;
}

interface SessionMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  questionsAnswered: number;
  correctAnswers: number;
  categories: string[];
  voiceCommandsUsed: number;
  featuresUsed: string[];
}

class AnalyticsService {
  private sessionId: string;
  private currentSession: SessionMetrics | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;
  
  constructor() {
    this.sessionId = this.generateSessionId();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.startSession();
      this.isInitialized = true;
      console.log('✅ Analytics service initialized');
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  // ==================== SESSION MANAGEMENT ====================

  private async startSession(): Promise<void> {
    this.currentSession = {
      sessionId: this.sessionId,
      startTime: new Date(),
      questionsAnswered: 0,
      correctAnswers: 0,
      categories: [],
      voiceCommandsUsed: 0,
      featuresUsed: [],
    };

    await this.trackEvent('session_start', {
      sessionId: this.sessionId,
      timestamp: this.currentSession.startTime.toISOString(),
    });
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    this.currentSession.endTime = new Date();
    this.currentSession.duration = 
      this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();

    // Store session in database
    try {
      const db = await databaseService.getDatabase();
      await db.runAsync(`
        INSERT INTO study_sessions 
        (start_time, end_time, questions_answered, correct_answers, 
         session_type, duration, categories_studied)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        this.currentSession.startTime.toISOString(),
        this.currentSession.endTime.toISOString(),
        this.currentSession.questionsAnswered,
        this.currentSession.correctAnswers,
        'flashcard',
        this.currentSession.duration,
        JSON.stringify(this.currentSession.categories),
      ]);
    } catch (error) {
      console.error('Failed to store session:', error);
    }

    await this.trackEvent('session_end', {
      sessionId: this.sessionId,
      duration: this.currentSession.duration,
      questionsAnswered: this.currentSession.questionsAnswered,
      correctAnswers: this.currentSession.correctAnswers,
      accuracy: this.currentSession.questionsAnswered > 0 
        ? (this.currentSession.correctAnswers / this.currentSession.questionsAnswered) * 100 
        : 0,
    });

    this.currentSession = null;
  }

  // ==================== EVENT TRACKING ====================

  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
      },
      timestamp: new Date(),
    };

    this.eventQueue.push(event);

    // In development, log events
    if (__DEV__) {
      console.log('📊 Analytics Event:', eventName, properties);
    }

    // Process queue if it gets large
    if (this.eventQueue.length > 10) {
      await this.flushEvents();
    }
  }

  // ==================== STUDY-SPECIFIC TRACKING ====================

  async trackQuestionAnswered(
    questionId: number, 
    correct: boolean, 
    responseTime: number,
    category: string
  ): Promise<void> {
    if (this.currentSession) {
      this.currentSession.questionsAnswered++;
      if (correct) {
        this.currentSession.correctAnswers++;
      }
      
      if (!this.currentSession.categories.includes(category)) {
        this.currentSession.categories.push(category);
      }
    }

    await this.trackEvent('question_answered', {
      questionId,
      correct,
      responseTime,
      category,
      accuracy: this.currentSession 
        ? (this.currentSession.correctAnswers / this.currentSession.questionsAnswered) * 100 
        : 0,
    });

    // Record in database for analytics
    try {
      await databaseService.recordQuestionAttempt(questionId, correct);
    } catch (error) {
      console.error('Failed to record question attempt:', error);
    }
  }

  async trackVoiceCommandUsed(
    command: string,
    success: boolean,
    processingTime: number
  ): Promise<void> {
    if (this.currentSession) {
      this.currentSession.voiceCommandsUsed++;
    }

    await this.trackEvent('voice_command_used', {
      command,
      success,
      processingTime,
      totalVoiceCommands: this.currentSession?.voiceCommandsUsed || 1,
    });
  }

  async trackFeatureUsed(featureName: string, properties?: Record<string, any>): Promise<void> {
    if (this.currentSession && !this.currentSession.featuresUsed.includes(featureName)) {
      this.currentSession.featuresUsed.push(featureName);
    }

    await this.trackEvent('feature_used', {
      feature: featureName,
      ...properties,
    });
  }

  async trackLevelUp(newLevel: number, xpGained: number): Promise<void> {
    await this.trackEvent('level_up', {
      newLevel,
      xpGained,
      timestamp: new Date().toISOString(),
    });
  }

  async trackAchievementUnlocked(achievementId: string, achievementName: string): Promise<void> {
    await this.trackEvent('achievement_unlocked', {
      achievementId,
      achievementName,
      timestamp: new Date().toISOString(),
    });
  }

  // ==================== CRASH REPORTING ====================

  async reportCrash(error: Error, componentStack?: string): Promise<void> {
    const crashReport: CrashReport = {
      error: error.message,
      stack: error.stack,
      componentStack,
      timestamp: new Date(),
      sessionId: this.sessionId,
      deviceInfo: await this.getDeviceInfo(),
      appVersion: '1.0.0', // Get from app config
    };

    // In development, log crash details
    if (__DEV__) {
      console.error('🚨 Crash Report:', crashReport);
    }

    // Store crash locally for later upload
    await this.storeCrashLocally(crashReport);

    // Track as analytics event
    await this.trackEvent('app_crash', {
      errorMessage: error.message,
      hasStack: !!error.stack,
      hasComponentStack: !!componentStack,
    });
  }

  private async storeCrashLocally(crashReport: CrashReport): Promise<void> {
    try {
      // Store in a local crashes table or file
      // In a real app, you'd batch upload these to a crash reporting service
      console.log('Storing crash report locally:', crashReport);
    } catch (error) {
      console.error('Failed to store crash report:', error);
    }
  }

  // ==================== PERFORMANCE MONITORING ====================

  async trackPerformance(metric: string, value: number, tags?: Record<string, string>): Promise<void> {
    await this.trackEvent('performance_metric', {
      metric,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      await this.trackPerformance(name, duration, { status: 'success' });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      await this.trackPerformance(name, duration, { status: 'error' });
      throw error;
    }
  }

  // ==================== INSIGHTS & REPORTING ====================

  async getUsageInsights(days: number = 7): Promise<{
    totalSessions: number;
    averageSessionDuration: number;
    totalQuestionsAnswered: number;
    averageAccuracy: number;
    mostUsedFeatures: Array<{ feature: string; count: number }>;
    topCategories: Array<{ category: string; accuracy: number }>;
  }> {
    try {
      const analytics = await databaseService.getStudyAnalytics(days);
      
      // Get feature usage from events
      const featureEvents = this.eventQueue.filter(e => e.name === 'feature_used');
      const featureCounts: Record<string, number> = {};
      
      featureEvents.forEach(event => {
        const feature = event.properties?.feature;
        if (feature) {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        }
      });

      const mostUsedFeatures = Object.entries(featureCounts)
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalSessions: this.eventQueue.filter(e => e.name === 'session_start').length,
        averageSessionDuration: 0, // Calculate from stored sessions
        totalQuestionsAnswered: analytics.totalQuestions,
        averageAccuracy: analytics.accuracy,
        mostUsedFeatures,
        topCategories: analytics.categoryBreakdown.map((cat: any) => ({
          category: cat.category,
          accuracy: cat.accuracy
        })),
      };
    } catch (error) {
      console.error('Failed to get usage insights:', error);
      return {
        totalSessions: 0,
        averageSessionDuration: 0,
        totalQuestionsAnswered: 0,
        averageAccuracy: 0,
        mostUsedFeatures: [],
        topCategories: [],
      };
    }
  }

  // ==================== UTILITIES ====================

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    // In a real app, you'd use expo-device or react-native-device-info
    return {
      platform: 'android', // Default to Android for now
      version: '1.0.0',
      model: 'Unknown',
      isEmulator: false,
    };
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      // In a real app, you'd send events to analytics service
      // For now, we'll just clear the queue
      const events = [...this.eventQueue];
      this.eventQueue = [];

      if (__DEV__) {
        console.log(`📤 Flushed ${events.length} analytics events`);
      }
    } catch (error) {
      console.error('Failed to flush events:', error);
    }
  }

  // ==================== CLEANUP ====================

  async cleanup(): Promise<void> {
    await this.endSession();
    await this.flushEvents();
    this.isInitialized = false;
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;