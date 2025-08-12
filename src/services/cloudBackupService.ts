import { configService } from './configService';
import { databaseService } from './databaseService';
import { authService } from './authService';
import { performanceCache } from '../utils/performanceOptimization';
import { Flashcard, StudyProgress, UserProfile } from '../types';

export interface BackupData {
  version: string;
  timestamp: number;
  userId?: string;
  flashcards: Flashcard[];
  studyProgress: StudyProgress[];
  userProfile: UserProfile;
  settings: Record<string, any>;
}

export interface SyncStatus {
  lastSync: number;
  isOnline: boolean;
  needsSync: boolean;
  syncInProgress: boolean;
}

class CloudBackupService {
  private apiUrl = 'https://api.supabase.co';
  private syncInProgress = false;
  private syncTimer: NodeJS.Timeout | null = null;
  
  async initialize(): Promise<void> {
    try {
      console.log('🌥️ Initializing cloud backup service...');
      
      // Check if we have cloud credentials
      const hasCredentials = await this.hasValidCredentials();
      
      if (hasCredentials) {
        // Start periodic sync
        this.startPeriodicSync();
        console.log('✅ Cloud backup service initialized with sync enabled');
      } else {
        console.log('⚠️ Cloud backup service initialized without credentials - manual sync only');
      }
    } catch (error) {
      console.error('❌ Failed to initialize cloud backup service:', error);
    }
  }
  
  private async hasValidCredentials(): Promise<boolean> {
    try {
      const supabaseUrl = await configService.getConfig('SUPABASE_URL');
      const supabaseKey = await configService.getConfig('SUPABASE_ANON_KEY');
      
      return !!(supabaseUrl && supabaseKey);
    } catch {
      return false;
    }
  }
  
  async createBackup(): Promise<BackupData> {
    try {
      console.log('📦 Creating backup...');
      
      const [flashcards, studyProgress, userProfile, settings] = await Promise.all([
        databaseService.getFlashcards(),
        databaseService.getStudyProgress(),
        this.getUserProfile(),
        this.getSettings(),
      ]);
      
      const backup: BackupData = {
        version: '1.0.0',
        timestamp: Date.now(),
        userId: authService.getCurrentUserId(),
        flashcards,
        studyProgress,
        userProfile,
        settings,
      };
      
      console.log(`✅ Backup created with ${flashcards.length} flashcards`);
      return backup;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error('Failed to create backup');
    }
  }
  
  async uploadBackup(backup: BackupData, cloudProvider: 'supabase' | 'firebase' = 'supabase'): Promise<string> {
    try {
      console.log(`🚀 Uploading backup to ${cloudProvider}...`);
      
      if (cloudProvider === 'supabase') {
        return await this.uploadToSupabase(backup);
      } else {
        throw new Error('Firebase provider not implemented yet');
      }
    } catch (error) {
      console.error('❌ Failed to upload backup:', error);
      throw error;
    }
  }
  
