import { renderHook, act } from '@testing-library/react-native';
import { useFlashcards } from '../useFlashcards';
import { mockFlashcards } from '../../tests/utils/test-utils';

// Mock the database service
jest.mock('../../services/databaseService.platform', () => ({
  databaseService: {
    initialize: jest.fn(() => Promise.resolve()),
    getFlashcards: jest.fn(() => Promise.resolve(mockFlashcards)),
    addFlashcard: jest.fn(() => Promise.resolve('3')),
    updateFlashcard: jest.fn(() => Promise.resolve()),
    deleteFlashcard: jest.fn(() => Promise.resolve()),
    updateStudyProgress: jest.fn(() => Promise.resolve()),
    getStudyStats: jest.fn(() => Promise.resolve({ total: 2, correct: 1, streak: 1 })),
  }
}));

// Mock analytics service
jest.mock('../../services/analyticsService', () => ({
  analyticsService: {
    trackFlashcardViewed: jest.fn(),
    trackAnswerSubmitted: jest.fn(),
    trackCardAdded: jest.fn(),
  }
}));

// Mock spaced repetition service
jest.mock('../../services/spacedRepetitionService', () => ({
  spacedRepetitionService: {
    calculateNextReview: jest.fn((card, quality) => ({
      ...card,
      interval: quality > 2 ? card.interval * 2 : 1,
      easeFactor: quality > 2 ? card.easeFactor + 0.1 : card.easeFactor - 0.2,
      dueDate: new Date(Date.now() + (quality > 2 ? card.interval * 2 : 1) * 24 * 60 * 60 * 1000),
    })),
    getDueCards: jest.fn(() => mockFlashcards.filter(card => new Date(card.dueDate) <= new Date())),
    getStudyQueue: jest.fn(() => mockFlashcards),
  }
}));

describe('useFlashcards hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useFlashcards());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.currentCard).toBeNull();
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalCards).toBe(0);
  });

  it('should load flashcards on initialization', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.currentCard).toEqual(mockFlashcards[0]);
    expect(result.current.totalCards).toBe(2);
  });

  it('should navigate to next card', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    act(() => {
      result.current.nextCard();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentCard).toEqual(mockFlashcards[1]);
  });

  it('should navigate to previous card', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Go to second card first
    act(() => {
      result.current.nextCard();
    });

    // Then go back
    act(() => {
      result.current.previousCard();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentCard).toEqual(mockFlashcards[0]);
  });

  it('should toggle answer visibility', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.showAnswer).toBe(false);

    act(() => {
      result.current.toggleAnswer();
    });

    expect(result.current.showAnswer).toBe(true);
  });

  it('should submit answer and update progress', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      result.current.submitAnswer(true, 5000);
    });

    // Should track the answer and move to next card if not the last one
    expect(result.current.currentIndex).toBe(1);
  });

  it('should handle incorrect answers', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      result.current.submitAnswer(false, 3000);
    });

    // Should still progress but with different tracking
    expect(result.current.currentIndex).toBe(1);
  });

  it('should add new flashcard', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const newCard = {
      question: 'New question',
      answer: 'New answer',
      category: 'Test',
      difficulty: 'Easy' as const,
      tags: ['test'],
    };

    await act(async () => {
      result.current.addFlashcard(newCard);
    });

    expect(result.current.totalCards).toBe(3);
  });

  it('should update existing flashcard', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const updates = { question: 'Updated question' };

    await act(async () => {
      result.current.updateFlashcard('1', updates);
    });

    // Verify the update was called on the service
    const databaseService = require('../../services/databaseService.platform').databaseService;
    expect(databaseService.updateFlashcard).toHaveBeenCalledWith('1', updates);
  });

  it('should delete flashcard', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      result.current.deleteFlashcard('1');
    });

    expect(result.current.totalCards).toBe(1);
  });

  it('should handle shuffle cards', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const originalOrder = result.current.currentCard;

    act(() => {
      result.current.shuffleCards();
    });

    // Cards should be shuffled (though we can't test randomness easily)
    expect(result.current.totalCards).toBe(2);
    expect(result.current.currentIndex).toBe(0);
  });

  it('should reset progress', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Move to second card
    act(() => {
      result.current.nextCard();
    });

    // Reset
    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.showAnswer).toBe(false);
    expect(result.current.currentCard).toEqual(mockFlashcards[0]);
  });

  it('should handle empty flashcard list', async () => {
    // Mock empty flashcard list
    const databaseService = require('../../services/databaseService.platform').databaseService;
    databaseService.getFlashcards.mockResolvedValue([]);

    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.currentCard).toBeNull();
    expect(result.current.totalCards).toBe(0);
    expect(result.current.isInitialized).toBe(true);
  });

  it('should handle database errors', async () => {
    // Mock database error
    const databaseService = require('../../services/databaseService.platform').databaseService;
    databaseService.getFlashcards.mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.currentCard).toBeNull();
  });

  it('should get study statistics', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const stats = await result.current.getStudyStats();
    expect(stats).toEqual({ total: 2, correct: 1, streak: 1 });
  });

  it('should search flashcards', async () => {
    const { result } = renderHook(() => useFlashcards());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      result.current.searchFlashcards('React');
    });

    // The search functionality should filter or call database search
    // This would depend on the actual implementation
  });
});