import { databaseService } from './databaseService';
import { Flashcard } from '../types';
import { performanceCache } from '../utils/performanceOptimization';

export interface SpacedRepetitionConfig {
  easeFactor: number;
  interval: number;
  repetition: number;
  quality: number; // 0-5 scale (0 = complete blackout, 5 = perfect response)
}

export interface StudySession {
  flashcardId: number;
  quality: number;
  responseTime: number;
  timestamp: Date;
}

export interface NextReviewCalculation {
  nextInterval: number;
  nextEaseFactor: number;
  nextRepetition: number;
  nextDueDate: Date;
  confidence: number; // 0-1 scale
}

class SpacedRepetitionService {
  private readonly MIN_EASE_FACTOR = 1.3;
  private readonly MAX_EASE_FACTOR = 3.0;
  private readonly DEFAULT_EASE_FACTOR = 2.5;
  
  async initialize(): Promise<void> {
    console.log('🧠 Spaced Repetition Service initialized');
  }
  
  /**
   * Calculate next review using SM-2 algorithm with enhancements
   */
  calculateNextReview(
    flashcard: Flashcard,
    quality: number,
    responseTime?: number
  ): NextReviewCalculation {
    const currentEase = flashcard.easeFactor || this.DEFAULT_EASE_FACTOR;
    const currentInterval = flashcard.interval || 1;
    const currentRepetition = flashcard.studyCount || 0;
    
    // Quality normalization (0-5 scale)
    const normalizedQuality = Math.max(0, Math.min(5, Math.round(quality)));
    
    let nextEaseFactor = currentEase;
    let nextInterval = currentInterval;
    let nextRepetition = currentRepetition + 1;
    
    if (normalizedQuality < 3) {
      // Incorrect answer - reset interval but keep some progress
      nextInterval = 1;
      nextRepetition = Math.max(0, currentRepetition - 1);
      nextEaseFactor = Math.max(
        this.MIN_EASE_FACTOR,
        currentEase - 0.2
      );
    } else {
      // Correct answer - calculate next interval
      if (currentRepetition === 0) {
        nextInterval = 1;
      } else if (currentRepetition === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(currentInterval * nextEaseFactor);
      }
      
      // Update ease factor based on quality
      nextEaseFactor = Math.max(
        this.MIN_EASE_FACTOR,
        Math.min(
          this.MAX_EASE_FACTOR,
          currentEase + (0.1 - (5 - normalizedQuality) * (0.08 + (5 - normalizedQuality) * 0.02))
        )
      );
    }
    
    // Apply response time factor
    if (responseTime !== undefined) {
      nextInterval = this.applyResponseTimeFactor(nextInterval, responseTime, flashcard);
    }
    
    // Calculate next due date
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + nextInterval);
    
    // Calculate confidence based on performance
    const confidence = this.calculateConfidence(flashcard, normalizedQuality, responseTime);
    
