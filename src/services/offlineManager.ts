import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { databaseService } from './databaseService.platform';
import { cloudSyncService } from './cloudSyncService';
import { authService } from './authService';
import { Flashcard } from '../types';

interface OfflineData {
  essentialQuestions: Flashcard[];
  userProfile: any;
  studyAnalytics: any;
  cachedImages: Record<string, string>;
  syncQueue: OfflineAction[];
  lastSync: Date;
}

interface OfflineAction {
  id: string;
  type: 'create_flashcard' | 'update_flashcard' | 'delete_flashcard' | 'record_study' | 'update_profile';
  data: any;
  timestamp: Date;
  synced: boolean;
  retryCount: number;
}

interface NetworkStatus {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

class OfflineManager {
  private isOfflineMode = false;
  private networkStatus: NetworkStatus = {
    isConnected: true,
    type: null,
    isInternetReachable: null,
  };
  private offlineData: OfflineData | null = null;
  private syncQueue: OfflineAction[] = [];
  private networkListeners: Array<(status: NetworkStatus) => void> = [];

  async initialize(): Promise<void> {
    try {
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      // Load offline data
      await this.loadOfflineData();
      
      // Load sync queue
      await this.loadSyncQueue();
      
      // Check initial network status
      const netInfo = await NetInfo.fetch();
      this.updateNetworkStatus(netInfo);

      console.log('📱 Offline Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Offline Manager:', error);
    }
  }

  // ==================== NETWORK MONITORING ====================

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.networkStatus.isConnected;
      this.updateNetworkStatus(state);
      
