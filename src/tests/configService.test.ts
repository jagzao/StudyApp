import AsyncStorage from '@react-native-async-storage/async-storage';
import { configService } from '../services/configService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('ConfigService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('API Key Management', () => {
    test('should save and retrieve API key', async () => {
      const testApiKey = 'sk-test1234567890abcdef';
      
      // Mock AsyncStorage.setItem
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(testApiKey);

      // Save API key
      await configService.setOpenAIApiKey(testApiKey);
      
      // Verify setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@openai_api_key', testApiKey);
      
      // Retrieve API key
      const retrievedKey = await configService.getOpenAIApiKey();
      expect(retrievedKey).toBe(testApiKey);
    });

    test('should return true when API key exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('sk-test123');
      
      const hasKey = await configService.hasOpenAIApiKey();
      expect(hasKey).toBe(true);
    });

    test('should return false when API key does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const hasKey = await configService.hasOpenAIApiKey();
      expect(hasKey).toBe(false);
    });

    test('should clear API key', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.clearOpenAIApiKey();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@openai_api_key');
    });
  });

  describe('Onboarding', () => {
    test('should mark onboarding as complete', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.markOnboardingComplete();
      
      const completed = await configService.hasCompletedOnboarding();
      expect(completed).toBe(true);
    });

    test('should reset onboarding status', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.resetOnboarding();
      
      const completed = await configService.hasCompletedOnboarding();
      expect(completed).toBe(false);
    });
  });

  describe('App Preferences', () => {
    test('should set and get preferred language', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.setPreferredLanguage('en');
      
      const language = await configService.getPreferredLanguage();
      expect(language).toBe('en');
    });

    test('should set and get voice enabled status', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.setVoiceEnabled(false);
      
      const voiceEnabled = await configService.isVoiceEnabled();
      expect(voiceEnabled).toBe(false);
    });

    test('should default to true for voice enabled', async () => {
      const voiceEnabled = await configService.isVoiceEnabled();
      expect(voiceEnabled).toBe(true);
    });
  });

  describe('Configuration Reset', () => {
    test('should reset all configuration', async () => {
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.resetAllConfig();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@app_config',
        '@openai_api_key'
      ]);
    });
  });

  describe('Import/Export', () => {
    test('should export configuration', async () => {
      const exportedConfig = await configService.exportConfig();
      
      expect(typeof exportedConfig).toBe('string');
      expect(JSON.parse(exportedConfig)).toHaveProperty('hasCompletedOnboarding');
      
      // Should not include sensitive data
      const config = JSON.parse(exportedConfig);
      expect(config).not.toHaveProperty('openaiApiKey');
    });

    test('should import valid configuration', async () => {
      const testConfig = {
        hasCompletedOnboarding: true,
        preferredLanguage: 'en',
        voiceEnabled: false,
        notificationsEnabled: true,
      };
      
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      await configService.importConfig(JSON.stringify(testConfig));
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('should reject invalid configuration format', async () => {
      const invalidConfig = 'invalid-json';
      
      await expect(configService.importConfig(invalidConfig))
        .rejects.toThrow('Invalid configuration format');
    });
  });
});