  private async uploadToSupabase(backup: BackupData): Promise<string> {
    const supabaseUrl = await configService.getConfig('SUPABASE_URL');
    const supabaseKey = await configService.getConfig('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/backups`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: backup.userId,
        data: backup,
        created_at: new Date(backup.timestamp).toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Supabase upload failed: ${response.statusText}`);
    }
    
    console.log('✅ Backup uploaded to Supabase successfully');
    return 'supabase-backup-id';
  }
  
  async downloadBackup(backupId: string, cloudProvider: 'supabase' | 'firebase' = 'supabase'): Promise<BackupData> {
    try {
      console.log(`📥 Downloading backup from ${cloudProvider}...`);
      
      if (cloudProvider === 'supabase') {
        return await this.downloadFromSupabase(backupId);
      } else {
        throw new Error('Firebase provider not implemented yet');
      }
    } catch (error) {
      console.error('❌ Failed to download backup:', error);
      throw error;
    }
  }
  
  private async downloadFromSupabase(backupId: string): Promise<BackupData> {
    const supabaseUrl = await configService.getConfig('SUPABASE_URL');
    const supabaseKey = await configService.getConfig('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const userId = authService.getCurrentUserId();
    const response = await fetch(
      `${supabaseUrl}/rest/v1/backups?user_id=eq.${userId}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Supabase download failed: ${response.statusText}`);
    }
    
    const backups = await response.json();
    
    if (!backups || backups.length === 0) {
      throw new Error('No backup found');
    }
    
    console.log('✅ Backup downloaded from Supabase successfully');
    return backups[0].data as BackupData;
  }
  
  async restoreBackup(backup: BackupData): Promise<void> {
    try {
      console.log('🔄 Restoring backup...');
      
      // Validate backup data
      if (!backup || !backup.flashcards) {
        throw new Error('Invalid backup data');
      }
      
      // Clear existing data (optional - could merge instead)
      const shouldClearExisting = await this.confirmClearExistingData();
      
      if (shouldClearExisting) {
        await this.clearExistingData();
      }
      
      // Restore flashcards
      for (const flashcard of backup.flashcards) {
        await databaseService.addFlashcard({
          question: flashcard.question,
          answer: flashcard.answer,
          category: flashcard.category,
          difficulty: flashcard.difficulty,
          tags: flashcard.tags || [],
        });
      }
      
      // Restore study progress
      if (backup.studyProgress) {
        for (const progress of backup.studyProgress) {
          await databaseService.updateStudyProgress(progress);
        }
      }
      
      // Restore settings
      if (backup.settings) {
        await this.restoreSettings(backup.settings);
      }
      
      console.log(`✅ Backup restored successfully with ${backup.flashcards.length} flashcards`);
    } catch (error) {
      console.error('❌ Failed to restore backup:', error);
      throw error;
    }
  }
  
  async syncWithCloud(): Promise<void> {
    if (this.syncInProgress) {
      console.log('⚠️ Sync already in progress, skipping...');
      return;
    }
    
    try {
      this.syncInProgress = true;
      console.log('🔄 Starting cloud sync...');
      
      // Check if we're online
      const isOnline = await this.checkInternetConnection();
      if (!isOnline) {
        console.log('⚠️ Device is offline, skipping sync');
        return;
      }
      
      // Get local and remote timestamps
      const lastLocalChange = await this.getLastLocalChangeTimestamp();
      const lastRemoteSync = await this.getLastRemoteSyncTimestamp();
      
      if (lastLocalChange > lastRemoteSync) {
        // Local changes are newer, upload backup
        console.log('📤 Local changes detected, uploading...');
        const backup = await this.createBackup();
        await this.uploadBackup(backup);
        await this.setLastRemoteSyncTimestamp(Date.now());
      } else {
        // Check for remote changes
        console.log('📥 Checking for remote changes...');
        try {
          const remoteBackup = await this.downloadBackup('latest');
          
          if (remoteBackup.timestamp > lastLocalChange) {
            console.log('🔄 Remote changes detected, downloading...');
            await this.restoreBackup(remoteBackup);
            await this.setLastLocalChangeTimestamp(remoteBackup.timestamp);
          }
        } catch (error) {
          console.log('ℹ️ No remote backup found or error downloading');
        }
      }
      
      console.log('✅ Cloud sync completed successfully');
    } catch (error) {
      console.error('❌ Cloud sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }
  
  startPeriodicSync(intervalMinutes: number = 15): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      this.syncWithCloud().catch(error => {
        console.error('Periodic sync failed:', error);
      });
    }, intervalMinutes * 60 * 1000);
    
    console.log(`🕐 Periodic sync started (every ${intervalMinutes} minutes)`);
  }
  
  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏹️ Periodic sync stopped');
    }
  }
  
  async getSyncStatus(): Promise<SyncStatus> {
    const isOnline = await this.checkInternetConnection();
    const lastSync = await this.getLastRemoteSyncTimestamp();
    const lastChange = await this.getLastLocalChangeTimestamp();
    
    return {
      lastSync,
      isOnline,
      needsSync: lastChange > lastSync,
      syncInProgress: this.syncInProgress,
    };
  }
  
  async listBackups(): Promise<Array<{ id: string; timestamp: number; size: number }>> {
    try {
      const supabaseUrl = await configService.getConfig('SUPABASE_URL');
      const supabaseKey = await configService.getConfig('SUPABASE_ANON_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        return [];
      }
      
      const userId = authService.getCurrentUserId();
      const response = await fetch(
        `${supabaseUrl}/rest/v1/backups?user_id=eq.${userId}&select=id,created_at,data&order=created_at.desc`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const backups = await response.json();
      
      return backups.map((backup: any) => ({
        id: backup.id,
        timestamp: new Date(backup.created_at).getTime(),
        size: JSON.stringify(backup.data).length,
      }));
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
  
  private async checkInternetConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  private async getUserProfile(): Promise<UserProfile> {
    // Get user profile from local storage or create default
    return {
      name: 'User',
      email: '',
      studyStreak: 0,
      totalStudyTime: 0,
      preferences: {
        language: 'es',
        notifications: true,
        autoSpeak: false,
      },
    };
  }
  
  private async getSettings(): Promise<Record<string, any>> {
    return {
      theme: 'dark',
      language: 'es',
      autoSync: true,
      notifications: true,
    };
  }
  
  private async restoreSettings(settings: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await configService.setConfig(key, value);
    }
  }
  
  private async confirmClearExistingData(): Promise<boolean> {
    // In a real app, this would show a confirmation dialog
    // For now, return false to merge data instead of replacing
    return false;
  }
  
  private async clearExistingData(): Promise<void> {
    // Clear all flashcards and progress
    const flashcards = await databaseService.getFlashcards();
    for (const card of flashcards) {
      await databaseService.deleteFlashcard(card.id);
    }
  }
  
  private async getLastLocalChangeTimestamp(): Promise<number> {
    const cached = performanceCache.get('lastLocalChange');
    if (cached) return cached;
    
    // Get from database or storage
    const timestamp = await configService.getConfig('lastLocalChange') || 0;
    performanceCache.set('lastLocalChange', timestamp, 60000); // 1 minute cache
    return timestamp;
  }
  
  private async setLastLocalChangeTimestamp(timestamp: number): Promise<void> {
    await configService.setConfig('lastLocalChange', timestamp);
    performanceCache.set('lastLocalChange', timestamp, 60000);
  }
  
  private async getLastRemoteSyncTimestamp(): Promise<number> {
    const cached = performanceCache.get('lastRemoteSync');
    if (cached) return cached;
    
    const timestamp = await configService.getConfig('lastRemoteSync') || 0;
    performanceCache.set('lastRemoteSync', timestamp, 60000);
    return timestamp;
  }
  
  private async setLastRemoteSyncTimestamp(timestamp: number): Promise<void> {
    await configService.setConfig('lastRemoteSync', timestamp);
    performanceCache.set('lastRemoteSync', timestamp, 60000);
  }
  
  async cleanup(): Promise<void> {
    this.stopPeriodicSync();
    console.log('🧹 Cloud backup service cleaned up');
  }
}

export const cloudBackupService = new CloudBackupService();