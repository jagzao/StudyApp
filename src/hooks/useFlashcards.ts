import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Flashcard } from '../types';
import { databaseService } from '../services/databaseService.platform';

export const useFlashcards = () => {
  const {
    flashcards,
    currentIndex,
    showAnswer,
    userAnswer,
    showUserAnswer,
    answerMode,
    setFlashcards,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    setCurrentIndex,
    nextCard,
    previousCard,
    setAnswerMode,
    setShowAnswer,
    setUserAnswer,
    setShowUserAnswer,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const currentCard = flashcards[currentIndex] || null;

  // Initialize database on first mount
  useEffect(() => {
    const initializeDatabase = async () => {
      if (!isInitialized) {
        try {
          setIsLoading(true);
          await databaseService.initialize();
          setIsInitialized(true);
          await loadFlashcards();
        } catch (error) {
          console.error('Failed to initialize database:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeDatabase();
  }, [isInitialized]);

  const loadFlashcards = useCallback(async () => {
    try {
      const cards = await databaseService.getFlashcards();
      setFlashcards(cards);
    } catch (error) {
      console.error('Error loading flashcards:', error);
    }
  }, [setFlashcards]);

  const addCard = useCallback(async (cardData: Omit<Flashcard, 'id'>) => {
    try {
      const newId = await databaseService.addFlashcard(cardData);
      const newCard: Flashcard = {
        ...cardData,
        id: newId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      addFlashcard(newCard);
      // Reload to get updated list from database
      await loadFlashcards();
    } catch (error) {
      console.error('Error adding flashcard:', error);
    }
  }, [addFlashcard, loadFlashcards]);

  const updateCard = useCallback(async (id: number, updates: Partial<Flashcard>) => {
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await databaseService.updateFlashcard(id, updatedData);
      updateFlashcard(id, updatedData);
      // Reload to get updated list from database
      await loadFlashcards();
    } catch (error) {
      console.error('Error updating flashcard:', error);
    }
  }, [updateFlashcard, loadFlashcards]);

  const deleteCard = useCallback(async (id: number) => {
    try {
      await databaseService.deleteFlashcard(id);
      deleteFlashcard(id);
      
      // Reload to get updated list from database
      await loadFlashcards();
      
      // Adjust current index if necessary
      const updatedLength = flashcards.length - 1;
      if (currentIndex >= updatedLength && updatedLength > 0) {
        setCurrentIndex(updatedLength - 1);
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error);
    }
  }, [currentIndex, deleteFlashcard, loadFlashcards, setCurrentIndex, flashcards.length]);

  const goToCard = useCallback((index: number) => {
    if (index >= 0 && index < flashcards.length) {
      setCurrentIndex(index);
      setShowAnswer(false);
      setUserAnswer('');
      setShowUserAnswer(false);
    }
  }, [flashcards.length, setCurrentIndex, setShowAnswer, setUserAnswer, setShowUserAnswer]);

  const resetCardState = useCallback(() => {
    setShowAnswer(false);
    setUserAnswer('');
    setShowUserAnswer(false);
  }, [setShowAnswer, setUserAnswer, setShowUserAnswer]);

  const toggleAnswer = useCallback(() => {
    setShowAnswer(!showAnswer);
  }, [showAnswer, setShowAnswer]);

  const setAnswer = useCallback((answer: string, show: boolean = true) => {
    setUserAnswer(answer);
    setShowUserAnswer(show);
  }, [setUserAnswer, setShowUserAnswer]);

  const switchMode = useCallback((mode: 'flashcard' | 'interview') => {
    setAnswerMode(mode);
    resetCardState();
  }, [setAnswerMode, resetCardState]);

  return {
    // State
    flashcards,
    currentCard,
    currentIndex,
    showAnswer,
    userAnswer,
    showUserAnswer,
    answerMode,
    totalCards: flashcards.length,
    isLoading,
    isInitialized,
    
    // Actions
    loadFlashcards,
    addCard,
    updateCard,
    deleteCard,
    nextCard,
    previousCard,
    goToCard,
    toggleAnswer,
    setAnswer,
    switchMode,
    resetCardState,
    
    // Computed
    hasNext: currentIndex < flashcards.length - 1,
    hasPrevious: currentIndex > 0,
    progress: flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0,
  };
};