import { supabase, FlashcardCloud, StudySession } from './supabaseClient';
import { authService } from './authService';
import { databaseService } from './databaseService.platform';
import { Flashcard } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface SyncStatus {
  lastSync: Date | null;
  pendingUploads: number;
  pendingDownloads: number;
  isOnline: boolean;
  isSyncing: boolean;
}

class CloudSyncService {
  private syncStatus: SyncStatus = {
    lastSync: null,
    pendingUploads: 0,
    pendingDownloads: 0,
    isOnline: true,
    isSyncing: false,
  };

  private syncQueue: Array<{
    action: 'upload' | 'download';
    type: 'flashcard' | 'session' | 'progress';
    data: any;
    timestamp: Date;
  }> = [];

  async initialize(): Promise<void> {
    // Setup network listener
    this.setupNetworkListener();
    
    // Load sync status from storage
    await this.loadSyncStatus();
    
    // Setup periodic sync
    this.setupPeriodicSync();

    console.log('🌩️ Cloud Sync Service initialized');
  }

  startPeriodicSync(): void {
    // Start periodic sync (every 5 minutes when online)
    this.setupPeriodicSync();
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
    console.log('🌩️ Cloud Sync Service cleaned up');
  }

  // ==================== NETWORK MANAGEMENT ====================

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.syncStatus.isOnline) {
        // Came back online - trigger sync
        this.triggerSync();
      }
    });
  }

  private async loadSyncStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@sync_status');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.syncStatus.lastSync = parsed.lastSync ? new Date(parsed.lastSync) : null;
        this.syncStatus.pendingUploads = parsed.pendingUploads || 0;
        this.syncStatus.pendingDownloads = parsed.pendingDownloads || 0;
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  private async saveSyncStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem('@sync_status', JSON.stringify({
        lastSync: this.syncStatus.lastSync?.toISOString(),
        pendingUploads: this.syncStatus.pendingUploads,
        pendingDownloads: this.syncStatus.pendingDownloads,
      }));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  // ==================== SYNC ORCHESTRATION ====================

  async triggerSync(force: boolean = false): Promise<void> {
    if (this.syncStatus.isSyncing && !force) {
      console.log('Sync already in progress');
      return;
    }

    if (!this.syncStatus.isOnline) {
      console.log('Offline - queueing sync for later');
      return;
    }

    if (!authService.isAuthenticated()) {
      console.log('Not authenticated - skipping sync');
      return;
    }

    this.syncStatus.isSyncing = true;

    try {
      console.log('🔄 Starting cloud sync...');

      // 1. Upload local changes
      await this.uploadLocalChanges();

      // 2. Download remote changes
      await this.downloadRemoteChanges();

      // 3. Resolve conflicts
      await this.resolveConflicts();

      // 4. Update sync status
      this.syncStatus.lastSync = new Date();
      this.syncStatus.pendingUploads = 0;
      this.syncStatus.pendingDownloads = 0;

      await this.saveSyncStatus();

      console.log('✅ Cloud sync completed successfully');
    } catch (error) {
      console.error('❌ Cloud sync failed:', error);
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  private setupPeriodicSync(): void {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.syncStatus.isOnline && authService.isAuthenticated()) {
        this.triggerSync();
      }
    }, 5 * 60 * 1000);
  }

  // ==================== FLASHCARDS SYNC ====================

  private async uploadLocalChanges(): Promise<void> {
    const userId = authService.getUserId();
    if (!userId) return;

    console.log('📤 Uploading local changes...');

    // Get local flashcards that need syncing
    const localCards = await databaseService.getFlashcards();
    
    for (const card of localCards) {
      await this.uploadFlashcard(userId, card);
    }

    // Upload study sessions
    await this.uploadStudySessions(userId);
  }

  private async uploadFlashcard(userId: string, flashcard: Flashcard): Promise<void> {
    try {
      const cloudCard: Partial<FlashcardCloud> = {
        user_id: userId,
        question: flashcard.question,
        answer: flashcard.answer,
        category: flashcard.category || 'General',
        difficulty: flashcard.difficulty || 'Beginner',
        tags: flashcard.tags || [],
        is_public: false, // Default to private
        times_seen: 0,
        times_correct: 0,
        difficulty_score: 0.5,
        source: 'local',
      };

      const { error } = await supabase
        .from('flashcards_cloud')
        .upsert(cloudCard);

      if (error) {
        console.error('Failed to upload flashcard:', error);
      }
    } catch (error) {
      console.error('Error uploading flashcard:', error);
    }
  }

  private async uploadStudySessions(userId: string): Promise<void> {
    try {
      // Get recent study sessions from analytics
      const analytics = await databaseService.getStudyAnalytics(7);
      
      const session: Partial<StudySession> = {
        user_id: userId,
        start_time: new Date().toISOString(),
        questions_answered: analytics.totalQuestions,
        correct_answers: Math.floor(analytics.totalQuestions * (analytics.accuracy / 100)),
        xp_gained: analytics.totalQuestions * 10,
        session_type: 'flashcard',
        categories_studied: analytics.categoryBreakdown.map((c: any) => c.category),
      };

      const { error } = await supabase
        .from('study_sessions')
        .insert(session);

      if (error && !error.message.includes('duplicate')) {
        console.error('Failed to upload study session:', error);
      }
    } catch (error) {
      console.error('Error uploading study sessions:', error);
    }
  }

  // ==================== DOWNLOAD FROM CLOUD ====================

  private async downloadRemoteChanges(): Promise<void> {
    const userId = authService.getUserId();
    if (!userId) return;

    console.log('📥 Downloading remote changes...');

    // Download user's cloud flashcards
    await this.downloadCloudFlashcards(userId);
    
    // Download public flashcards from community
    await this.downloadPublicFlashcards();
  }

  private async downloadCloudFlashcards(userId: string): Promise<void> {
    try {
      const { data: cloudCards, error } = await supabase
        .from('flashcards_cloud')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to download cloud flashcards:', error);
        return;
      }

      // Convert cloud cards to local format and add to database
      for (const cloudCard of cloudCards || []) {
        const localCard: Omit<Flashcard, 'id'> = {
          question: cloudCard.question,
          answer: cloudCard.answer,
          category: cloudCard.category,
          difficulty: cloudCard.difficulty,
          tags: cloudCard.tags,
          createdAt: new Date(cloudCard.created_at),
          updatedAt: new Date(cloudCard.updated_at),
        };

        // Check if card already exists locally
        const existingCards = await databaseService.getFlashcards();
        const exists = existingCards.some((card: any) => 
          card.question === localCard.question && card.answer === localCard.answer
        );

        if (!exists) {
          await databaseService.addFlashcard(localCard);
        }
      }
    } catch (error) {
      console.error('Error downloading cloud flashcards:', error);
    }
  }

  private async downloadPublicFlashcards(): Promise<void> {
    try {
      // Download high-quality public flashcards
      const { data: publicCards, error } = await supabase
        .from('flashcards_cloud')
        .select('*')
        .eq('is_public', true)
        .gte('upvotes', 5) // Only high-quality cards
        .order('upvotes', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to download public flashcards:', error);
        return;
      }

      // Add to question bank
      const questions = (publicCards || []).map(card => ({
        question: card.question,
        answer: card.answer,
        category: card.category,
        difficulty: card.difficulty,
        technology: card.category,
        questionType: 'technical' as const,
        source: 'community',
      }));

      await databaseService.addQuestionsToBank(questions);
    } catch (error) {
      console.error('Error downloading public flashcards:', error);
    }
  }

  // ==================== CONFLICT RESOLUTION ====================

  private async resolveConflicts(): Promise<void> {
    // Simple conflict resolution: cloud wins for now
    // In a more sophisticated system, you'd have timestamp comparison,
    // merge strategies, or user choice
    console.log('🔍 Checking for conflicts...');
    
    // For now, we'll just log that this step exists
    // Future implementation would handle:
    // - Same flashcard modified locally and remotely
    // - Deleted locally but updated remotely
    // - Created with same content in both places
  }

  // ==================== PUBLIC API ====================

  async enableOfflineMode(): Promise<void> {
    // Cache essential data for offline use
    const userId = authService.getUserId();
    if (!userId) return;

    try {
      // Cache user profile
      const profile = authService.getCurrentProfile();
      if (profile) {
        await AsyncStorage.setItem('@cached_profile', JSON.stringify(profile));
      }

      // Cache top questions for offline study
      const questions = await databaseService.getQuestionsFromBank({
        limit: 100
      });
      await AsyncStorage.setItem('@cached_questions', JSON.stringify(questions));

      console.log('📦 Offline mode data cached successfully');
    } catch (error) {
      console.error('Failed to cache offline data:', error);
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async forceSyncNow(): Promise<void> {
    await this.triggerSync(true);
  }

  // ==================== COMMUNITY FEATURES ====================

  async publishFlashcard(flashcardId: number): Promise<{ error: string | null }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { error: 'User not authenticated' };
      }

      // Get local flashcard
      const localCards = await databaseService.getFlashcards();
      const card = localCards.find((c: any) => c.id === flashcardId);
      
      if (!card) {
        return { error: 'Flashcard not found' };
      }

      // Upload as public
      const { error } = await supabase
        .from('flashcards_cloud')
        .upsert({
          user_id: userId,
          question: card.question,
          answer: card.answer,
          category: card.category || 'General',
          difficulty: card.difficulty || 'Beginner',
          tags: card.tags || [],
          is_public: true,
          source: 'user_published',
        });

      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async upvoteFlashcard(cloudCardId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.rpc('increment_upvotes', {
        card_id: cloudCardId
      });

      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async searchCommunityFlashcards(query: string, category?: string): Promise<FlashcardCloud[]> {
    try {
      let queryBuilder = supabase
        .from('flashcards_cloud')
        .select('*')
        .eq('is_public', true)
        .gte('upvotes', 1)
        .ilike('question', `%${query}%`);

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }

      const { data, error } = await queryBuilder
        .order('upvotes', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to search community flashcards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error searching community flashcards:', error);
      return [];
    }
  }

  // ==================== BACKUP & RESTORE ====================

  async createBackup(): Promise<{ backupId: string; error: string | null }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { backupId: '', error: 'User not authenticated' };
      }

      // Get all local data
      const flashcards = await databaseService.getFlashcards();
      const analytics = await databaseService.getStudyAnalytics(365); // Full year
      const profile = authService.getCurrentProfile();

      const backup = {
        user_id: userId,
        created_at: new Date().toISOString(),
        flashcards,
        analytics,
        profile,
        version: '1.0',
      };

      // Store backup in Supabase Storage
      const backupId = `backup_${userId}_${Date.now()}`;
      const { error } = await supabase.storage
        .from('backups')
        .upload(`${userId}/${backupId}.json`, JSON.stringify(backup));

      return { 
        backupId: error ? '' : backupId, 
        error: error?.message || null 
      };
    } catch (error) {
      return { backupId: '', error: (error as Error).message };
    }
  }

  async restoreFromBackup(backupId: string): Promise<{ error: string | null }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { error: 'User not authenticated' };
      }

      // Download backup
      const { data, error } = await supabase.storage
        .from('backups')
        .download(`${userId}/${backupId}.json`);

      if (error) {
        return { error: error.message };
      }

      const backupText = await data.text();
      const backup = JSON.parse(backupText);

      // Restore flashcards
      for (const card of backup.flashcards) {
        await databaseService.addFlashcard({
          question: card.question,
          answer: card.answer,
          category: card.category,
          difficulty: card.difficulty,
          tags: card.tags,
        });
      }

      console.log('✅ Backup restored successfully');
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
}

// Singleton instance
export const cloudSyncService = new CloudSyncService();
export default cloudSyncService;