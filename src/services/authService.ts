import { supabase, Profile } from './supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
  private currentUser: User | null = null;
  private currentProfile: Profile | null = null;

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    try {
      // Check current session
      const session = await this.getCurrentSession();
      if (session?.user) {
        this.currentUser = session.user;
        await this.loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing auth service:', error);
    }
  }

  // ==================== AUTHENTICATION ====================

  async signUp(email: string, password: string, username: string, fullName?: string): Promise<{
    user: User | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Create profile
        await this.createProfile(data.user.id, {
          username,
          email,
          full_name: fullName || null,
        });

        this.currentUser = data.user;
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }

  async signIn(email: string, password: string): Promise<{
    user: User | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      this.currentUser = data.user;
      
      // Load user profile
      if (data.user) {
        await this.loadUserProfile(data.user.id);
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        this.currentUser = null;
        this.currentProfile = null;
        await AsyncStorage.clear(); // Clear local data
      }

      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) return this.currentUser;

    const session = await this.getCurrentSession();
    this.currentUser = session?.user || null;
    return this.currentUser;
  }

  // ==================== PROFILE MANAGEMENT ====================

  private async createProfile(userId: string, data: {
    username: string;
    email: string;
    full_name: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        level: 1,
        xp: 0,
        streak: 0,
        study_goal_minutes: 30,
        total_study_time: 0,
        questions_answered: 0,
        correct_answers: 0,
        max_streak: 0,
        preferred_categories: [],
      });

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  async loadUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return null;
      }

      this.currentProfile = data;
      return data;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }

  async updateProfile(updates: Partial<Profile>): Promise<{ error: string | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      // Update local profile
      if (this.currentProfile) {
        this.currentProfile = { ...this.currentProfile, ...updates };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  getCurrentProfile(): Profile | null {
    return this.currentProfile;
  }

  // ==================== XP AND LEVELING ====================

  async addXP(amount: number, source: string = 'general'): Promise<{ 
    newLevel: number; 
    leveledUp: boolean; 
    newXP: number; 
  }> {
    const user = await this.getCurrentUser();
    const profile = this.getCurrentProfile();
    
    if (!user || !profile) {
      throw new Error('User not authenticated');
    }

    const newXP = profile.xp + amount;
    const newLevel = this.calculateLevel(newXP);
    const leveledUp = newLevel > profile.level;

    // Update profile
    await this.updateProfile({
      xp: newXP,
      level: newLevel,
    });

    // Record XP gain for analytics
    await this.recordXPGain(user.id, amount, source, newLevel, leveledUp);

    return { newLevel, leveledUp, newXP };
  }

  private calculateLevel(xp: number): number {
    // Exponential leveling curve
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  getXPRequiredForLevel(level: number): number {
    // Calculate XP required for a specific level
    return Math.pow(level - 1, 2) * 100;
  }

  private async recordXPGain(
    userId: string, 
    amount: number, 
    source: string, 
    newLevel: number, 
    leveledUp: boolean
  ): Promise<void> {
    // This would go to an analytics table
    console.log(`User ${userId} gained ${amount} XP from ${source}. Level: ${newLevel}${leveledUp ? ' (LEVEL UP!)' : ''}`);
  }

  // ==================== STREAK MANAGEMENT ====================

  async updateStreak(): Promise<{ streak: number; maxStreak: number }> {
    const user = await this.getCurrentUser();
    const profile = this.getCurrentProfile();
    
    if (!user || !profile) {
      throw new Error('User not authenticated');
    }

    const today = new Date().toDateString();
    const lastActiveDate = await AsyncStorage.getItem('@last_active_date');

    let newStreak = profile.streak;
    let newMaxStreak = profile.max_streak;

    if (lastActiveDate !== today) {
      // Check if it's consecutive day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActiveDate === yesterday.toDateString()) {
        // Consecutive day - increment streak
        newStreak += 1;
        newMaxStreak = Math.max(newMaxStreak, newStreak);
      } else if (lastActiveDate !== today) {
        // Streak broken - reset to 1
        newStreak = 1;
      }

      // Update profile
      await this.updateProfile({
        streak: newStreak,
        max_streak: newMaxStreak,
      });

      // Save today as last active date
      await AsyncStorage.setItem('@last_active_date', today);
    }

    return { streak: newStreak, maxStreak: newMaxStreak };
  }

  // ==================== STUDY GOALS ====================

  async updateStudyGoal(minutes: number): Promise<{ error: string | null }> {
    return await this.updateProfile({ study_goal_minutes: minutes });
  }

  async recordStudyTime(minutes: number): Promise<void> {
    const profile = this.getCurrentProfile();
    
    if (profile) {
      await this.updateProfile({
        total_study_time: profile.total_study_time + minutes,
      });
    }
  }

  async recordQuestionAnswered(correct: boolean): Promise<void> {
    const profile = this.getCurrentProfile();
    
    if (profile) {
      await this.updateProfile({
        questions_answered: profile.questions_answered + 1,
        correct_answers: profile.correct_answers + (correct ? 1 : 0),
      });
    }
  }

  // ==================== AUTH STATE LISTENER ====================

  setupAuthStateListener(callback: (user: User | null, profile: Profile | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          this.currentUser = session.user;
          const profile = await this.loadUserProfile(session.user.id);
          callback(session.user, profile);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.currentProfile = null;
          callback(null, null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }

  // ==================== PASSWORD RESET ====================

  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  // ==================== UTILITY METHODS ====================

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }
}

// Singleton instance
export const authService = new AuthService();
export default authService;