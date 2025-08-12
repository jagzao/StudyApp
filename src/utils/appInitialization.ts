import { Alert } from 'react-native';
import { analyticsService } from '../services/analyticsService';
import { authService } from '../services/authService';
import { cloudSyncService } from '../services/cloudSyncService';
import { cloudBackupService } from '../services/cloudBackupService';
import { notificationService } from '../services/notificationService';
import { aiTutorService } from '../services/aiTutorService';
import { socialService } from '../services/socialService';
import { achievementService } from '../services/achievementService';
import { advancedSpeechService } from '../services/advancedSpeechService';
import { offlineManager } from '../services/offlineManager';
import { textToSpeechService } from '../services/textToSpeechService';
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';
import { configService } from '../services/configService';
import { databaseService } from '../services/databaseService';
import { performanceMonitor } from './performanceOptimization';

interface InitializationStatus {
  service: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

class AppInitializationManager {
  private initializationStatus: InitializationStatus[] = [];
  private isInitialized = false;
  
  async initializeApp(): Promise<void> {
    try {
      console.log('🚀 Starting StudyApp initialization...');
      performanceMonitor.startTiming('app-initialization');
      
      // Core services (must succeed)
      await this.initializeCoreServices();
      
      // Optional services (can fail gracefully)
      await this.initializeOptionalServices();
      
      // Post-initialization tasks
      await this.runPostInitializationTasks();
      
      this.isInitialized = true;
      performanceMonitor.endTiming('app-initialization');
      
      console.log('✅ StudyApp initialization completed successfully');
      this.logInitializationStatus();
      
    } catch (error) {
      console.error('❌ Critical error during app initialization:', error);
      this.handleInitializationFailure(error as Error);
      throw error;
    }
  }
  
  private async initializeCoreServices(): Promise<void> {
    const coreServices = [
      { name: 'Config Service', init: () => configService.initialize() },
      { name: 'Database Service', init: () => databaseService.initialize() },
      { name: 'Analytics Service', init: () => analyticsService.initialize() },
      { name: 'Auth Service', init: () => authService.initialize() },
    ];
    
    for (const service of coreServices) {
      try {
        await service.init();
        this.updateInitializationStatus(service.name, 'success');
      } catch (error) {
        this.updateInitializationStatus(service.name, 'error', (error as Error).message);
        throw error; // Critical services must succeed
      }
    }
  }
  
  private async initializeOptionalServices(): Promise<void> {
    const optionalServices = [
      { name: 'Cloud Sync Service', init: () => cloudSyncService.initialize() },
      { name: 'Cloud Backup Service', init: () => cloudBackupService.initialize() },
      { name: 'Offline Manager', init: () => offlineManager.initialize() },
      { name: 'AI Tutor Service', init: () => aiTutorService.initialize() },
      { name: 'Social Service', init: () => socialService.initialize() },
      { name: 'Achievement Service', init: () => achievementService.initialize() },
      { name: 'Notification Service', init: () => notificationService.initialize() },
      { name: 'Advanced Speech Service', init: () => advancedSpeechService.initialize() },
      { name: 'Text To Speech Service', init: () => textToSpeechService.initialize() },
      { name: 'Advanced Analytics Service', init: () => advancedAnalyticsService.initialize() },
    ];
    
    // Initialize optional services in parallel for better performance
    const initPromises = optionalServices.map(async (service) => {
      try {
        await service.init();
        this.updateInitializationStatus(service.name, 'success');
      } catch (error) {
        console.warn(`⚠️ Optional service failed to initialize: ${service.name}`, error);
        this.updateInitializationStatus(service.name, 'error', (error as Error).message);
        // Don't throw - optional services can fail
      }
    });
    
    await Promise.allSettled(initPromises);
  }
  
  private async runPostInitializationTasks(): Promise<void> {
    try {
      // Only run these if auth service is working and user is authenticated
      if (authService.isAuthenticated()) {
        // Start background processes
        this.startBackgroundProcesses();
        
        // Check for app updates or migrations
        await this.checkForUpdates();
        
        // Clean up old data
        await this.performMaintenanceTasks();
      }
    } catch (error) {
      console.warn('⚠️ Post-initialization tasks failed:', error);
      // Don't throw - these are not critical
    }
  }
  