    return {
      nextInterval,
      nextEaseFactor,
      nextRepetition,
      nextDueDate,
      confidence,
    };
  }
  
  private applyResponseTimeFactor(
    baseInterval: number,
    responseTime: number,
    flashcard: Flashcard
  ): number {
    // Get average response time for this flashcard
    const avgResponseTime = this.getAverageResponseTime(flashcard);
    
    if (avgResponseTime === 0 || responseTime <= 0) {
      return baseInterval;
    }
    
    // Calculate response time ratio
    const timeRatio = responseTime / avgResponseTime;
    
    let modifier = 1;
    
    if (timeRatio < 0.5) {
      // Very fast response - slightly increase interval
      modifier = 1.1;
    } else if (timeRatio > 2.0) {
      // Slow response - slightly decrease interval
      modifier = 0.9;
    }
    
    return Math.max(1, Math.round(baseInterval * modifier));
  }
  
  private getAverageResponseTime(flashcard: Flashcard): number {
    // This would ideally come from historical data
    // For now, use a reasonable default based on difficulty
    const baseTime = {
      'Beginner': 5000,    // 5 seconds
      'Intermediate': 8000, // 8 seconds
      'Advanced': 12000,   // 12 seconds
    };
    
    return baseTime[flashcard.difficulty as keyof typeof baseTime] || 8000;
  }
  
  private calculateConfidence(
    flashcard: Flashcard,
    quality: number,
    responseTime?: number
  ): number {
    let confidence = quality / 5; // Base confidence from quality
    
    // Adjust for success rate
    const successRate = (flashcard.correctCount || 0) / Math.max(1, flashcard.totalReviews || 1);
    confidence = (confidence + successRate) / 2;
    
    // Adjust for response time if available
    if (responseTime !== undefined) {
      const avgTime = this.getAverageResponseTime(flashcard);
      const timeRatio = responseTime / avgTime;
      
      if (timeRatio < 0.8) {
        confidence = Math.min(1, confidence * 1.1); // Fast response increases confidence
      } else if (timeRatio > 1.5) {
        confidence = confidence * 0.9; // Slow response decreases confidence
      }
    }
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Get cards due for review
   */
  async getDueCards(limit: number = 20): Promise<Flashcard[]> {
    const cacheKey = `due_cards_${limit}`;
    const cached = performanceCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const allCards = await databaseService.getFlashcards();
    const now = new Date();
    
    const dueCards = allCards
      .filter(card => {
        const dueDate = new Date(card.dueDate || card.createdAt || new Date());
        return dueDate <= now;
      })
      .sort((a, b) => {
        // Prioritize overdue cards
        const aDue = new Date(a.dueDate || a.createdAt || new Date()).getTime();
        const bDue = new Date(b.dueDate || b.createdAt || new Date()).getTime();
        
        if (aDue !== bDue) {
          return aDue - bDue; // Earlier due dates first
        }
        
        // Secondary sort by confidence (less confident first)
        const aConfidence = this.estimateCardConfidence(a);
        const bConfidence = this.estimateCardConfidence(b);
        
        return aConfidence - bConfidence;
      })
      .slice(0, limit);
    
    performanceCache.set(cacheKey, dueCards, 60000); // 1 minute cache
    return dueCards;
  }
  
  private estimateCardConfidence(card: Flashcard): number {
    const successRate = (card.correctCount || 0) / Math.max(1, card.totalReviews || 1);
    const recencyFactor = this.getRecencyFactor(card);
    
    return (successRate + recencyFactor) / 2;
  }
  
  private getRecencyFactor(card: Flashcard): number {
    const lastReviewed = new Date(card.lastReviewed || card.createdAt || new Date());
    const daysSinceReview = (Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
    
    // Recency factor decreases over time
    return Math.max(0, 1 - daysSinceReview / 30); // 30 days to 0
  }
  
  /**
   * Get optimized study queue based on spaced repetition
   */
  async getStudyQueue(options: {
    maxCards?: number;
    includeNew?: boolean;
    difficulty?: string[];
    categories?: string[];
  } = {}): Promise<Flashcard[]> {
    const {
      maxCards = 20,
      includeNew = true,
      difficulty = [],
      categories = [],
    } = options;
    
    let allCards = await databaseService.getFlashcards();
    
    // Apply filters
    if (difficulty.length > 0) {
      allCards = allCards.filter(card => card.difficulty && difficulty.includes(card.difficulty));
    }
    
    if (categories.length > 0) {
      allCards = allCards.filter(card => card.category && categories.includes(card.category));
    }
    
    const now = new Date();
    
    // Separate cards into categories
    const dueCards: Flashcard[] = [];
    const newCards: Flashcard[] = [];
    const reviewCards: Flashcard[] = [];
    
    allCards.forEach(card => {
      const dueDate = new Date(card.dueDate || card.createdAt || new Date());
      
      if ((card.totalReviews || 0) === 0 && includeNew) {
        newCards.push(card);
      } else if (dueDate <= now) {
        dueCards.push(card);
      } else {
        reviewCards.push(card);
      }
    });
    
    // Sort each category
    dueCards.sort((a, b) => this.compareDueCards(a, b));
    newCards.sort((a, b) => new Date(a.createdAt || new Date()).getTime() - new Date(b.createdAt || new Date()).getTime());
    reviewCards.sort((a, b) => this.compareReviewCards(a, b));
    
    // Build study queue with optimal distribution
    const studyQueue: Flashcard[] = [];
    
    // Prioritize due cards (40% of queue)
    const dueCount = Math.min(Math.floor(maxCards * 0.4), dueCards.length);
    studyQueue.push(...dueCards.slice(0, dueCount));
    
    // Add new cards (30% of queue)
    const newCount = Math.min(Math.floor(maxCards * 0.3), newCards.length);
    studyQueue.push(...newCards.slice(0, newCount));
    
    // Fill remaining with review cards
    const remainingSpace = maxCards - studyQueue.length;
    studyQueue.push(...reviewCards.slice(0, remainingSpace));
    
    return studyQueue;
  }
  
  private compareDueCards(a: Flashcard, b: Flashcard): number {
    // First by due date (earlier first)
    const aDue = new Date(a.dueDate || a.createdAt || new Date()).getTime();
    const bDue = new Date(b.dueDate || b.createdAt || new Date()).getTime();
    
    if (aDue !== bDue) {
      return aDue - bDue;
    }
    
    // Then by difficulty (harder first for overdue cards)
    const difficultyOrder = { 'Advanced': 0, 'Intermediate': 1, 'Beginner': 2 };
    const aDifficulty = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] ?? 1;
    const bDifficulty = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] ?? 1;
    
    return aDifficulty - bDifficulty;
  }
  
  private compareReviewCards(a: Flashcard, b: Flashcard): number {
    // Prioritize cards with lower confidence
    const aConfidence = this.estimateCardConfidence(a);
    const bConfidence = this.estimateCardConfidence(b);
    
    if (aConfidence !== bConfidence) {
      return aConfidence - bConfidence;
    }
    
    // Then by last reviewed (older first)
    const aLastReviewed = new Date(a.lastReviewed || a.createdAt || new Date()).getTime();
    const bLastReviewed = new Date(b.lastReviewed || b.createdAt || new Date()).getTime();
    
    return aLastReviewed - bLastReviewed;
  }
  
  /**
   * Update flashcard after study session
   */
  async processStudySession(session: StudySession): Promise<void> {
    const flashcard = await databaseService.getFlashcard(session.flashcardId);
    
    if (!flashcard) {
      throw new Error(`Flashcard not found: ${session.flashcardId}`);
    }
    
    // Calculate next review parameters
    const nextReview = this.calculateNextReview(
      flashcard,
      session.quality,
      session.responseTime
    );
    
    // Update flashcard
    const updates = {
      lastReviewed: session.timestamp,
      totalReviews: (flashcard.totalReviews || 0) + 1,
      correctCount: (flashcard.correctCount || 0) + (session.quality >= 3 ? 1 : 0),
      easeFactor: nextReview.nextEaseFactor,
      interval: nextReview.nextInterval,
      dueDate: nextReview.nextDueDate,
      studyCount: nextReview.nextRepetition,
    };
    
    await databaseService.updateFlashcard(session.flashcardId, updates);
    
    // Clear cache
    performanceCache.clear();
    
    console.log(`📚 Updated flashcard ${session.flashcardId}:`, {
      quality: session.quality,
      nextInterval: nextReview.nextInterval,
      nextDue: nextReview.nextDueDate.toLocaleDateString(),
      confidence: nextReview.confidence,
    });
  }
  
  /**
   * Get study statistics and recommendations
   */
  async getStudyStats(): Promise<{
    totalDue: number;
    newCards: number;
    reviewCards: number;
    averageRetention: number;
    recommendedSessionSize: number;
    nextReviewTime: Date | null;
  }> {
    const allCards = await databaseService.getFlashcards();
    const now = new Date();
    
    const dueCards = allCards.filter(card => {
      const dueDate = new Date(card.dueDate || card.createdAt || new Date());
      return dueDate <= now;
    });
    
    const newCards = allCards.filter(card => (card.totalReviews || 0) === 0);
    const reviewCards = allCards.filter(card => (card.totalReviews || 0) > 0);
    
    const totalReviews = reviewCards.reduce((sum, card) => sum + (card.totalReviews || 0), 0);
    const totalCorrect = reviewCards.reduce((sum, card) => sum + (card.correctCount || 0), 0);
    const averageRetention = totalReviews > 0 ? totalCorrect / totalReviews : 0;
    
    // Recommend session size based on due cards and user capacity
    const recommendedSessionSize = Math.min(20, Math.max(5, dueCards.length));
    
    // Find next review time
    const futureDueDates = allCards
      .map(card => new Date(card.dueDate || card.createdAt || new Date()))
      .filter(date => date > now)
      .sort((a, b) => a.getTime() - b.getTime());
    
    const nextReviewTime = futureDueDates.length > 0 ? futureDueDates[0] : null;
    
    return {
      totalDue: dueCards.length,
      newCards: newCards.length,
      reviewCards: reviewCards.length,
      averageRetention,
      recommendedSessionSize,
      nextReviewTime,
    };
  }
  
  /**
   * Reset spaced repetition for a card (useful for major content changes)
   */
  async resetCard(flashcardId: number): Promise<void> {
    await databaseService.updateFlashcard(flashcardId, {
      easeFactor: this.DEFAULT_EASE_FACTOR,
      interval: 1,
      studyCount: 0,
      dueDate: new Date(),
      lastReviewed: new Date(),
    });
    
    performanceCache.clear();
  }
  
  /**
   * Bulk process multiple study sessions (for performance)
   */
  async processBulkSessions(sessions: StudySession[]): Promise<void> {
    const updates: Array<{ id: number; updates: any }> = [];
    
    for (const session of sessions) {
      const flashcard = await databaseService.getFlashcard(session.flashcardId);
      
      if (!flashcard) continue;
      
      const nextReview = this.calculateNextReview(
        flashcard,
        session.quality,
        session.responseTime
      );
      
      updates.push({
        id: session.flashcardId,
        updates: {
          lastReviewed: session.timestamp,
          totalReviews: (flashcard.totalReviews || 0) + 1,
          correctCount: (flashcard.correctCount || 0) + (session.quality >= 3 ? 1 : 0),
          easeFactor: nextReview.nextEaseFactor,
          interval: nextReview.nextInterval,
          dueDate: nextReview.nextDueDate,
          studyCount: nextReview.nextRepetition,
        },
      });
    }
    
    // Batch update all cards
    await Promise.all(
      updates.map(({ id, updates: cardUpdates }) =>
        databaseService.updateFlashcard(id, cardUpdates)
      )
    );
    
    performanceCache.clear();
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();