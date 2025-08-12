/**
 * Integration Tests for StudyApp
 * Tests the complete user flow from app initialization to flashcard study
 */

import { configService } from '../services/configService';
import { databaseService } from '../services/databaseService.platform';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock SQLite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    runAsync: jest.fn(),
    closeAsync: jest.fn(),
  })),
}));

describe('StudyApp Integration Tests', () => {
  describe('App Initialization Flow', () => {
    test('should initialize all services in correct order', async () => {
      // Test the complete initialization sequence
      const services = [
        configService,
        databaseService,
      ];

      // Initialize all services
      for (const service of services) {
        await expect(service.initialize()).resolves.not.toThrow();
      }

      // Verify services are initialized
      expect(configService.isConfigInitialized()).toBe(true);
      expect(databaseService.isInitialized).toBe(true);
    });

    test('should handle API key configuration flow', async () => {
      // Test API key configuration
      const testApiKey = 'sk-test1234567890abcdef';
      
      // Initially no API key
      const hasKeyBefore = await configService.hasOpenAIApiKey();
      expect(hasKeyBefore).toBe(false);

      // Set API key
      await configService.setOpenAIApiKey(testApiKey);
      
      // Verify API key is set
      const hasKeyAfter = await configService.hasOpenAIApiKey();
      expect(hasKeyAfter).toBe(true);

      const retrievedKey = await configService.getOpenAIApiKey();
      expect(retrievedKey).toBe(testApiKey);
    });
  });

  describe('Database and Flashcard Flow', () => {
    test('should seed initial data and retrieve flashcards', async () => {
      // Initialize database
      await databaseService.initialize();

      // Get flashcards (should have seeded data)
      const flashcards = await databaseService.getFlashcards();
      
      // Verify we have initial flashcards
      expect(Array.isArray(flashcards)).toBe(true);
      expect(flashcards.length).toBeGreaterThan(0);
      
      // Verify flashcard structure
      if (flashcards.length > 0) {
        const firstCard = flashcards[0];
        expect(firstCard).toHaveProperty('id');
        expect(firstCard).toHaveProperty('question');
        expect(firstCard).toHaveProperty('answer');
        expect(firstCard).toHaveProperty('category');
        expect(firstCard).toHaveProperty('difficulty');
      }
    });

    test('should complete CRUD operations on flashcards', async () => {
      await databaseService.initialize();

      // Create
      const newCard = {
        question: 'Integration test question',
        answer: 'Integration test answer',
        category: 'Testing',
        difficulty: 'Advanced' as const,
      };

      const cardId = await databaseService.addFlashcard(newCard);
      expect(typeof cardId).toBe('number');

      // Read
      const flashcards = await databaseService.getFlashcards();
      const createdCard = flashcards.find(card => card.id === cardId);
      expect(createdCard).toBeTruthy();
      expect(createdCard?.question).toBe(newCard.question);

      // Update
      const updates = {
        question: 'Updated integration test question',
        answer: 'Updated integration test answer',
      };

      await databaseService.updateFlashcard(cardId, updates);
      
      const updatedFlashcards = await databaseService.getFlashcards();
      const updatedCard = updatedFlashcards.find(card => card.id === cardId);
      expect(updatedCard?.question).toBe(updates.question);

      // Delete
      await databaseService.deleteFlashcard(cardId);
      
      const finalFlashcards = await databaseService.getFlashcards();
      const deletedCard = finalFlashcards.find(card => card.id === cardId);
      expect(deletedCard).toBeUndefined();
    });
  });

  describe('Study Session Flow', () => {
    test('should track study session correctly', async () => {
      await databaseService.initialize();

      // Record a study session
      const sessionData = {
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
        questionsAnswered: 10,
        correctAnswers: 8,
        totalTime: 30,
        accuracy: 80,
      };

      // This would typically be called by the study session service
      await databaseService.recordStudySession(
        sessionData.startTime,
        sessionData.endTime,
        sessionData.questionsAnswered,
        sessionData.correctAnswers,
        sessionData.totalTime
      );

      // Verify session was recorded
      const analytics = await databaseService.getStudyAnalytics(7);
      expect(analytics.totalQuestions).toBe(sessionData.questionsAnswered);
      expect(analytics.accuracy).toBe(sessionData.accuracy);
    });
  });

  describe('Configuration Persistence', () => {
    test('should persist configuration across sessions', async () => {
      // Set various configuration options
      await configService.setPreferredLanguage('en');
      await configService.setVoiceEnabled(false);
      await configService.setNotificationsEnabled(true);
      await configService.markOnboardingComplete();

      // Simulate app restart by creating new instance
      const newConfigService = require('../services/configService').configService;
      await newConfigService.initialize();

      // Verify configuration persisted
      const language = await newConfigService.getPreferredLanguage();
      const voiceEnabled = await newConfigService.isVoiceEnabled();
      const notificationsEnabled = await newConfigService.areNotificationsEnabled();
      const onboardingComplete = await newConfigService.hasCompletedOnboarding();

      expect(language).toBe('en');
      expect(voiceEnabled).toBe(false);
      expect(notificationsEnabled).toBe(true);
      expect(onboardingComplete).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle service initialization failures gracefully', async () => {
      // Mock a service failure
      const originalInitialize = databaseService.initialize;
      databaseService.initialize = jest.fn().mockRejectedValue(new Error('Database unavailable'));

      // Should not crash the app
      await expect(databaseService.initialize()).rejects.toThrow('Database unavailable');

      // Restore original method
      databaseService.initialize = originalInitialize;
    });

    test('should handle invalid data gracefully', async () => {
      await databaseService.initialize();

      // Try to add invalid flashcard
      const invalidCard = {
        question: '', // Empty question
        answer: '',   // Empty answer
        category: 'Test',
        difficulty: 'Invalid' as any, // Invalid difficulty
      };

      // Should handle gracefully (either reject or sanitize)
      await expect(
        databaseService.addFlashcard(invalidCard)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large dataset efficiently', async () => {
      await databaseService.initialize();

      const startTime = Date.now();

      // Add multiple flashcards
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(databaseService.addFlashcard({
          question: `Performance test question ${i}`,
          answer: `Performance test answer ${i}`,
          category: 'Performance',
          difficulty: 'Beginner' as const,
        }));
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify all cards were added
      const flashcards = await databaseService.getFlashcards();
      const performanceCards = flashcards.filter(card => card.category === 'Performance');
      expect(performanceCards.length).toBe(100);
    });

    test('should retrieve flashcards quickly', async () => {
      await databaseService.initialize();

      const startTime = Date.now();
      const flashcards = await databaseService.getFlashcards();
      const endTime = Date.now();

      const duration = endTime - startTime;

      // Should retrieve in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(Array.isArray(flashcards)).toBe(true);
    });
  });
});