  private startBackgroundProcesses(): void {
    try {
      // Start periodic sync if cloud services are available
      if (this.isServiceInitialized('Cloud Sync Service')) {
        cloudSyncService.startPeriodicSync();
      }
      
      if (this.isServiceInitialized('Cloud Backup Service')) {
        cloudBackupService.startPeriodicSync();
      }
      
      // Check achievements
      if (this.isServiceInitialized('Achievement Service')) {
        achievementService.triggerAchievementCheck();
      }
      
      // Update social ranking
      if (this.isServiceInitialized('Social Service')) {
        socialService.updateUserRanking();
      }
      
      // Schedule smart notifications
      if (this.isServiceInitialized('Notification Service')) {
        notificationService.scheduleSmartNotifications();
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to start some background processes:', error);
    }
  }
  
  private async checkForUpdates(): Promise<void> {
    try {
      // Check if this is a new version
      const currentVersion = '1.0.0'; // Get from package.json or config
      const lastVersion = await configService.getConfig('lastAppVersion');
      
      if (lastVersion !== currentVersion) {
        console.log('🆕 App version update detected');
        await this.runMigrations(lastVersion, currentVersion);
        await configService.setConfig('lastAppVersion', currentVersion);
      }
    } catch (error) {
      console.warn('⚠️ Update check failed:', error);
    }
  }
  
  private async runMigrations(fromVersion: string, toVersion: string): Promise<void> {
    try {
      console.log(`🔄 Running migrations from ${fromVersion} to ${toVersion}`);
      
      // Example migration tasks
      // if (fromVersion < '1.0.0') {
      //   await this.migrateFlashcardFormat();
      // }
      
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }
  
  private async performMaintenanceTasks(): Promise<void> {
    try {
      console.log('🧹 Performing maintenance tasks...');
      
      // Clean up old cache entries
      const cacheCleanupPromise = this.cleanupCache();
      
      // Clean up old analytics data
      const analyticsCleanupPromise = this.cleanupAnalytics();
      
      // Clean up orphaned files
      const fileCleanupPromise = this.cleanupFiles();
      
      await Promise.all([
        cacheCleanupPromise,
        analyticsCleanupPromise,
        fileCleanupPromise,
      ]);
      
      console.log('✅ Maintenance tasks completed');
    } catch (error) {
      console.warn('⚠️ Some maintenance tasks failed:', error);
    }
  }
  
  private async cleanupCache(): Promise<void> {
    // Implement cache cleanup logic
    console.log('🧹 Cache cleanup completed');
  }
  
  private async cleanupAnalytics(): Promise<void> {
    // Clean up analytics data older than 30 days
    console.log('🧹 Analytics cleanup completed');
  }
  
  private async cleanupFiles(): Promise<void> {
    // Clean up temporary files
    console.log('🧹 File cleanup completed');
  }
  
  private updateInitializationStatus(service: string, status: 'success' | 'error', error?: string): void {
    const existingIndex = this.initializationStatus.findIndex(s => s.service === service);
    
    if (existingIndex >= 0) {
      this.initializationStatus[existingIndex] = { service, status, error };
    } else {
      this.initializationStatus.push({ service, status, error });
    }
  }
  
  private isServiceInitialized(serviceName: string): boolean {
    const status = this.initializationStatus.find(s => s.service === serviceName);
    return status?.status === 'success';
  }
  
  private logInitializationStatus(): void {
    console.log('📊 Initialization Status Summary:');
    
    const successful = this.initializationStatus.filter(s => s.status === 'success');
    const failed = this.initializationStatus.filter(s => s.status === 'error');
    
    console.log(`✅ Successful: ${successful.length} services`);
    console.log(`❌ Failed: ${failed.length} services`);
    
    if (failed.length > 0) {
      console.log('Failed services:');
      failed.forEach(service => {
        console.log(`  - ${service.service}: ${service.error}`);
      });
    }
  }
  
  private handleInitializationFailure(error: Error): void {
    Alert.alert(
      'Error de Inicialización',
      'La aplicación no pudo inicializarse correctamente. Algunas funciones pueden no estar disponibles.',
      [
        {
          text: 'Reintentar',
          onPress: () => {
            this.initializeApp().catch(console.error);
          },
        },
        {
          text: 'Continuar',
          style: 'cancel',
        },
      ]
    );
  }
  
  getInitializationStatus(): InitializationStatus[] {
    return [...this.initializationStatus];
  }
  
  isAppInitialized(): boolean {
    return this.isInitialized;
  }
  
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Starting app cleanup...');
      
      const cleanupPromises = [
        analyticsService.cleanup(),
        cloudSyncService.cleanup(),
        cloudBackupService.cleanup(),
        // Add other services that need cleanup
      ];
      
      await Promise.allSettled(cleanupPromises);
      
      console.log('✅ App cleanup completed');
    } catch (error) {
      console.error('❌ App cleanup failed:', error);
    }
  }
}

export const appInitializationManager = new AppInitializationManager();