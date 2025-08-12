import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './databaseService.platform';
import { authService } from './authService';
import { Flashcard } from '../types';

// ==================== SUPABASE CLOUD SYNC SERVICE ====================

interface SyncStatus {
  lastSync: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
  isOnline: boolean;
  hasConfig: boolean;
}

interface CloudBackup {
  id: string;
  userId: string;
  data: any;
  dataType: 'flashcards' | 'progress' | 'settings' | 'full_backup';
  createdAt: Date;
  size: number;
}

interface SyncConflict {
  localData: any;
  cloudData: any;
  field: string;
  lastModified: Date;
}

class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private isConfigured = false;
  private syncInProgress = false;

  async initialize(supabaseUrl?: string, supabaseKey?: string): Promise<void> {
    try {
      // Try to get config from storage if not provided
      if (!supabaseUrl || !supabaseKey) {
        const config = await this.getStoredConfig();
        if (config) {
          supabaseUrl = config.url;
          supabaseKey = config.key;
        }
      }

      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isConfigured = true;
        
        // Test connection
        await this.testConnection();
        
        console.log('☁️ Supabase Service initialized and connected');
      } else {
        console.log('⚠️ Supabase Service initialized but not configured - offline mode');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      this.isConfigured = false;
    }
  }

  private async getStoredConfig(): Promise<{ url: string; key: string } | null> {
    try {
      const config = await AsyncStorage.getItem('@supabase_config');
      return config ? JSON.parse(config) : null;
    } catch (error) {
      return null;
    }
  }

  async configure(supabaseUrl: string, supabaseKey: string): Promise<void> {
    try {
      // Store config securely
      await AsyncStorage.setItem('@supabase_config', JSON.stringify({
        url: supabaseUrl,
        key: supabaseKey
      }));

      // Initialize client
      await this.initialize(supabaseUrl, supabaseKey);
    } catch (error) {
      console.error('Failed to configure Supabase:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is okay
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  // ==================== USER MANAGEMENT ====================

  async signUp(email: string, password: string, userData?: any): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not configured');

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {}
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string): Promise<any> {
    if (!this.supabase) throw new Error('Supabase not configured');

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut(): Promise<void> {
    if (!this.supabase) return;

    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<any> {
    if (!this.supabase) return null;

    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  // ==================== DATA SYNCHRONIZATION ====================

  async syncData(): Promise<void> {
    if (!this.isConfigured || this.syncInProgress) return;

    this.syncInProgress = true;
    
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('No authenticated user for sync');
        return;
      }

      console.log('🔄 Starting data synchronization...');

      // Sync in order of priority
      await this.syncUserProfile();
      await this.syncFlashcards();
      await this.syncProgress();
      await this.syncSettings();

      await this.updateSyncStatus();

      console.log('✅ Data synchronization completed');
    } catch (error) {
      console.error('❌ Data synchronization failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncUserProfile(): Promise<void> {
    if (!this.supabase) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    const localProfile = authService.getCurrentProfile();
    
    try {
      // Try to get cloud profile
      const { data: cloudProfile, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Profile doesn't exist, create it
        const profileData = {
          user_id: user.id,
          email: user.email,
          ...localProfile,
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await this.supabase
          .from('user_profiles')
          .insert([profileData]);

        if (insertError) throw insertError;
      } else if (cloudProfile) {
        // Merge profiles (cloud takes precedence for conflicts)
        const mergedProfile = { ...localProfile, ...cloudProfile };
        await authService.updateProfile(mergedProfile);

        // Update cloud with any local changes
        const { error: updateError } = await this.supabase
          .from('user_profiles')
          .update({
            ...localProfile,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
    }
  }

  private async syncFlashcards(): Promise<void> {
    if (!this.supabase) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    try {
      const localFlashcards = await databaseService.getFlashcards();
      
      // Get cloud flashcards
      const { data: cloudFlashcards, error } = await this.supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const cloudFlashcardsMap = new Map(cloudFlashcards?.map(f => [f.id, f]) || []);

      // Upload new/updated local flashcards
      const toUpload: any[] = [];
      const toUpdate: any[] = [];

      for (const localCard of localFlashcards) {
        const cloudCard = cloudFlashcardsMap.get(localCard.id);
        
        if (!cloudCard) {
          // New card, upload it
          toUpload.push({
            ...localCard,
            user_id: user.id,
            synced_at: new Date().toISOString()
          });
        } else {
          // Check if local is newer
          const localDate = new Date(localCard.lastReviewed || localCard.createdAt);
          const cloudDate = new Date(cloudCard.last_reviewed || cloudCard.created_at);
          
          if (localDate > cloudDate) {
            toUpdate.push({
              ...localCard,
              user_id: user.id,
              synced_at: new Date().toISOString()
            });
          }
        }
      }

      // Batch upload new cards
      if (toUpload.length > 0) {
        const { error: insertError } = await this.supabase
          .from('flashcards')
          .insert(toUpload);
        
        if (insertError) throw insertError;
        console.log(`📤 Uploaded ${toUpload.length} new flashcards`);
      }

      // Batch update existing cards
      for (const card of toUpdate) {
        const { error: updateError } = await this.supabase
          .from('flashcards')
          .update(card)
          .eq('id', card.id);
        
        if (updateError) console.error(`Failed to update card ${card.id}:`, updateError);
      }

      if (toUpdate.length > 0) {
        console.log(`📤 Updated ${toUpdate.length} flashcards`);
      }

      // Download cloud cards that aren't local
      const localCardsMap = new Map(localFlashcards.map((f: any) => [f.id, f]));
      const toDownload = cloudFlashcards?.filter(c => !localCardsMap.has(c.id)) || [];

      for (const cloudCard of toDownload) {
        await databaseService.addFlashcard({
          ...cloudCard,
          lastReviewed: new Date(cloudCard.last_reviewed || cloudCard.created_at),
          createdAt: new Date(cloudCard.created_at)
        });
      }

      if (toDownload.length > 0) {
        console.log(`📥 Downloaded ${toDownload.length} flashcards from cloud`);
      }

    } catch (error) {
      console.error('Failed to sync flashcards:', error);
    }
  }

  private async syncProgress(): Promise<void> {
    if (!this.supabase) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    try {
      const analytics = await databaseService.getStudyAnalytics(90);
      
      const progressData = {
        user_id: user.id,
        total_questions: analytics.totalQuestions,
        correct_answers: analytics.correctAnswers,
        accuracy: analytics.accuracy,
        streak: analytics.streak,
        level: analytics.level,
        xp: analytics.xp,
        category_breakdown: analytics.categoryBreakdown,
        study_time_total: analytics.studyTimeTotal,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('user_progress')
        .upsert([progressData], { onConflict: 'user_id' });

      if (error) throw error;

      console.log('📤 Synced user progress to cloud');
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  }

  private async syncSettings(): Promise<void> {
    if (!this.supabase) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    try {
      const localSettings = await AsyncStorage.multiGet([
        '@app_config',
        '@tts_settings',
        '@gamification_stats'
      ]);

      const settingsData = {
        user_id: user.id,
        app_config: localSettings[0][1] ? JSON.parse(localSettings[0][1]) : {},
        tts_settings: localSettings[1][1] ? JSON.parse(localSettings[1][1]) : {},
        gamification_stats: localSettings[2][1] ? JSON.parse(localSettings[2][1]) : {},
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('user_settings')
        .upsert([settingsData], { onConflict: 'user_id' });

      if (error) throw error;

      console.log('📤 Synced settings to cloud');
    } catch (error) {
      console.error('Failed to sync settings:', error);
    }
  }

  // ==================== BACKUP & RESTORE ====================

  async createFullBackup(): Promise<string> {
    if (!this.isConfigured) throw new Error('Cloud sync not configured');

    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const backupData = {
        flashcards: await databaseService.getFlashcards(),
        analytics: await databaseService.getStudyAnalytics(365),
        settings: {
          appConfig: await AsyncStorage.getItem('@app_config'),
          ttsSettings: await AsyncStorage.getItem('@tts_settings'),
          gamificationStats: await AsyncStorage.getItem('@gamification_stats')
        },
        exportDate: new Date().toISOString()
      };

      const backupJson = JSON.stringify(backupData);
      const backupSize = new Blob([backupJson]).size;

      const { data, error } = await this.supabase!
        .from('backups')
        .insert([{
          user_id: user.id,
          data: backupData,
          data_type: 'full_backup',
          size: backupSize,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;

      console.log('✅ Full backup created successfully');
      return data[0].id;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  async getBackups(): Promise<CloudBackup[]> {
    if (!this.isConfigured) return [];

    const user = await this.getCurrentUser();
    if (!user) return [];

    try {
      const { data, error } = await this.supabase!
        .from('backups')
        .select('id, data_type, created_at, size')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map(backup => ({
        id: backup.id,
        userId: user.id,
        data: null, // Don't load full data for list
        dataType: backup.data_type,
        createdAt: new Date(backup.created_at),
        size: backup.size
      }));
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    if (!this.isConfigured) throw new Error('Cloud sync not configured');

    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await this.supabase!
        .from('backups')
        .select('data')
        .eq('id', backupId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const backupData = data.data;

      // Restore flashcards
      if (backupData.flashcards) {
        for (const card of backupData.flashcards) {
          await databaseService.addFlashcard(card);
        }
      }

      // Restore settings
      if (backupData.settings) {
        if (backupData.settings.appConfig) {
          await AsyncStorage.setItem('@app_config', backupData.settings.appConfig);
        }
        if (backupData.settings.ttsSettings) {
          await AsyncStorage.setItem('@tts_settings', backupData.settings.ttsSettings);
        }
        if (backupData.settings.gamificationStats) {
          await AsyncStorage.setItem('@gamification_stats', backupData.settings.gamificationStats);
        }
      }

      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  // ==================== UTILITIES ====================

  private async updateSyncStatus(): Promise<void> {
    const status: SyncStatus = {
      lastSync: new Date(),
      pendingUploads: 0,
      pendingDownloads: 0,
      isOnline: true,
      hasConfig: this.isConfigured
    };

    await AsyncStorage.setItem('@sync_status', JSON.stringify(status));
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const status = await AsyncStorage.getItem('@sync_status');
      if (status) {
        const parsed = JSON.parse(status);
        return {
          ...parsed,
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null
        };
      }
    } catch (error) {
      console.error('Failed to get sync status:', error);
    }

    return {
      lastSync: null,
      pendingUploads: 0,
      pendingDownloads: 0,
      isOnline: false,
      hasConfig: this.isConfigured
    };
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  async clearConfiguration(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@supabase_config');
      this.supabase = null;
      this.isConfigured = false;
      console.log('✅ Supabase configuration cleared');
    } catch (error) {
      console.error('Failed to clear configuration:', error);
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  subscribeToChanges(callback: (payload: any) => void): () => void {
    if (!this.supabase) return () => {};

    const subscription = this.supabase
      .channel('study_data_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public' }, 
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

// Singleton instance
export const supabaseService = new SupabaseService();
export default supabaseService;