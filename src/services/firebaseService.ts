import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== FIREBASE INTEGRATION SERVICE ====================

interface PushNotificationData {
  title: string;
  body: string;
  data?: { [key: string]: string };
  scheduledTime?: Date;
}

interface AnalyticsEvent {
  name: string;
  parameters?: { [key: string]: any };
}

interface CrashReport {
  error: Error;
  userId?: string;
  context?: { [key: string]: any };
}

class FirebaseService {
  private isInitialized = false;
  private fcmToken: string | null = null;
  private isMessagingConfigured = false;

  async initialize(): Promise<void> {
    try {
      // Initialize Firebase services
      await this.initializeMessaging();
      await this.initializeAnalytics();
      await this.initializeCrashlytics();

      this.isInitialized = true;
      console.log('🔥 Firebase Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error);
      // Continue without Firebase - app should work offline
    }
  }

  // ==================== PUSH NOTIFICATIONS ====================

  private async initializeMessaging(): Promise<void> {
    try {
      // Request permission for iOS
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('Push notification permission denied');
          return;
        }
      }

      // Get FCM token
      this.fcmToken = await messaging().getToken();
      console.log('FCM Token:', this.fcmToken);

      // Save token to AsyncStorage
      if (this.fcmToken) {
        await AsyncStorage.setItem('@fcm_token', this.fcmToken);
      }

      // Set up token refresh listener
      messaging().onTokenRefresh(async (token) => {
        this.fcmToken = token;
        await AsyncStorage.setItem('@fcm_token', token);
        console.log('FCM Token refreshed:', token);
      });

      this.isMessagingConfigured = true;
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error);
    }
  }

  async getFCMToken(): Promise<string | null> {
    if (this.fcmToken) return this.fcmToken;

    try {
      const savedToken = await AsyncStorage.getItem('@fcm_token');
      if (savedToken) {
        this.fcmToken = savedToken;
        return savedToken;
      }

      if (this.isMessagingConfigured) {
        this.fcmToken = await messaging().getToken();
        if (this.fcmToken) {
          await AsyncStorage.setItem('@fcm_token', this.fcmToken);
        }
        return this.fcmToken;
      }
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }

    return null;
  }

  // Set up foreground message handlers
  setupMessageHandlers(
    onForegroundMessage: (message: any) => void,
    onNotificationOpened: (message: any) => void
  ): void {
    if (!this.isMessagingConfigured) return;

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Received foreground message:', remoteMessage);
      onForegroundMessage(remoteMessage);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      onNotificationOpened(remoteMessage);
    });

    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          onNotificationOpened(remoteMessage);
        }
      });
  }

  async scheduleStudyReminder(data: PushNotificationData): Promise<void> {
    // This would typically be handled by a backend service
    // For now, we'll store locally and potentially send to a backend
    try {
      const reminders = await this.getStoredReminders();
      reminders.push({
        ...data,
        id: Date.now().toString(),
        scheduledTime: data.scheduledTime || new Date(Date.now() + 24 * 60 * 60 * 1000) // Default: 24 hours
      });

      await AsyncStorage.setItem('@study_reminders', JSON.stringify(reminders));
      console.log('Study reminder scheduled:', data.title);
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
    }
  }

  private async getStoredReminders(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('@study_reminders');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async cancelStudyReminder(reminderId: string): Promise<void> {
    try {
      const reminders = await this.getStoredReminders();
      const filtered = reminders.filter(r => r.id !== reminderId);
      await AsyncStorage.setItem('@study_reminders', JSON.stringify(filtered));
      console.log('Study reminder cancelled:', reminderId);
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
    }
  }

  // ==================== ANALYTICS ====================

  private async initializeAnalytics(): Promise<void> {
    try {
      await analytics().setAnalyticsCollectionEnabled(true);
      console.log('📊 Firebase Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
    }
  }

  async logEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await analytics().logEvent(event.name, event.parameters);
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }

  // Study-specific analytics events
  async logStudySessionStart(category: string, difficulty: string): Promise<void> {
    await this.logEvent({
      name: 'study_session_start',
      parameters: {
        category,
        difficulty,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logStudySessionEnd(data: {
    category: string;
    difficulty: string;
    duration: number;
    questionsAnswered: number;
    accuracy: number;
  }): Promise<void> {
    await this.logEvent({
      name: 'study_session_end',
      parameters: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logQuestionAnswered(data: {
    category: string;
    difficulty: string;
    correct: boolean;
    responseTime: number;
  }): Promise<void> {
    await this.logEvent({
      name: 'question_answered',
      parameters: data
    });
  }

  async logLevelUp(newLevel: number, xp: number): Promise<void> {
    await this.logEvent({
      name: 'level_up',
      parameters: {
        new_level: newLevel,
        total_xp: xp
      }
    });
  }

  async logAchievementUnlocked(achievementId: string, category: string): Promise<void> {
    await this.logEvent({
      name: 'achievement_unlocked',
      parameters: {
        achievement_id: achievementId,
        category
      }
    });
  }

  async logFeatureUsed(feature: string, context?: string): Promise<void> {
    await this.logEvent({
      name: 'feature_used',
      parameters: {
        feature_name: feature,
        context: context || 'general'
      }
    });
  }

  async setUserProperties(userId: string, properties: { [key: string]: any }): Promise<void> {
    try {
      await analytics().setUserId(userId);
      
      for (const [key, value] of Object.entries(properties)) {
        await analytics().setUserProperty(key, String(value));
      }
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  // ==================== CRASHLYTICS ====================

  private async initializeCrashlytics(): Promise<void> {
    try {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('💥 Firebase Crashlytics initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase Crashlytics:', error);
    }
  }

  async recordError(report: CrashReport): Promise<void> {
    try {
      if (report.userId) {
        await crashlytics().setUserId(report.userId);
      }

      if (report.context) {
        for (const [key, value] of Object.entries(report.context)) {
          await crashlytics().setAttribute(key, String(value));
        }
      }

      await crashlytics().recordError(report.error);
    } catch (error) {
      console.error('Failed to record error:', error);
    }
  }

  async log(message: string): Promise<void> {
    try {
      await crashlytics().log(message);
    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  async setBreadcrumb(message: string, category?: string): Promise<void> {
    try {
      await crashlytics().setAttribute('last_action', message);
      if (category) {
        await crashlytics().setAttribute('action_category', category);
      }
    } catch (error) {
      console.error('Failed to set breadcrumb:', error);
    }
  }

  // ==================== PERFORMANCE MONITORING ====================

  async startTrace(traceName: string): Promise<any> {
    try {
      // This would use @react-native-firebase/perf if installed
      console.log(`Starting trace: ${traceName}`);
      return {
        stop: () => console.log(`Stopping trace: ${traceName}`),
        putAttribute: (key: string, value: string) => console.log(`Trace attribute: ${key}=${value}`),
        putMetric: (key: string, value: number) => console.log(`Trace metric: ${key}=${value}`)
      };
    } catch (error) {
      console.error('Failed to start trace:', error);
      return null;
    }
  }

  // ==================== REMOTE CONFIG ====================

  async getRemoteConfig(key: string, defaultValue: any = null): Promise<any> {
    try {
      // This would use @react-native-firebase/remote-config if installed
      // For now, return default value
      console.log(`Remote config requested: ${key}`);
      return defaultValue;
    } catch (error) {
      console.error('Failed to get remote config:', error);
      return defaultValue;
    }
  }

  // ==================== APP STATE TRACKING ====================

  async logAppOpen(): Promise<void> {
    await this.logEvent({
      name: 'app_open',
      parameters: {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      }
    });
  }

  async logAppBackground(): Promise<void> {
    await this.logEvent({
      name: 'app_background',
      parameters: {
        timestamp: new Date().toISOString()
      }
    });
  }

  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent({
      name: 'screen_view',
      parameters: {
        screen_name: screenName,
        screen_class: screenClass || screenName
      }
    });
  }

  // ==================== UTILITY METHODS ====================

  isInitialized(): boolean {
    return this.isInitialized;
  }

  isMessagingAvailable(): boolean {
    return this.isMessagingConfigured;
  }

  async testCrash(): Promise<void> {
    // Only for testing purposes
    if (__DEV__) {
      await crashlytics().crash();
    }
  }

  async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['@fcm_token', '@study_reminders']);
      await crashlytics().setUserId('');
      await analytics().resetAnalyticsData();
      console.log('✅ Firebase user data cleared');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }
}

// Singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;