import { databaseService } from './databaseService.platform';
import { Flashcard } from '../types';

// ==================== SMART QUESTION GENERATION SERVICE ====================

class QuestionGenerationService {
  private readonly MAX_OPENAI_REQUESTS_PER_HOUR = 10;
  private readonly FALLBACK_QUESTION_LIMIT = 50;

  async initialize(): Promise<void> {
    console.log('🔧 Question Generation Service initialized');
  }

  async generateContextualQuestions(criteria: {
    category?: string;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    technology?: string;
    count?: number;
    userLevel?: number;
    recentTopics?: string[];
  }): Promise<Flashcard[]> {
    const { category, difficulty, technology, count = 5, userLevel = 1, recentTopics = [] } = criteria;

    try {
      // 1. First, try to get high-quality questions from our curated bank
      const bankQuestions = await this.getQuestionsFromBank({
        category,
        difficulty,
        technology,
        limit: count * 2 // Get more to filter better matches
      });

      // 2. If we have enough quality questions, use them
      if (bankQuestions.length >= count) {
        const filteredQuestions = this.filterByUserContext(bankQuestions, {
          userLevel,
          recentTopics,
          targetCount: count
        });
        
        return filteredQuestions.slice(0, count);
      }

      // 3. If not enough, supplement with AI-generated questions
      const additionalNeeded = count - bankQuestions.length;
      const aiQuestions = await this.generateWithAI({
        category,
        difficulty,
        technology,
        count: additionalNeeded,
        avoidTopics: recentTopics
      });

      // 4. Combine and return
      return [...bankQuestions, ...aiQuestions].slice(0, count);

    } catch (error) {
      console.error('Question generation failed:', error);
      
      // Fallback to bank questions only
      return this.getQuestionsFromBank({ 
        category, 
        difficulty, 
        technology, 
        limit: count 
      });
    }
  }

  private async getQuestionsFromBank(criteria: {
    category?: string;
    difficulty?: string;
    technology?: string;
    limit?: number;
  }): Promise<Flashcard[]> {
    try {
      return await databaseService.getQuestionsFromBank({
        ...criteria,
        questionType: 'technical' // Focus on technical questions
      });
    } catch (error) {
      console.error('Error getting questions from bank:', error);
      return [];
    }
  }

  private filterByUserContext(questions: Flashcard[], context: {
    userLevel: number;
    recentTopics: string[];
    targetCount: number;
  }): Flashcard[] {
    // Advanced filtering algorithm
    const { userLevel, recentTopics, targetCount } = context;

    // Score questions based on user context
    const scoredQuestions = questions.map(q => {
      let score = 1.0;

      // Difficulty matching (prefer questions slightly above user level)
      const difficultyMap = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      const questionLevel = difficultyMap[q.difficulty as keyof typeof difficultyMap] || 1;
      const levelDiff = Math.abs(questionLevel - userLevel);
      
      if (levelDiff === 0) score += 0.3; // Perfect match
      else if (levelDiff === 1) score += 0.1; // Close match
      else score -= 0.2; // Too far

      // Avoid recently covered topics
      const questionText = q.question.toLowerCase();
      const hasRecentTopic = recentTopics.some(topic => 
        questionText.includes(topic.toLowerCase())
      );
      if (hasRecentTopic) score -= 0.4;

      // Prefer questions with good metadata
      if (q.category) score += 0.1;
      if (q.tags && q.tags.length > 0) score += 0.1;

      return { ...q, contextScore: score };
    });

    // Sort by score and return top questions
    return scoredQuestions
      .sort((a, b) => (b as any).contextScore - (a as any).contextScore)
      .slice(0, targetCount);
  }

  private async generateWithAI(criteria: {
    category?: string;
    difficulty?: string;
    technology?: string;
    count: number;
    avoidTopics?: string[];
  }): Promise<Flashcard[]> {
    // For now, return empty array since we don't have OpenAI integration
    // In a real implementation, this would call OpenAI API
    console.log('AI question generation would be called here with criteria:', criteria);
    
    // TODO: Implement OpenAI integration when API key is available
    // This could generate questions based on job descriptions, recent tech trends, etc.
    
    return [];
  }

  // ==================== DIFFICULTY ADAPTATION ====================

  async adaptQuestionDifficulty(userId: number, recentPerformance: {
    correctAnswers: number;
    totalAnswers: number;
    averageResponseTime: number;
  }): Promise<{
    suggestedDifficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    confidence: number;
    reasoning: string;
  }> {
    const { correctAnswers, totalAnswers, averageResponseTime } = recentPerformance;
    const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

    let suggestedDifficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    let confidence: number;
    let reasoning: string;

    // Adaptive algorithm based on performance metrics
    if (accuracy >= 0.85 && averageResponseTime < 30) {
      suggestedDifficulty = 'Advanced';
      confidence = 0.9;
      reasoning = 'High accuracy and fast response times indicate readiness for advanced topics';
    } else if (accuracy >= 0.70 && averageResponseTime < 60) {
      suggestedDifficulty = 'Intermediate';
      confidence = 0.8;
      reasoning = 'Good accuracy with reasonable response times';
    } else if (accuracy >= 0.50) {
      suggestedDifficulty = 'Beginner';
      confidence = 0.7;
      reasoning = 'Moderate accuracy suggests focusing on fundamentals';
    } else {
      suggestedDifficulty = 'Beginner';
      confidence = 0.6;
      reasoning = 'Lower accuracy indicates need for foundational practice';
    }

    return { suggestedDifficulty, confidence, reasoning };
  }

