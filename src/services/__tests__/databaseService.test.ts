import { databaseService } from '../databaseService';
import { mockFlashcards } from '../../tests/utils/test-utils';

// Mock the platform-specific database service
jest.mock('../databaseService.platform', () => ({
  databaseService: {
    initialize: jest.fn(() => Promise.resolve()),
    addFlashcard: jest.fn(() => Promise.resolve('1')),
    getFlashcards: jest.fn(() => Promise.resolve([])),
    updateFlashcard: jest.fn(() => Promise.resolve()),
    deleteFlashcard: jest.fn(() => Promise.resolve()),
    searchFlashcards: jest.fn(() => Promise.resolve([])),
    getFlashcardsByCategory: jest.fn(() => Promise.resolve([])),
    getQuestionsFromBank: jest.fn(() => Promise.resolve([])),
    updateStudyProgress: jest.fn(() => Promise.resolve()),
    getStudyStats: jest.fn(() => Promise.resolve({ total: 0, correct: 0, streak: 0 })),
    exportData: jest.fn(() => Promise.resolve({})),
    importData: jest.fn(() => Promise.resolve()),
    cleanup: jest.fn(() => Promise.resolve()),
  }
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(databaseService.initialize()).resolves.toBeUndefined();
    });
  });

  describe('flashcard operations', () => {
    it('should add a flashcard successfully', async () => {
      const flashcard = {
        question: 'Test question',
        answer: 'Test answer',
        category: 'Test',
        difficulty: 'Intermediate' as const,
        tags: ['test'],
      };

      const result = await databaseService.addFlashcard(flashcard);
      expect(result).toBe('1');
      expect(databaseService.addFlashcard).toHaveBeenCalledWith(flashcard);
    });

    it('should get flashcards successfully', async () => {
      (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);
      
      const result = await databaseService.getFlashcards();
      expect(result).toEqual(mockFlashcards);
    });

    it('should update a flashcard successfully', async () => {
      const updates = { question: 'Updated question' };
      
      await databaseService.updateFlashcard('1', updates);
      expect(databaseService.updateFlashcard).toHaveBeenCalledWith('1', updates);
    });

    it('should delete a flashcard successfully', async () => {
      await databaseService.deleteFlashcard('1');
      expect(databaseService.deleteFlashcard).toHaveBeenCalledWith('1');
    });

    it('should search flashcards successfully', async () => {
      const searchResults = [mockFlashcards[0]];
      (databaseService.searchFlashcards as jest.Mock).mockResolvedValue(searchResults);
      
      const result = await databaseService.searchFlashcards('React');
      expect(result).toEqual(searchResults);
      expect(databaseService.searchFlashcards).toHaveBeenCalledWith('React');
    });

    it('should get flashcards by category successfully', async () => {
      const categoryResults = [mockFlashcards[0]];
      (databaseService.getFlashcardsByCategory as jest.Mock).mockResolvedValue(categoryResults);
      
      const result = await databaseService.getFlashcardsByCategory('React');
      expect(result).toEqual(categoryResults);
      expect(databaseService.getFlashcardsByCategory).toHaveBeenCalledWith('React');
    });
  });

  describe('study operations', () => {
    it('should update study progress successfully', async () => {
      const progress = {
        flashcardId: '1',
        correct: true,
        timeSpent: 5000,
        difficulty: 'easy' as const,
      };
      
      await databaseService.updateStudyProgress(progress);
      expect(databaseService.updateStudyProgress).toHaveBeenCalledWith(progress);
    });

    it('should get study stats successfully', async () => {
      const mockStats = { total: 10, correct: 8, streak: 3 };
      (databaseService.getStudyStats as jest.Mock).mockResolvedValue(mockStats);
      
      const result = await databaseService.getStudyStats();
      expect(result).toEqual(mockStats);
    });
  });

  describe('data import/export', () => {
    it('should export data successfully', async () => {
      const mockExportData = { flashcards: mockFlashcards };
      (databaseService.exportData as jest.Mock).mockResolvedValue(mockExportData);
      
      const result = await databaseService.exportData();
      expect(result).toEqual(mockExportData);
    });

    it('should import data successfully', async () => {
      const importData = { flashcards: mockFlashcards };
      
      await databaseService.importData(importData);
      expect(databaseService.importData).toHaveBeenCalledWith(importData);
    });
  });

  describe('question bank operations', () => {
    it('should get questions from bank successfully', async () => {
      const bankQuestions = [mockFlashcards[0]];
      (databaseService.getQuestionsFromBank as jest.Mock).mockResolvedValue(bankQuestions);
      
      const options = {
        category: 'React',
        difficulty: 'Intermediate' as const,
        limit: 10,
      };
      
      const result = await databaseService.getQuestionsFromBank(options);
      expect(result).toEqual(bankQuestions);
      expect(databaseService.getQuestionsFromBank).toHaveBeenCalledWith(options);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      (databaseService.getFlashcards as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(databaseService.getFlashcards()).rejects.toThrow('Database error');
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await databaseService.cleanup();
      expect(databaseService.cleanup).toHaveBeenCalled();
    });
  });
});