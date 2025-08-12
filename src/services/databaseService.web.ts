// Web-compatible database service using localStorage
import { Flashcard, PlayerData, GameStats, Achievement } from '../types';

class WebDatabaseService {
  private readonly storagePrefix = 'studyai_';
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.seedInitialData();
      this.isInitialized = true;
      console.log('✅ Web Database initialized successfully');
    } catch (error) {
      console.error('❌ Web Database initialization failed:', error);
      throw error;
    }
  }

  private getStorageKey(table: string): string {
    return `${this.storagePrefix}${table}`;
  }

  private getFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setToStorage<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ==================== FLASHCARDS OPERATIONS ====================

  async getFlashcards(filters?: {
    category?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<Flashcard[]> {
    let cards: Flashcard[] = this.getFromStorage(this.getStorageKey('flashcards'), []);

    if (filters?.category) {
      cards = cards.filter(card => card.category === filters.category);
    }

    if (filters?.difficulty) {
      cards = cards.filter(card => card.difficulty === filters.difficulty);
    }

    if (filters?.offset) {
      cards = cards.slice(filters.offset);
    }

    if (filters?.limit) {
      cards = cards.slice(0, filters.limit);
    }

    return cards;
  }

  async addFlashcard(flashcard: Omit<Flashcard, 'id'>): Promise<number> {
    const cards: Flashcard[] = this.getFromStorage(this.getStorageKey('flashcards'), []);
    const newId = Math.max(0, ...cards.map(c => c.id || 0)) + 1;
    
    const newCard: Flashcard = {
      ...flashcard,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    cards.push(newCard);
    this.setToStorage(this.getStorageKey('flashcards'), cards);
    
    return newId;
  }

  async updateFlashcard(id: number, updates: Partial<Flashcard>): Promise<void> {
    const cards: Flashcard[] = this.getFromStorage(this.getStorageKey('flashcards'), []);
    const index = cards.findIndex(card => card.id === id);
    
    if (index !== -1) {
      cards[index] = {
        ...cards[index],
        ...updates,
        updatedAt: new Date(),
      };
      this.setToStorage(this.getStorageKey('flashcards'), cards);
    }
  }

  async deleteFlashcard(id: number): Promise<void> {
    const cards: Flashcard[] = this.getFromStorage(this.getStorageKey('flashcards'), []);
    const filteredCards = cards.filter(card => card.id !== id);
    this.setToStorage(this.getStorageKey('flashcards'), filteredCards);
  }

  // ==================== QUESTION BANK ====================

  async getQuestionsFromBank(criteria: {
    category?: string;
    technology?: string;
    difficulty?: string;
    questionType?: string;
    limit?: number;
  }): Promise<Flashcard[]> {
    let questions: Flashcard[] = this.getFromStorage(this.getStorageKey('question_bank'), []);

    if (criteria.category) {
      questions = questions.filter(q => q.category === criteria.category);
    }

    if (criteria.difficulty) {
      questions = questions.filter(q => q.difficulty === criteria.difficulty);
    }

    if (criteria.limit) {
      questions = questions.slice(0, criteria.limit);
    }

    return questions;
  }

  async addQuestionsToBank(questions: Array<{
    question: string;
    answer: string;
    category: string;
    difficulty: string;
    technology?: string;
    questionType?: string;
    source?: string;
  }>): Promise<void> {
    const existingQuestions: Flashcard[] = this.getFromStorage(this.getStorageKey('question_bank'), []);
    
    const newQuestions = questions.map((q, index) => ({
      id: existingQuestions.length + index + 1,
      question: q.question,
      answer: q.answer,
      category: q.category,
      difficulty: q.difficulty,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    this.setToStorage(this.getStorageKey('question_bank'), [...existingQuestions, ...newQuestions]);
  }

  // ==================== ANALYTICS ====================

  async recordQuestionAttempt(flashcardId: number, correct: boolean): Promise<void> {
    const attempts: Array<{flashcardId: number; correct: boolean; timestamp: string}> = this.getFromStorage(this.getStorageKey('attempts'), []);
    attempts.push({
      flashcardId,
      correct,
      timestamp: new Date().toISOString(),
    });
    this.setToStorage(this.getStorageKey('attempts'), attempts);
  }

  async getStudyAnalytics(days: number = 30): Promise<{
    totalQuestions: number;
    accuracy: number;
    streakHistory: Array<{ date: string; streak: number }>;
    categoryBreakdown: Array<{ category: string; count: number; accuracy: number }>;
    difficultyProgression: Array<{ difficulty: string; count: number; accuracy: number }>;
  }> {
    const attempts = this.getFromStorage(this.getStorageKey('attempts'), []);
    const cards: Flashcard[] = this.getFromStorage(this.getStorageKey('flashcards'), []);

    const totalQuestions = attempts.length;
    const correctAnswers = attempts.filter((a: any) => a.correct).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Simple category breakdown
    const categoryMap = new Map<string, { count: number; correct: number }>();
    
    attempts.forEach((attempt: any) => {
      const card = cards.find(c => c.id === attempt.flashcardId);
      if (card?.category) {
        const current = categoryMap.get(card.category) || { count: 0, correct: 0 };
        current.count++;
        if (attempt.correct) current.correct++;
        categoryMap.set(card.category, current);
      }
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      accuracy: stats.count > 0 ? (stats.correct / stats.count) * 100 : 0,
    }));

    return {
      totalQuestions,
      accuracy,
      streakHistory: [],
      categoryBreakdown,
      difficultyProgression: [],
    };
  }

  // ==================== SEED DATA ====================

  private async seedInitialData(): Promise<void> {
    const existingCards: Flashcard[] = this.getFromStorage(this.getStorageKey('flashcards'), []);
    
    if (existingCards.length > 0) return;

    // Seed some initial flashcards
    const initialCards: Flashcard[] = [
      {
        id: 1,
        question: "¿Qué es React Native?",
        answer: "Un framework para crear aplicaciones móviles usando React y JavaScript, que permite desarrollar para iOS y Android con una sola base de código.",
        category: "React Native",
        difficulty: "Beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        question: "¿Cuál es la diferencia entre let, const y var en JavaScript?",
        answer: "var tiene scope de función y hoisting, let tiene scope de bloque sin hoisting, const es como let pero inmutable después de la asignación.",
        category: "JavaScript",
        difficulty: "Intermediate",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        question: "¿Qué es el Virtual DOM en React?",
        answer: "Una representación en memoria del DOM real que React usa para optimizar las actualizaciones mediante el algoritmo de reconciliación.",
        category: "React",
        difficulty: "Intermediate",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    this.setToStorage(this.getStorageKey('flashcards'), initialCards);

    // Seed question bank
    const questionBank = [
      {
        id: 1,
        question: "¿Qué son los React Hooks?",
        answer: "Funciones que permiten usar estado y otras características de React en componentes funcionales.",
        category: "React",
        difficulty: "Intermediate",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        question: "¿Qué es TypeScript?",
        answer: "Un superset de JavaScript que añade tipado estático opcional y otras características para mejorar el desarrollo.",
        category: "TypeScript",
        difficulty: "Beginner",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    this.setToStorage(this.getStorageKey('question_bank'), questionBank);

    console.log('✅ Web database seeded with initial data');
  }

  // ==================== UTILITY METHODS ====================

  async getDatabase(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return { isWeb: true }; // Mock database object
  }

  async close(): Promise<void> {
    this.isInitialized = false;
  }

  async resetDatabase(): Promise<void> {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix));
    keys.forEach(key => localStorage.removeItem(key));
    
    await this.seedInitialData();
    console.log('🔄 Web database reset completed');
  }
}

// Export the web-compatible service
export const webDatabaseService = new WebDatabaseService();
export default webDatabaseService;