import AsyncStorage from '@react-native-async-storage/async-storage';
import { debugLogger, logUserAction } from '../utils/debugLogger';

export interface AnonymousUser {
  id: string;
  isAnonymous: true;
  sessionId: string;
  deviceId: string;
  firstUsage: Date;
  lastActive: Date;
  level: number;
  xp: number;
  streak: number;
  // Optional profile data collected later
  username?: string;
  email?: string;
  fullName?: string;
  preferences?: {
    theme?: string;
    language?: string;
    notifications?: boolean;
  };
  stats?: {
    studyTimeTotal: number;
    flashcardsStudied: number;
    resourcesViewed: number;
    achievementsUnlocked: number;
  };
}

class AnonymousUserService {
  private currentUser: AnonymousUser | null = null;
  private readonly STORAGE_KEYS = {
    ANONYMOUS_USER: '@anonymous_user',
    SESSION_ID: '@session_id',
    DEVICE_ID: '@device_id',
    LAST_ACTIVE: '@last_active_date',
  };

  // Initialize anonymous user session
  async initialize(): Promise<void> {
    try {
      // Check if we have an existing anonymous user
      const userData = await AsyncStorage.getItem(this.STORAGE_KEYS.ANONYMOUS_USER);
      
      if (userData) {
        this.currentUser = JSON.parse(userData);
        // Update last active
        if (this.currentUser) {
          this.currentUser.lastActive = new Date();
          await this.saveUser();
        }
        debugLogger.success(`Anonymous user session restored: ${this.currentUser?.sessionId}`);
      } else {
        // Create new anonymous user
        await this.createAnonymousUser();
      }
      
      logUserAction('Initialize Anonymous User', 'AnonymousUserService');
    } catch (error) {
      debugLogger.error('Failed to initialize anonymous user', { error: error instanceof Error ? error.message : String(error) });
      // Create fallback user
      await this.createAnonymousUser();
    }
  }

