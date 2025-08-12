import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from './authService';
import { databaseService } from './databaseService.platform';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationSchedule {
  id: string;
  type: string;
  title: string;
  body: string;
  scheduledTime: Date;
  data?: any;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private scheduledNotifications: NotificationSchedule[] = [];

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status } = await this.requestPermissions();
      
      if (status === 'granted') {
        // Get push token
        this.expoPushToken = await this.getExpoPushToken();
        
        // Setup notification listeners
        this.setupNotificationListeners();
        
        // Schedule initial smart notifications
        await this.scheduleSmartNotifications();
        
        console.log('🔔 Notification Service initialized with token:', this.expoPushToken);
      } else {
        console.log('⚠️ Notification permissions not granted');
      }
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    }
  }

  // ==================== PERMISSIONS & TOKEN ====================

  private async requestPermissions(): Promise<{ status: string }> {
    let finalStatus = 'denied';

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    } else {
      console.log('Notifications not supported on simulator');
    }

    return { status: finalStatus };
  }

  private async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user tapping notifications
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    if (data?.type === 'study_reminder') {
      // Navigate to study screen
      console.log('Opening study screen from notification');
    } else if (data?.type === 'streak_warning') {
      // Navigate to dashboard
      console.log('Opening dashboard from streak notification');
    }
  }

  // ==================== SMART NOTIFICATIONS ====================

  async scheduleSmartNotifications(): Promise<void> {
    const userId = authService.getUserId();
    if (!userId) return;

    // Cancel existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.scheduledNotifications = [];

    // Schedule different types of smart notifications
    await this.scheduleStudyReminders();
    await this.scheduleStreakWarnings();
    await this.schedulePerformanceAlerts();
    await this.scheduleMotivationalMessages();
    await this.scheduleWeeklyReports();

    console.log(`📅 Scheduled ${this.scheduledNotifications.length} smart notifications`);
  }

  private async scheduleStudyReminders(): Promise<void> {
    const profile = authService.getCurrentProfile();
    if (!profile) return;

    const studyGoalMinutes = profile.study_goal_minutes || 30;
    const preferredCategories = profile.preferred_categories || [];

    // Daily study reminders
    for (let i = 1; i <= 7; i++) {
      const reminderTime = new Date();
      reminderTime.setDate(reminderTime.getDate() + i);
      reminderTime.setHours(19, 0, 0, 0); // 7 PM daily

      const category = preferredCategories[i % preferredCategories.length] || 'JavaScript';
      
      const notification: NotificationSchedule = {
        id: `study_reminder_${i}`,
        type: 'study_reminder',
        title: '🚀 ¡Hora de estudiar!',
        body: `Tu meta: ${studyGoalMinutes} minutos de ${category} hoy`,
        scheduledTime: reminderTime,
        data: { type: 'study_reminder', category },
      };

      await this.scheduleNotification(notification);
    }
  }

  private async scheduleStreakWarnings(): Promise<void> {
    const profile = authService.getCurrentProfile();
    if (!profile || profile.streak < 3) return;

    // Warn about streak ending tomorrow if no activity today
    const warningTime = new Date();
    warningTime.setDate(warningTime.getDate() + 1);
    warningTime.setHours(21, 0, 0, 0); // 9 PM tomorrow

    const notification: NotificationSchedule = {
      id: 'streak_warning',
      type: 'streak_warning',
      title: '🔥 ¡Tu racha está en peligro!',
      body: `Tu racha de ${profile.streak} días puede perderse. ¡Estudia ahora!`,
      scheduledTime: warningTime,
      data: { type: 'streak_warning', currentStreak: profile.streak },
    };

    await this.scheduleNotification(notification);
  }

  private async schedulePerformanceAlerts(): Promise<void> {
    try {
      const analytics = await databaseService.getStudyAnalytics(7);
      
      // Find weak areas
      const weakCategories = analytics.categoryBreakdown
        .filter((cat: any) => cat.accuracy < 60 && cat.count > 3)
        .sort((a: any, b: any) => a.accuracy - b.accuracy);

      if (weakCategories.length > 0) {
        const weakestCategory = weakCategories[0];
        
        const alertTime = new Date();
        alertTime.setDate(alertTime.getDate() + 2);
        alertTime.setHours(18, 30, 0, 0);

        const notification: NotificationSchedule = {
          id: 'performance_alert',
          type: 'performance_alert',
          title: '📈 Mejora tu rendimiento',
          body: `Tu precisión en ${weakestCategory.category} es ${weakestCategory.accuracy.toFixed(1)}%. ¡Practiquemos!`,
          scheduledTime: alertTime,
          data: { 
            type: 'performance_alert', 
            category: weakestCategory.category,
            accuracy: weakestCategory.accuracy 
          },
        };

        await this.scheduleNotification(notification);
      }
    } catch (error) {
      console.error('Failed to schedule performance alerts:', error);
    }
  }

  private async scheduleMotivationalMessages(): Promise<void> {
    const motivationalMessages = [
      { title: '💪 ¡Sigue así!', body: 'Cada pregunta te acerca más a tu meta profesional' },
      { title: '🧠 Dato curioso', body: 'Estudiar 15 min al día mejora la retención en 40%' },
      { title: '🎯 Objetivo del día', body: 'Hoy puedes dominar un concepto nuevo' },
      { title: '⭐ Progreso', body: 'Has mejorado mucho desde que empezaste' },
      { title: '🚀 Momentum', body: 'Los grandes desarrolladores nunca dejan de aprender' },
    ];

    for (let i = 0; i < 5; i++) {
      const message = motivationalMessages[i];
      const messageTime = new Date();
      messageTime.setDate(messageTime.getDate() + i * 2 + 1);
      messageTime.setHours(10, 0, 0, 0); // 10 AM

      const notification: NotificationSchedule = {
        id: `motivation_${i}`,
        type: 'motivation',
        title: message.title,
        body: message.body,
        scheduledTime: messageTime,
        data: { type: 'motivation' },
      };

      await this.scheduleNotification(notification);
    }
  }

  private async scheduleWeeklyReports(): Promise<void> {
    const reportTime = new Date();
    reportTime.setDate(reportTime.getDate() + (7 - reportTime.getDay())); // Next Sunday
    reportTime.setHours(20, 0, 0, 0); // 8 PM

    try {
      const analytics = await databaseService.getStudyAnalytics(7);
      
      const notification: NotificationSchedule = {
        id: 'weekly_report',
        type: 'weekly_report',
        title: '📊 Tu reporte semanal',
        body: `Esta semana: ${analytics.totalQuestions} preguntas, ${analytics.accuracy.toFixed(1)}% precisión`,
        scheduledTime: reportTime,
        data: { 
          type: 'weekly_report',
          totalQuestions: analytics.totalQuestions,
          accuracy: analytics.accuracy 
        },
      };

      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Failed to schedule weekly report:', error);
    }
  }

  // ==================== NOTIFICATION SCHEDULING ====================

  private async scheduleNotification(notification: NotificationSchedule): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: notification.id,
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
        },
        trigger: null,
      });

      this.scheduledNotifications.push(notification);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  // ==================== IMMEDIATE NOTIFICATIONS ====================

  async sendImmediateNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      await Notifications.presentNotificationAsync({
        title,
        body,
        data,
        sound: 'default',
      });
    } catch (error) {
      console.error('Failed to send immediate notification:', error);
    }
  }

  async celebrateAchievement(achievementTitle: string, xpReward: number): Promise<void> {
    await this.sendImmediateNotification(
      `🎉 ¡Logro desbloqueado!`,
      `${achievementTitle} (+${xpReward} XP)`,
      { type: 'achievement', title: achievementTitle, xp: xpReward }
    );
  }

  async celebrateLevelUp(newLevel: number): Promise<void> {
    await this.sendImmediateNotification(
      `🆙 ¡Subiste de nivel!`,
      `¡Ahora eres nivel ${newLevel}! Nuevas características desbloqueadas`,
      { type: 'level_up', level: newLevel }
    );
  }

  async notifyStreakMilestone(streak: number): Promise<void> {
    const milestones = [7, 14, 30, 60, 100];
    
    if (milestones.includes(streak)) {
      await this.sendImmediateNotification(
        `🔥 ¡Racha increíble!`,
        `${streak} días consecutivos estudiando. ¡Eres imparable!`,
        { type: 'streak_milestone', streak }
      );
    }
  }

  // ==================== ADAPTIVE NOTIFICATIONS ====================

  async updateNotificationPreferences(preferences: {
    studyReminders: boolean;
    streakWarnings: boolean;
    performanceAlerts: boolean;
    motivationalMessages: boolean;
    weeklyReports: boolean;
    reminderTime: string; // "19:00"
  }): Promise<void> {
    await AsyncStorage.setItem('@notification_preferences', JSON.stringify(preferences));
    
    // Reschedule notifications based on new preferences
    await this.scheduleSmartNotifications();
  }

  async analyzeOptimalNotificationTime(): Promise<string> {
    // Analyze when user is most active and responsive
    try {
      const analytics = await databaseService.getStudyAnalytics(30);
      
      // Simple heuristic: if user has high activity in evenings, suggest evening notifications
      // In a real implementation, you'd analyze actual usage patterns
      
      const profile = authService.getCurrentProfile();
      const studyGoalMinutes = profile?.study_goal_minutes || 30;
      
      if (studyGoalMinutes >= 60) {
        return "18:00"; // Longer study sessions -> earlier reminder
      } else {
        return "19:30"; // Shorter sessions -> later reminder
      }
    } catch (error) {
      return "19:00"; // Default fallback
    }
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    this.scheduledNotifications = this.scheduledNotifications.filter(
      n => n.id !== notificationId
    );
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.scheduledNotifications = [];
  }

  getScheduledNotifications(): NotificationSchedule[] {
    return [...this.scheduledNotifications];
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // ==================== PUSH NOTIFICATION SENDING ====================

  async sendPushToUser(
    targetUserId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real app, you'd have a backend service that stores user push tokens
      // and sends notifications via Expo's push service
      
      console.log(`Would send push notification to user ${targetUserId}:`, {
        title,
        body,
        data
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ==================== NOTIFICATION CATEGORIES ====================

  async createNotificationCategories(): Promise<void> {
    // Create interactive notification categories
    await Notifications.setNotificationCategoryAsync('study_reminder', [
      {
        identifier: 'start_studying',
        buttonTitle: 'Estudiar ahora',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'remind_later',
        buttonTitle: 'Recordar en 1h',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('streak_warning', [
      {
        identifier: 'quick_study',
        buttonTitle: 'Estudio rápido (5 min)',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Tal vez mañana',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }
}

// Singleton instance
export const notificationService = new NotificationService();
export default notificationService;