  // ==================== CATEGORY INTELLIGENCE ====================

  async suggestNextCategory(userId: number, completedCategories: string[]): Promise<{
    category: string;
    reason: string;
    prerequisites: string[];
  } | null> {
    // Learning path logic - suggest next logical category
    const learningPaths = {
      'JavaScript': {
        next: ['React', 'Node.js', 'TypeScript'],
        reason: 'Build on JavaScript fundamentals'
      },
      'React': {
        next: ['React Native', 'Redux', 'Next.js'],
        reason: 'Expand React ecosystem knowledge'
      },
      'TypeScript': {
        next: ['Advanced TypeScript', 'Decorators', 'Generics'],
        reason: 'Deepen TypeScript expertise'
      },
      'Node.js': {
        next: ['Express', 'Database', 'Microservices'],
        reason: 'Build full-stack capabilities'
      },
      'Database': {
        next: ['System Design', 'Performance Optimization'],
        reason: 'Understand scalability and architecture'
      }
    };

    // Find best next category based on completed ones
    for (const completed of completedCategories) {
      const path = learningPaths[completed as keyof typeof learningPaths];
      if (path) {
        const availableNext = path.next.filter(cat => 
          !completedCategories.includes(cat)
        );
        
        if (availableNext.length > 0) {
          return {
            category: availableNext[0],
            reason: path.reason,
            prerequisites: [completed]
          };
        }
      }
    }

    // Default suggestion for new users
    if (completedCategories.length === 0) {
      return {
        category: 'JavaScript',
        reason: 'Essential foundation for web development',
        prerequisites: []
      };
    }

    return null;
  }

  // ==================== ANALYTICS AND INSIGHTS ====================

  async getStudyInsights(userId: number, days: number = 7): Promise<{
    weakAreas: string[];
    strongAreas: string[];
    suggestedFocus: string;
    progressTrend: 'improving' | 'stable' | 'declining';
  }> {
    try {
      const analytics = await databaseService.getStudyAnalytics(days);
      
      // Analyze category performance
      const weakAreas = analytics.categoryBreakdown
        .filter((cat: any) => cat.accuracy < 60)
        .map((cat: any) => cat.category);
      
      const strongAreas = analytics.categoryBreakdown
        .filter((cat: any) => cat.accuracy > 80)
        .map((cat: any) => cat.category);

      // Determine focus area
      const lowestPerformingCategory = analytics.categoryBreakdown
        .sort((a: any, b: any) => a.accuracy - b.accuracy)[0];
      
      const suggestedFocus = lowestPerformingCategory 
        ? `Focus on ${lowestPerformingCategory.category} - current accuracy: ${lowestPerformingCategory.accuracy.toFixed(1)}%`
        : 'Continue diverse practice across all areas';

      // Simple trend analysis (would be more sophisticated with historical data)
      const progressTrend: 'improving' | 'stable' | 'declining' = 
        analytics.accuracy > 70 ? 'improving' :
        analytics.accuracy > 50 ? 'stable' : 'declining';

      return {
        weakAreas,
        strongAreas,
        suggestedFocus,
        progressTrend
      };
    } catch (error) {
      console.error('Error getting study insights:', error);
      return {
        weakAreas: [],
        strongAreas: [],
        suggestedFocus: 'Continue regular practice',
        progressTrend: 'stable'
      };
    }
  }

  // ==================== QUESTION BANK MANAGEMENT ====================

  async addQuestionsToBank(questions: Array<{
    question: string;
    answer: string;
    category: string;
    difficulty: string;
    technology?: string;
    tags?: string[];
    source?: string;
  }>): Promise<void> {
    try {
      await databaseService.addQuestionsToBank(questions.map(q => ({
        ...q,
        questionType: 'technical',
        source: q.source || 'user_generated'
      })));
    } catch (error) {
      console.error('Error adding questions to bank:', error);
    }
  }

  async importQuestionsFromJobDescription(jobDescription: string): Promise<Flashcard[]> {
    // Parse job description for technologies and requirements
    const technologies = this.extractTechnologies(jobDescription);
    const experienceLevel = this.extractExperienceLevel(jobDescription);
    
    const questions: Flashcard[] = [];
    
    // Generate targeted questions for each technology
    for (const tech of technologies) {
      const techQuestions = await this.getQuestionsFromBank({
        technology: tech,
        difficulty: experienceLevel,
        limit: 3
      });
      questions.push(...techQuestions);
    }
    
    return questions.slice(0, 15); // Limit to reasonable number
  }

  private extractTechnologies(jobDescription: string): string[] {
    const techKeywords = [
      'React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'Node.js',
      'Python', 'Java', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
      'SQL', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL',
      'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git'
    ];
    
    const description = jobDescription.toLowerCase();
    return techKeywords.filter(tech => 
      description.includes(tech.toLowerCase())
    );
  }

  private extractExperienceLevel(jobDescription: string): 'Beginner' | 'Intermediate' | 'Advanced' {
    const description = jobDescription.toLowerCase();
    
    if (description.includes('senior') || description.includes('lead') || 
        description.includes('5+ years') || description.includes('expert')) {
      return 'Advanced';
    }
    
    if (description.includes('mid-level') || description.includes('2-4 years') ||
        description.includes('intermediate')) {
      return 'Intermediate';
    }
    
    return 'Beginner';
  }
}

// Singleton instance
export const questionGenerationService = new QuestionGenerationService();
export default questionGenerationService;