  // Create a new anonymous user
  private async createAnonymousUser(): Promise<void> {
    try {
      const deviceId = await this.getOrCreateDeviceId();
      const sessionId = this.generateSessionId();
      
      const newUser: AnonymousUser = {
        id: `anon_${Date.now()}`,
        isAnonymous: true,
        sessionId,
        deviceId,
        firstUsage: new Date(),
        lastActive: new Date(),
        level: 1,
        xp: 0,
        streak: 0,
        stats: {
          studyTimeTotal: 0,
          flashcardsStudied: 0,
          resourcesViewed: 0,
          achievementsUnlocked: 0,
        }
      };

      this.currentUser = newUser;
      await this.saveUser();
      
      debugLogger.success(`Created anonymous user: ${sessionId}`);
      logUserAction('Create Anonymous User', 'AnonymousUserService', { sessionId, deviceId });
    } catch (error) {
      debugLogger.error('Failed to create anonymous user', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}_${random}`;
  }

  // Get or create device ID
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.STORAGE_KEYS.DEVICE_ID);
      
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(this.STORAGE_KEYS.DEVICE_ID, deviceId);
      }
      
      return deviceId;
    } catch (error) {
      // Fallback device ID
      return `fallback_${Date.now()}`;
    }
  }

  // Save user to storage
  private async saveUser(): Promise<void> {
    if (!this.currentUser) return;
    
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.ANONYMOUS_USER, JSON.stringify(this.currentUser));
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());
    } catch (error) {
      debugLogger.error('Failed to save anonymous user', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Get current user
  getCurrentUser(): AnonymousUser | null {
    return this.currentUser;
  }

  // Check if user is authenticated (always true for anonymous)
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get user ID
  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  // Get session ID
  getSessionId(): string | null {
    return this.currentUser?.sessionId || null;
  }

  // Update profile information (when user provides data)
  async updateProfile(profileData: {
    username?: string;
    email?: string;
    fullName?: string;
    preferences?: AnonymousUser['preferences'];
  }): Promise<{ error: string | null }> {
    try {
      if (!this.currentUser) {
        return { error: 'No active user session' };
      }

      // Update profile data
      if (profileData.username) this.currentUser.username = profileData.username;
      if (profileData.email) this.currentUser.email = profileData.email;
      if (profileData.fullName) this.currentUser.fullName = profileData.fullName;
      if (profileData.preferences) {
        this.currentUser.preferences = { ...this.currentUser.preferences, ...profileData.preferences };
      }

      await this.saveUser();
      
      debugLogger.success('Anonymous user profile updated', { 
        username: profileData.username,
        hasEmail: !!profileData.email 
      });
      
      logUserAction('Update Profile', 'AnonymousUserService', {
        fields: Object.keys(profileData)
      });

      return { error: null };
    } catch (error) {
      debugLogger.error('Failed to update profile', { error: error instanceof Error ? error.message : String(error) });
      return { error: 'Failed to update profile' };
    }
  }

  // Add XP to user
  async addXP(amount: number, source: string = 'general'): Promise<{
    newLevel: number;
    leveledUp: boolean;
    newXP: number;
  }> {
    if (!this.currentUser) {
      throw new Error('No active user session');
    }

    const oldXP = this.currentUser.xp;
    const oldLevel = this.currentUser.level;
    const newXP = oldXP + amount;
    const newLevel = this.calculateLevel(newXP);
    const leveledUp = newLevel > oldLevel;

    // Update user
    this.currentUser.xp = newXP;
    this.currentUser.level = newLevel;
    this.currentUser.lastActive = new Date();

    await this.saveUser();

    debugLogger.success(`+${amount} XP added`, { 
      source, 
      oldXP, 
      newXP, 
      oldLevel, 
      newLevel, 
      leveledUp,
      sessionId: this.currentUser.sessionId 
    });

    if (leveledUp) {
      debugLogger.success(`LEVEL UP! Session ${this.currentUser.sessionId} reached level ${newLevel}`);
    }

    logUserAction('Add XP', 'AnonymousUserService', { 
      amount, 
      source, 
      newLevel, 
      leveledUp 
    });

    return { newLevel, leveledUp, newXP };
  }

  // Calculate level based on XP
  private calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  // Get XP required for next level
  getXPRequiredForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  // Update streak
  async updateStreak(): Promise<{ streak: number; maxStreak: number }> {
    if (!this.currentUser) {
      throw new Error('No active user session');
    }

    const today = new Date().toDateString();
    const lastActiveDate = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_ACTIVE);
    const oldStreak = this.currentUser.streak;
    let newStreak = oldStreak;
    let streakEvent = 'no change';

    if (lastActiveDate) {
      const lastDate = new Date(lastActiveDate).toDateString();
      
      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate === yesterday.toDateString()) {
          // Consecutive day - increment streak
          newStreak += 1;
          streakEvent = 'incremented';
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
          streakEvent = 'broken and reset';
        }
      }
    } else {
      // First time - start streak
      newStreak = 1;
      streakEvent = 'started';
    }

    // Update user
    this.currentUser.streak = newStreak;
    this.currentUser.lastActive = new Date();
    await this.saveUser();

    debugLogger.info(`Streak ${streakEvent}`, { 
      sessionId: this.currentUser.sessionId,
      oldStreak, 
      newStreak, 
      lastActiveDate, 
      today 
    });

    logUserAction('Update Streak', 'AnonymousUserService', {
      oldStreak,
      newStreak,
      event: streakEvent
    });

    return { streak: newStreak, maxStreak: newStreak };
  }

  // Update user statistics
  async updateStats(stats: Partial<AnonymousUser['stats']>): Promise<void> {
    if (!this.currentUser) return;

    if (!this.currentUser.stats) {
      this.currentUser.stats = {
        studyTimeTotal: 0,
        flashcardsStudied: 0,
        resourcesViewed: 0,
        achievementsUnlocked: 0,
      };
    }

    // Update stats
    Object.keys(stats).forEach(key => {
      if (this.currentUser && this.currentUser.stats && key in this.currentUser.stats) {
        (this.currentUser.stats as any)[key] += (stats as any)[key] || 0;
      }
    });

    this.currentUser.lastActive = new Date();
    await this.saveUser();

    debugLogger.info('User stats updated', { stats, sessionId: this.currentUser.sessionId });
    logUserAction('Update Stats', 'AnonymousUserService', stats);
  }

  // Get user statistics
  getStats(): {
    sessionId: string | null;
    deviceId: string | null;
    isAnonymous: boolean;
    firstUsage: string | null;
    daysSinceFirstUsage: number;
    level: number;
    xp: number;
    streak: number;
    hasProfile: boolean;
    stats: AnonymousUser['stats'] | null;
  } {
    if (!this.currentUser) {
      return {
        sessionId: null,
        deviceId: null,
        isAnonymous: false,
        firstUsage: null,
        daysSinceFirstUsage: 0,
        level: 0,
        xp: 0,
        streak: 0,
        hasProfile: false,
        stats: null,
      };
    }

    const daysSinceFirst = Math.floor(
      (Date.now() - this.currentUser.firstUsage.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      sessionId: this.currentUser.sessionId,
      deviceId: this.currentUser.deviceId,
      isAnonymous: this.currentUser.isAnonymous,
      firstUsage: this.currentUser.firstUsage.toISOString(),
      daysSinceFirstUsage: daysSinceFirst,
      level: this.currentUser.level,
      xp: this.currentUser.xp,
      streak: this.currentUser.streak,
      hasProfile: !!(this.currentUser.username || this.currentUser.email),
      stats: this.currentUser.stats || null,
    };
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.ANONYMOUS_USER,
        this.STORAGE_KEYS.SESSION_ID,
        this.STORAGE_KEYS.DEVICE_ID,
        this.STORAGE_KEYS.LAST_ACTIVE,
      ]);
      
      this.currentUser = null;
      debugLogger.success('All anonymous user data cleared');
      logUserAction('Clear All Data', 'AnonymousUserService');
    } catch (error) {
      debugLogger.error('Failed to clear data', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Convert anonymous user to registered user data (for future use)
  exportUserData(): AnonymousUser | null {
    if (!this.currentUser) return null;
    
    debugLogger.info('Exporting anonymous user data');
    logUserAction('Export User Data', 'AnonymousUserService');
    
    return { ...this.currentUser };
  }
}

// Singleton instance
export const anonymousUserService = new AnonymousUserService();
export default anonymousUserService;