      if (!wasOnline && this.networkStatus.isConnected) {
        // Came back online
        this.handleConnectivityRestored();
      } else if (wasOnline && !this.networkStatus.isConnected) {
        // Went offline
        this.handleConnectivityLost();
      }
    });
  }

  private updateNetworkStatus(netInfo: any): void {
    this.networkStatus = {
      isConnected: netInfo.isConnected ?? false,
      type: netInfo.type,
      isInternetReachable: netInfo.isInternetReachable,
    };

    // Notify listeners
    this.networkListeners.forEach(listener => {
      listener(this.networkStatus);
    });
  }

  private async handleConnectivityLost(): Promise<void> {
    console.log('🔌 Connection lost - switching to offline mode');
    
    this.isOfflineMode = true;
    
    // Cache essential data for offline use
    await this.cacheEssentialData();
    
    // Show offline notification
    this.notifyOfflineMode();
  }

  private async handleConnectivityRestored(): Promise<void> {
    console.log('🌐 Connection restored - syncing offline changes');
    
    this.isOfflineMode = false;
    
    try {
      // Sync queued actions
      await this.syncOfflineActions();
      
      // Trigger cloud sync
      await cloudSyncService.triggerSync();
      
      // Show sync success notification
      this.notifySyncComplete();
    } catch (error) {
      console.error('Failed to sync offline changes:', error);
      this.notifySyncError();
    }
  }

  // ==================== OFFLINE DATA CACHING ====================

  async cacheEssentialData(): Promise<void> {
    try {
      console.log('💾 Caching essential data for offline use...');
      
      // Get user's most important flashcards
      const essentialQuestions = await this.selectEssentialQuestions();
      
      // Get user profile
      const userProfile = authService.getCurrentProfile();
      
      // Get recent analytics
      const studyAnalytics = await databaseService.getStudyAnalytics(30);
      
      // Cache images/assets (placeholder)
      const cachedImages: Record<string, string> = {};
      
      const offlineData: OfflineData = {
        essentialQuestions,
        userProfile,
        studyAnalytics,
        cachedImages,
        syncQueue: this.syncQueue,
        lastSync: new Date(),
      };

      await AsyncStorage.setItem('@offline_data', JSON.stringify(offlineData));
      this.offlineData = offlineData;
      
      console.log(`✅ Cached ${essentialQuestions.length} essential questions for offline study`);
    } catch (error) {
      console.error('Failed to cache essential data:', error);
    }
  }

  private async selectEssentialQuestions(): Promise<Flashcard[]> {
    try {
      // Get user's recent analytics to identify important questions
      const analytics = await databaseService.getStudyAnalytics(30);
      
      // Priority 1: Questions from weak areas (need more practice)
      const weakCategories = analytics.categoryBreakdown
        .filter((cat: any) => cat.accuracy < 70)
        .map((cat: any) => cat.category);
      
      let essentialQuestions: Flashcard[] = [];
      
      // Get questions from weak categories
      for (const category of weakCategories.slice(0, 3)) {
        const categoryQuestions = await databaseService.getFlashcards({ 
          category, 
          limit: 20 
        });
        essentialQuestions.push(...categoryQuestions);
      }
      
      // Priority 2: Recently studied questions (for review)
      const recentQuestions = await databaseService.getFlashcards({ limit: 30 });
      essentialQuestions.push(...recentQuestions);
      
      // Priority 3: High-quality questions from question bank
      const bankQuestions = await databaseService.getQuestionsFromBank({ 
        limit: 50 
      });
      essentialQuestions.push(...bankQuestions);
      
      // Remove duplicates and limit to reasonable number
      const uniqueQuestions = essentialQuestions.filter((question, index, self) =>
        index === self.findIndex(q => q.question === question.question)
      );
      
      return uniqueQuestions.slice(0, 200); // Limit to 200 questions
    } catch (error) {
      console.error('Error selecting essential questions:', error);
      
      // Fallback: get any available questions
      return await databaseService.getFlashcards({ limit: 100 });
    }
  }

  private async loadOfflineData(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@offline_data');
      if (saved) {
        this.offlineData = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }

  // ==================== OFFLINE ACTIONS QUEUE ====================

  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced' | 'retryCount'>): Promise<void> {
    const offlineAction: OfflineAction = {
      ...action,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      synced: false,
      retryCount: 0,
    };

    this.syncQueue.push(offlineAction);
    await this.saveSyncQueue();

    console.log(`📤 Queued offline action: ${action.type}`);
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@sync_queue');
      if (saved) {
        this.syncQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('@sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private async syncOfflineActions(): Promise<void> {
    if (this.syncQueue.length === 0) {
      return;
    }

    console.log(`🔄 Syncing ${this.syncQueue.length} offline actions...`);
    
    const unsyncedActions = this.syncQueue.filter(action => !action.synced);
    
    for (const action of unsyncedActions) {
      try {
        await this.executeOfflineAction(action);
        action.synced = true;
        action.retryCount = 0;
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        action.retryCount += 1;
        
        // Remove actions that have failed too many times
        if (action.retryCount > 5) {
          console.log(`Removing failed action ${action.id} after ${action.retryCount} retries`);
          this.syncQueue = this.syncQueue.filter(a => a.id !== action.id);
        }
      }
    }

    // Remove synced actions
    this.syncQueue = this.syncQueue.filter(action => !action.synced);
    
    await this.saveSyncQueue();
    
    console.log(`✅ Sync complete. ${this.syncQueue.length} actions remaining in queue`);
  }

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'create_flashcard':
        await databaseService.addFlashcard(action.data);
        break;
        
      case 'update_flashcard':
        await databaseService.updateFlashcard(action.data.id, action.data.updates);
        break;
        
      case 'delete_flashcard':
        await databaseService.deleteFlashcard(action.data.id);
        break;
        
      case 'record_study':
        await databaseService.recordQuestionAttempt(action.data.questionId, action.data.correct);
        break;
        
      case 'update_profile':
        await authService.updateProfile(action.data.updates);
        break;
        
      default:
        console.warn(`Unknown offline action type: ${action.type}`);
    }
  }

  // ==================== OFFLINE STUDY MODE ====================

  async getOfflineFlashcards(filters?: {
    category?: string;
    difficulty?: string;
    limit?: number;
  }): Promise<Flashcard[]> {
    if (!this.offlineData) {
      // Try to load from cache
      await this.loadOfflineData();
    }

    if (!this.offlineData) {
      return [];
    }

    let questions = this.offlineData.essentialQuestions;

    // Apply filters
    if (filters?.category) {
      questions = questions.filter(q => q.category === filters.category);
    }

    if (filters?.difficulty) {
      questions = questions.filter(q => q.difficulty === filters.difficulty);
    }

    if (filters?.limit) {
      questions = questions.slice(0, filters.limit);
    }

    return questions;
  }

  async addFlashcardOffline(flashcard: Omit<Flashcard, 'id'>): Promise<void> {
    // Add to local database
    const id = await databaseService.addFlashcard(flashcard);
    
    // Queue for sync when online
    await this.queueOfflineAction({
      type: 'create_flashcard',
      data: { ...flashcard, id },
    });
  }

  async updateFlashcardOffline(id: number, updates: Partial<Flashcard>): Promise<void> {
    // Update in local database
    await databaseService.updateFlashcard(id, updates);
    
    // Queue for sync when online
    await this.queueOfflineAction({
      type: 'update_flashcard',
      data: { id, updates },
    });
  }

  async recordStudyOffline(questionId: number, correct: boolean): Promise<void> {
    // Record in local database
    await databaseService.recordQuestionAttempt(questionId, correct);
    
    // Queue for sync when online
    await this.queueOfflineAction({
      type: 'record_study',
      data: { questionId, correct },
    });
  }

  // ==================== OFFLINE CAPABILITIES ====================

  getOfflineCapabilities(): {
    canStudyFlashcards: boolean;
    canCreateFlashcards: boolean;
    canViewAnalytics: boolean;
    canUseVoiceCommands: boolean;
    cachedQuestionsCount: number;
    lastCacheUpdate: Date | null;
  } {
    const hasOfflineData = this.offlineData !== null;
    
    return {
      canStudyFlashcards: hasOfflineData,
      canCreateFlashcards: true, // Always available with local storage
      canViewAnalytics: hasOfflineData,
      canUseVoiceCommands: true, // Works offline
      cachedQuestionsCount: this.offlineData?.essentialQuestions.length || 0,
      lastCacheUpdate: this.offlineData?.lastSync || null,
    };
  }

  async getOfflineAnalytics(): Promise<any> {
    if (this.offlineData?.studyAnalytics) {
      return this.offlineData.studyAnalytics;
    }

    // Fallback to local database analytics
    return await databaseService.getStudyAnalytics(30);
  }

  // ==================== STORAGE MANAGEMENT ====================

  async getOfflineStorageUsage(): Promise<{
    totalSize: number;
    breakdown: {
      flashcards: number;
      analytics: number;
      images: number;
      syncQueue: number;
    };
    availableSpace: number;
  }> {
    try {
      // Calculate storage usage (simplified)
      const offlineDataSize = this.offlineData 
        ? JSON.stringify(this.offlineData).length 
        : 0;
      
      const syncQueueSize = JSON.stringify(this.syncQueue).length;
      
      return {
        totalSize: offlineDataSize + syncQueueSize,
        breakdown: {
          flashcards: Math.floor(offlineDataSize * 0.7),
          analytics: Math.floor(offlineDataSize * 0.2),
          images: Math.floor(offlineDataSize * 0.05),
          syncQueue: syncQueueSize,
        },
        availableSpace: 50 * 1024 * 1024, // Assume 50MB available
      };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return {
        totalSize: 0,
        breakdown: { flashcards: 0, analytics: 0, images: 0, syncQueue: 0 },
        availableSpace: 0,
      };
    }
  }

  async clearOfflineCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@offline_data');
      this.offlineData = null;
      
      console.log('🗑️ Offline cache cleared');
    } catch (error) {
      console.error('Failed to clear offline cache:', error);
    }
  }

  // ==================== NETWORK STATUS API ====================

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  isOnline(): boolean {
    return this.networkStatus.isConnected && this.networkStatus.isInternetReachable !== false;
  }

  isOffline(): boolean {
    return !this.isOnline();
  }

  addNetworkListener(listener: (status: NetworkStatus) => void): () => void {
    this.networkListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.networkListeners = this.networkListeners.filter(l => l !== listener);
    };
  }

  // ==================== SMART SYNC ====================

  async smartSync(): Promise<void> {
    if (!this.isOnline()) {
      console.log('Cannot sync - device is offline');
      return;
    }

    // Check network quality and adjust sync strategy
    const networkType = this.networkStatus.type;
    
    if (networkType === 'wifi') {
      // Full sync on WiFi
      await this.syncOfflineActions();
      await cloudSyncService.triggerSync();
      await this.cacheEssentialData();
    } else if (networkType === 'cellular') {
      // Priority sync on cellular
      await this.syncCriticalActions();
    }
  }

  private async syncCriticalActions(): Promise<void> {
    // Sync only critical actions to save data
    const criticalActions = this.syncQueue.filter(action => 
      action.type === 'record_study' || action.type === 'update_profile'
    );

    for (const action of criticalActions) {
      try {
        await this.executeOfflineAction(action);
        action.synced = true;
      } catch (error) {
        console.error('Failed to sync critical action:', error);
      }
    }

    await this.saveSyncQueue();
  }

  // ==================== NOTIFICATIONS ====================

  private notifyOfflineMode(): void {
    console.log('📱 App is now in offline mode. Limited features available.');
    // You could show a toast or update UI state here
  }

  private notifySyncComplete(): void {
    console.log('✅ Offline changes synced successfully');
    // Show success notification
  }

  private notifySyncError(): void {
    console.log('❌ Failed to sync some offline changes');
    // Show error notification with retry option
  }

  // ==================== UTILITY METHODS ====================

  getPendingSyncActions(): OfflineAction[] {
    return this.syncQueue.filter(action => !action.synced);
  }

  async forceCacheUpdate(): Promise<void> {
    await this.cacheEssentialData();
  }

  getOfflineStats(): {
    isOfflineMode: boolean;
    pendingActions: number;
    lastSync: Date | null;
    cachedQuestions: number;
  } {
    return {
      isOfflineMode: this.isOfflineMode,
      pendingActions: this.getPendingSyncActions().length,
      lastSync: this.offlineData?.lastSync || null,
      cachedQuestions: this.offlineData?.essentialQuestions.length || 0,
    };
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();
export default offlineManager;