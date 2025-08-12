import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppConfig {
  openaiApiKey?: string;
  hasCompletedOnboarding?: boolean;
  preferredLanguage?: string;
  voiceEnabled?: boolean;
  notificationsEnabled?: boolean;
  studyRemindersEnabled?: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  firebaseEnabled?: boolean;
}

class ConfigService {
  private config: AppConfig = {};
  private isInitialized = false;

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      this.isInitialized = true;
      console.log('✅ Config service initialized');
    } catch (error) {
      console.error('❌ Config service initialization failed:', error);
      throw error;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@app_config');
      if (stored) {
        this.config = JSON.parse(stored);
      } else {
        // Set default configuration
        this.config = {
          hasCompletedOnboarding: false,
          preferredLanguage: 'es',
          voiceEnabled: true,
          notificationsEnabled: true,
          studyRemindersEnabled: true,
          firebaseEnabled: true,
        };
        await this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('@app_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  // ==================== API KEY MANAGEMENT ====================

  async getOpenAIApiKey(): Promise<string | null> {
    // Check memory first
    if (this.config.openaiApiKey) {
      return this.config.openaiApiKey;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem('@openai_api_key');
      if (stored) {
        this.config.openaiApiKey = stored;
        return stored;
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }

    return null;
  }

  async setOpenAIApiKey(apiKey: string): Promise<void> {
    try {
      this.config.openaiApiKey = apiKey;
      await AsyncStorage.setItem('@openai_api_key', apiKey);
      await this.saveConfig();
      console.log('✅ OpenAI API key saved successfully');
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  }

  async hasOpenAIApiKey(): Promise<boolean> {
    const apiKey = await this.getOpenAIApiKey();
    return !!apiKey && apiKey.trim().length > 0;
  }

  async clearOpenAIApiKey(): Promise<void> {
    try {
      delete this.config.openaiApiKey;
      await AsyncStorage.removeItem('@openai_api_key');
      await this.saveConfig();
      console.log('✅ OpenAI API key cleared');
    } catch (error) {
      console.error('Error clearing API key:', error);
    }
  }

  // ==================== ONBOARDING ====================

  async hasCompletedOnboarding(): Promise<boolean> {
    return this.config.hasCompletedOnboarding || false;
  }

  async markOnboardingComplete(): Promise<void> {
    this.config.hasCompletedOnboarding = true;
    await this.saveConfig();
  }

  async resetOnboarding(): Promise<void> {
    this.config.hasCompletedOnboarding = false;
    await this.saveConfig();
  }

  // ==================== APP PREFERENCES ====================

  async getPreferredLanguage(): Promise<string> {
    return this.config.preferredLanguage || 'es';
  }

  async setPreferredLanguage(language: string): Promise<void> {
    this.config.preferredLanguage = language;
    await this.saveConfig();
  }

  async isVoiceEnabled(): Promise<boolean> {
    return this.config.voiceEnabled !== false; // Default to true
  }

  async setVoiceEnabled(enabled: boolean): Promise<void> {
    this.config.voiceEnabled = enabled;
    await this.saveConfig();
  }

  async areNotificationsEnabled(): Promise<boolean> {
    return this.config.notificationsEnabled !== false; // Default to true
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    this.config.notificationsEnabled = enabled;
    await this.saveConfig();
  }

  async areStudyRemindersEnabled(): Promise<boolean> {
    return this.config.studyRemindersEnabled !== false; // Default to true
  }

  async setStudyRemindersEnabled(enabled: boolean): Promise<void> {
    this.config.studyRemindersEnabled = enabled;
    await this.saveConfig();
  }

  // ==================== SUPABASE CONFIGURATION ====================

  async getSupabaseUrl(): Promise<string | null> {
    return this.config.supabaseUrl || null;
  }

  async setSupabaseUrl(url: string): Promise<void> {
    this.config.supabaseUrl = url;
    await this.saveConfig();
  }

  async getSupabaseKey(): Promise<string | null> {
    return this.config.supabaseKey || null;
  }

  async setSupabaseKey(key: string): Promise<void> {
    this.config.supabaseKey = key;
    await this.saveConfig();
  }

  async setSupabaseConfig(url: string, key: string): Promise<void> {
    this.config.supabaseUrl = url;
    this.config.supabaseKey = key;
    await this.saveConfig();
  }

  async clearSupabaseConfig(): Promise<void> {
    delete this.config.supabaseUrl;
    delete this.config.supabaseKey;
    await this.saveConfig();
  }

  async hasSupabaseConfig(): Promise<boolean> {
    const url = await this.getSupabaseUrl();
    const key = await this.getSupabaseKey();
    return !!(url && key);
  }

  // ==================== FIREBASE CONFIGURATION ====================

  async isFirebaseEnabled(): Promise<boolean> {
    return this.config.firebaseEnabled !== false; // Default to true
  }

  async setFirebaseEnabled(enabled: boolean): Promise<void> {
    this.config.firebaseEnabled = enabled;
    await this.saveConfig();
  }

  // ==================== UTILITY METHODS ====================

  getConfig(): AppConfig {
    return { ...this.config };
  }

  isConfigInitialized(): boolean {
    return this.isInitialized;
  }

  async resetAllConfig(): Promise<void> {
    try {
      this.config = {
        hasCompletedOnboarding: false,
        preferredLanguage: 'es',
        voiceEnabled: true,
        notificationsEnabled: true,
        studyRemindersEnabled: true,
        firebaseEnabled: true,
      };
      
      await AsyncStorage.multiRemove(['@app_config', '@openai_api_key']);
      await this.saveConfig();
      
      console.log('✅ All configuration reset');
    } catch (error) {
      console.error('Error resetting config:', error);
      throw error;
    }
  }

  // ==================== EXPORT/IMPORT ====================

  async exportConfig(): Promise<string> {
    const configToExport = { ...this.config };
    // Remove sensitive data from export
    delete configToExport.openaiApiKey;
    return JSON.stringify(configToExport, null, 2);
  }

  async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // Validate and sanitize imported config
      const validatedConfig: AppConfig = {
        hasCompletedOnboarding: Boolean(importedConfig.hasCompletedOnboarding),
        preferredLanguage: typeof importedConfig.preferredLanguage === 'string' ? importedConfig.preferredLanguage : 'es',
        voiceEnabled: Boolean(importedConfig.voiceEnabled),
        notificationsEnabled: Boolean(importedConfig.notificationsEnabled),
        studyRemindersEnabled: Boolean(importedConfig.studyRemindersEnabled),
        firebaseEnabled: Boolean(importedConfig.firebaseEnabled),
      };

      this.config = { ...this.config, ...validatedConfig };
      await this.saveConfig();
      
      console.log('✅ Configuration imported successfully');
    } catch (error) {
      console.error('Error importing config:', error);
      throw new Error('Invalid configuration format');
    }
  }
}

// Singleton instance
export const configService = new ConfigService();
export default configService;