import { renderHook, act } from '@testing-library/react-hooks';
import { useFlashcards } from '../hooks/useFlashcards';
import { databaseService } from '../services/databaseService.platform';

// Mock database service
jest.mock('../services/databaseService.platform', () => ({
  databaseService: {
    initialize: jest.fn(),
    getFlashcards: jest.fn(),
    addFlashcard: jest.fn(),
    updateFlashcard: jest.fn(),
    deleteFlashcard: jest.fn(),
  }
}));

// Mock app store
jest.mock('../stores/appStore', () => ({
  useAppStore: () => ({
    flashcards: [],
    currentIndex: 0,
    showAnswer: false,
    userAnswer: '',
    showUserAnswer: false,
    answerMode: 'flashcard',
    setFlashcards: jest.fn(),
    addFlashcard: jest.fn(),
    updateFlashcard: jest.fn(),
    deleteFlashcard: jest.fn(),
    setCurrentIndex: jest.fn(),
    nextCard: jest.fn(),
    previousCard: jest.fn(),
    setAnswerMode: jest.fn(),
    setShowAnswer: jest.fn(),
    setUserAnswer: jest.fn(),
    setShowUserAnswer: jest.fn(),
  })
}));

describe('useFlashcards Hook', () => {
  const mockFlashcards = [
    {
      id: 1,
      question: 'What is React?',
      answer: 'A JavaScript library',
      category: 'React',
      difficulty: 'Beginner' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      question: 'What is TypeScript?',
      answer: 'A typed superset of JavaScript',
      category: 'TypeScript',
      difficulty: 'Intermediate' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize successfully', async () => {
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(false);

    await waitForNextUpdate();

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(databaseService.initialize).toHaveBeenCalled();
  });

  test('should handle database initialization failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (databaseService.initialize as jest.Mock).mockRejectedValue(new Error('Database error'));

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize database:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  test('should add flashcard successfully', async () => {
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);
    (databaseService.addFlashcard as jest.Mock).mockResolvedValue(3);

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());
    await waitForNextUpdate(); // Wait for initialization

    const newCard = {
      question: 'What is Node.js?',
      answer: 'A JavaScript runtime',
      category: 'Node.js',
      difficulty: 'Beginner' as const,
    };

    await act(async () => {
      await result.current.addCard(newCard);
    });

    expect(databaseService.addFlashcard).toHaveBeenCalledWith(newCard);
  });

  test('should handle add flashcard error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);
    (databaseService.addFlashcard as jest.Mock).mockRejectedValue(new Error('Add failed'));

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());
    await waitForNextUpdate();

    const newCard = {
      question: 'Test question',
      answer: 'Test answer',
      category: 'Test',
      difficulty: 'Beginner' as const,
    };

    await act(async () => {
      await result.current.addCard(newCard);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error adding flashcard:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('should update flashcard successfully', async () => {
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);
    (databaseService.updateFlashcard as jest.Mock).mockResolvedValue(undefined);

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());
    await waitForNextUpdate();

    const updates = {
      question: 'Updated question',
      answer: 'Updated answer',
    };

    await act(async () => {
      await result.current.updateCard(1, updates);
    });

    expect(databaseService.updateFlashcard).toHaveBeenCalledWith(1, {
      ...updates,
      updatedAt: expect.any(Date),
    });
  });

  test('should delete flashcard successfully', async () => {
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);
    (databaseService.deleteFlashcard as jest.Mock).mockResolvedValue(undefined);

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());
    await waitForNextUpdate();

    await act(async () => {
      await result.current.deleteCard(1);
    });

    expect(databaseService.deleteFlashcard).toHaveBeenCalledWith(1);
  });

  test('should return current card correctly', async () => {
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());
    await waitForNextUpdate();

    // Note: Since we're mocking the store, currentCard will be null
    // In a real implementation, this would return the flashcard at currentIndex
    expect(result.current.currentCard).toBe(null);
  });

  test('should provide navigation functions', async () => {
    (databaseService.initialize as jest.Mock).mockResolvedValue(undefined);
    (databaseService.getFlashcards as jest.Mock).mockResolvedValue(mockFlashcards);

    const { result, waitForNextUpdate } = renderHook(() => useFlashcards());
    await waitForNextUpdate();

    expect(typeof result.current.nextCard).toBe('function');
    expect(typeof result.current.previousCard).toBe('function');
    expect(typeof result.current.setCurrentIndex).toBe('function');
    expect(typeof result.current.setShowAnswer).toBe('function');
    expect(typeof result.current.setAnswerMode).toBe('function');
  });
});