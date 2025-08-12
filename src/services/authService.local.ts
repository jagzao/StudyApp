import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './databaseService.platform';
import { debugLogger, logAuthEvent, logUserAction } from '../utils/debugLogger';

// Local authentication without external dependencies
export interface LocalUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  level: number;
  xp: number;
  streak: number;
  createdAt: Date;
  lastLogin: Date;
}

class LocalAuthService {
  private currentUser: LocalUser | null = null;
  private readonly STORAGE_KEYS = {
    USERS: '@auth_users',
    CURRENT_USER: '@current_user',
    LAST_ACTIVE: '@last_active_date',
  };

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    try {
      // Load current user if exists
      const userData = await AsyncStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
      if (userData) {
        this.currentUser = JSON.parse(userData);
        debugLogger.success(`Auth initialized - User: ${this.currentUser?.username}`);
      } else {
        debugLogger.info('Auth initialized - No user found');
      }
    } catch (error) {
      debugLogger.error('Auth initialization failed', { error: error.message });
    }
  }

  // ==================== AUTHENTICATION ====================

  async signUp(
    email: string, 
    password: string, 
    username: string, 
    fullName?: string
  ): Promise<{
    user: LocalUser | null;
    error: string | null;
  }> {
    try {
      // Validate input
      if (!email || !password || !username) {
        const error = 'Todos los campos son requeridos';
        logAuthEvent('Sign Up Failed - Missing fields', false, error);
        return { user: null, error };
      }

      if (password.length < 6) {
        const error = 'La contraseña debe tener al menos 6 caracteres';
        logAuthEvent('Sign Up Failed - Password too short', false, error);
        return { user: null, error };
      }

      // Check if user already exists
      const existingUsers = await this.getAllUsers();
      const userExists = existingUsers.some(u => 
        u.email.toLowerCase() === email.toLowerCase() || 
        u.username.toLowerCase() === username.toLowerCase()
      );

      if (userExists) {
        const error = 'Usuario o email ya existe';
        logAuthEvent('Sign Up Failed - User exists', false, error);
        return { user: null, error };
      }

      // Create new user
      const newUser: LocalUser = {
        id: Date.now(), // Simple ID generation
        username,
        email,
        fullName,
        level: 1,
        xp: 0,
        streak: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      // Save user to storage
      await this.saveUser(newUser, password);
      
      // Set as current user
      this.currentUser = newUser;
      await AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));

      logAuthEvent('Sign Up Success', true);
      debugLogger.success(`User created: ${username} (ID: ${newUser.id})`);
      return { user: newUser, error: null };
    } catch (error) {
      console.error('Error creating user:', error);
      return { user: null, error: 'Error al crear la cuenta' };
    }
  }

  async signIn(email: string, password: string): Promise<{
    user: LocalUser | null;
    error: string | null;
  }> {
    try {
      if (!email || !password) {
        const error = 'Email y contraseña son requeridos';
        logAuthEvent('Sign In Failed - Missing fields', false, error);
        return { user: null, error };
      }

      debugLogger.info(`Sign in attempt for email: ${email}`);

      // Get all users
      const users = await this.getAllUsers();
      const userFound = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase()
      );

      if (!userFound) {
        const error = 'Usuario no encontrado';
        logAuthEvent('Sign In Failed - User not found', false, error);
        return { user: null, error };
      }

      // Verify password
      const isValid = await this.verifyPassword(userFound.id, password);
      if (!isValid) {
        const error = 'Contraseña incorrecta';
        logAuthEvent('Sign In Failed - Invalid password', false, error);
        return { user: null, error };
      }

      // Update last login
      userFound.lastLogin = new Date();
      await this.updateUser(userFound);

      // Set as current user
      this.currentUser = userFound;
      await AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(userFound));

      logAuthEvent('Sign In Success', true);
      debugLogger.success(`User signed in: ${userFound.username} (ID: ${userFound.id})`);
      return { user: userFound, error: null };
    } catch (error) {
      const errorMessage = 'Error al iniciar sesión';
      logAuthEvent('Sign In Failed - Exception', false, error.message);
      debugLogger.error('Sign in exception', { error: error.message, email });
      return { user: null, error: errorMessage };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const username = this.currentUser?.username || 'unknown';
      
      // Clear current user
      this.currentUser = null;
      await AsyncStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
      
      logAuthEvent('Sign Out Success', true);
      debugLogger.success(`User signed out: ${username}`);
      return { error: null };
    } catch (error) {
      const errorMessage = 'Error al cerrar sesión';
      logAuthEvent('Sign Out Failed', false, error.message);
      debugLogger.error('Sign out exception', { error: error.message });
      return { error: errorMessage };
    }
  }

  // ==================== USER MANAGEMENT ====================

  private async getAllUsers(): Promise<LocalUser[]> {
    try {
      const usersData = await AsyncStorage.getItem(this.STORAGE_KEYS.USERS);
      return usersData ? JSON.parse(usersData) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  private async saveUser(user: LocalUser, password: string): Promise<void> {
    try {
      // Save user data
      const users = await this.getAllUsers();
      users.push(user);
      await AsyncStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));

      // Save password separately (in real app, would be hashed)
      await AsyncStorage.setItem(`@password_${user.id}`, password);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  private async updateUser(user: LocalUser): Promise<void> {
    try {
      const users = await this.getAllUsers();
      const index = users.findIndex(u => u.id === user.id);
      
      if (index !== -1) {
        users[index] = user;
        await AsyncStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  private async verifyPassword(userId: number, password: string): Promise<boolean> {
    try {
      const savedPassword = await AsyncStorage.getItem(`@password_${userId}`);
      return savedPassword === password;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // ==================== GETTERS ====================

  async getCurrentUser(): Promise<LocalUser | null> {
    return this.currentUser;
  }

  getCurrentProfile(): LocalUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUserId(): number | null {
    return this.currentUser?.id || null;
  }

  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  // ==================== XP AND PROGRESS ====================

  async addXP(amount: number, source: string = 'general'): Promise<{ 
    newLevel: number; 
    leveledUp: boolean; 
    newXP: number; 
  }> {
    if (!this.currentUser) {
      debugLogger.error('Cannot add XP - User not authenticated');
      throw new Error('User not authenticated');
    }

    const oldXP = this.currentUser.xp;
    const oldLevel = this.currentUser.level;
    const newXP = oldXP + amount;
    const newLevel = this.calculateLevel(newXP);
    const leveledUp = newLevel > oldLevel;

    // Update user
    this.currentUser.xp = newXP;
    this.currentUser.level = newLevel;

    await this.updateUser(this.currentUser);
    await AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));

    debugLogger.success(`+${amount} XP added`, { 
      source, 
      oldXP, 
      newXP, 
      oldLevel, 
      newLevel, 
      leveledUp,
      username: this.currentUser.username 
    });
    
    if (leveledUp) {
      debugLogger.success(`LEVEL UP! ${this.currentUser.username} reached level ${newLevel}`);
    }
    
    return { newLevel, leveledUp, newXP };
  }

  private calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  getXPRequiredForLevel(level: number): number {
    return Math.pow(level - 1, 2) * 100;
  }

  // ==================== STREAK MANAGEMENT ====================

  async updateStreak(): Promise<{ streak: number; maxStreak: number }> {
    if (!this.currentUser) {
      debugLogger.error('Cannot update streak - User not authenticated');
      throw new Error('User not authenticated');
    }

    const today = new Date().toDateString();
    const lastActiveDate = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_ACTIVE);
    const oldStreak = this.currentUser.streak;
    let newStreak = oldStreak;
    let streakEvent = 'no change';

    if (lastActiveDate !== today) {
      // Check if it's consecutive day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActiveDate === yesterday.toDateString()) {
        // Consecutive day - increment streak
        newStreak += 1;
        streakEvent = 'incremented';
      } else if (lastActiveDate && lastActiveDate !== today) {
        // Streak broken - reset to 1
        newStreak = 1;
        streakEvent = 'broken and reset';
      } else if (!lastActiveDate) {
        // First time - start streak
        newStreak = 1;
        streakEvent = 'started';
      }

      // Update user
      this.currentUser.streak = newStreak;
      await this.updateUser(this.currentUser);
      await AsyncStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));

      // Save today as last active date
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVE, today);

      debugLogger.info(`Streak ${streakEvent}`, { 
        username: this.currentUser.username,
        oldStreak, 
        newStreak, 
        lastActiveDate, 
        today 
      });
    }

    return { streak: newStreak, maxStreak: newStreak };
  }

  // ==================== PASSWORD RESET ====================

  async resetPassword(email: string): Promise<{ error: string | null }> {
    // In a real app, this would send an email
    // For local version, just return success
    console.log(`Password reset requested for: ${email}`);
    return { error: null };
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      if (!this.currentUser) {
        const error = 'User not authenticated';
        logAuthEvent('Password Update Failed - Not authenticated', false, error);
        return { error };
      }

      if (newPassword.length < 6) {
        const error = 'La contraseña debe tener al menos 6 caracteres';
        logAuthEvent('Password Update Failed - Too short', false, error);
        return { error };
      }

      // Update password
      await AsyncStorage.setItem(`@password_${this.currentUser.id}`, newPassword);
      
      logAuthEvent('Password Update Success', true);
      debugLogger.success(`Password updated for user: ${this.currentUser.username}`);
      return { error: null };
    } catch (error) {
      const errorMessage = 'Error al actualizar la contraseña';
      logAuthEvent('Password Update Failed - Exception', false, error.message);
      debugLogger.error('Password update exception', { 
        error: error.message, 
        userId: this.currentUser?.id 
      });
      return { error: errorMessage };
    }
  }

  // ==================== DEVELOPMENT HELPERS ====================

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.USERS,
        this.STORAGE_KEYS.CURRENT_USER,
        this.STORAGE_KEYS.LAST_ACTIVE,
      ]);
      
      this.currentUser = null;
      console.log('🧹 All auth data cleared');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  async getStats(): Promise<{
    totalUsers: number;
    currentUser: string | null;
    lastActive: string | null;
  }> {
    const users = await this.getAllUsers();
    const lastActive = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_ACTIVE);
    
    return {
      totalUsers: users.length,
      currentUser: this.currentUser?.username || null,
      lastActive,
    };
  }
}

// Singleton instance
export const localAuthService = new LocalAuthService();
export default localAuthService;