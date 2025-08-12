import { databaseService } from './databaseService.platform';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StudySession {
  id: string;
  date: Date;
  duration: number; // minutes
  questionsAnswered: number;
  correctAnswers: number;
  categories: string[];
  accuracy: number;
}

interface CategoryPerformance {
  category: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  trend: 'improving' | 'stable' | 'declining';
  difficulty: 'weak' | 'moderate' | 'strong';
  lastStudied: Date;
}

interface LearningInsight {
  type: 'strength' | 'weakness' | 'recommendation' | 'milestone';
  title: string;
  description: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface TimeDistribution {
  hour: number;
  sessions: number;
  avgAccuracy: number;
  totalMinutes: number;
}

interface LearningPattern {
  bestTimeToStudy: string;
  optimalSessionLength: number;
  preferredCategories: string[];
  streakPattern: 'morning' | 'afternoon' | 'evening' | 'mixed';
  studyFrequency: 'daily' | 'frequent' | 'occasional' | 'irregular';
}

interface PredictiveAnalysis {
  timeToMaster: { [category: string]: number }; // days
  recommendedDailyGoal: number; // minutes
  nextWeekForecast: {
    expectedAccuracy: number;
    suggestedTopics: string[];
    riskOfBurnout: 'low' | 'medium' | 'high';
  };
}

class AdvancedAnalyticsService {
  private isInitialized = false;
  private studySessions: StudySession[] = [];

  async initialize(): Promise<void> {
    try {
      await this.loadStudySessions();
      this.isInitialized = true;
      console.log('📊 Advanced Analytics Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Analytics:', error);
    }
  }

  private async loadStudySessions(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@study_sessions');
      if (saved) {
        const sessions = JSON.parse(saved);
        this.studySessions = sessions.map((s: any) => ({
          ...s,
          date: new Date(s.date),
          lastStudied: new Date(s.lastStudied)
        }));
      }
    } catch (error) {
      console.error('Failed to load study sessions:', error);
    }
  }

  private async saveStudySessions(): Promise<void> {
    try {
      await AsyncStorage.setItem('@study_sessions', JSON.stringify(this.studySessions));
    } catch (error) {
      console.error('Failed to save study sessions:', error);
    }
  }

  // ==================== SESSION TRACKING ====================

  async recordStudySession(session: {
    duration: number;
    questionsAnswered: number;
    correctAnswers: number;
    categories: string[];
  }): Promise<void> {
    const newSession: StudySession = {
      id: Date.now().toString(),
      date: new Date(),
      ...session,
      accuracy: session.questionsAnswered > 0 ? (session.correctAnswers / session.questionsAnswered) * 100 : 0
    };

    this.studySessions.push(newSession);

    // Keep only last 100 sessions to prevent storage bloat
    if (this.studySessions.length > 100) {
      this.studySessions = this.studySessions.slice(-100);
    }

    await this.saveStudySessions();
  }

  // ==================== CATEGORY ANALYSIS ====================

  async getCategoryPerformance(days: number = 30): Promise<CategoryPerformance[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSessions = this.studySessions.filter(s => s.date >= cutoffDate);
    const categoryStats = new Map<string, {
      totalQuestions: number;
      correctAnswers: number;
      totalTime: number;
      sessions: StudySession[];
    }>();

    // Aggregate data by category
    recentSessions.forEach(session => {
      session.categories.forEach(category => {
        if (!categoryStats.has(category)) {
          categoryStats.set(category, {
            totalQuestions: 0,
            correctAnswers: 0,
            totalTime: 0,
            sessions: []
          });
        }

        const stats = categoryStats.get(category)!;
        stats.totalQuestions += session.questionsAnswered;
        stats.correctAnswers += session.correctAnswers;
        stats.totalTime += session.duration;
        stats.sessions.push(session);
      });
    });

    const performance: CategoryPerformance[] = [];

    categoryStats.forEach((stats, category) => {
      const accuracy = stats.totalQuestions > 0 ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0;
      const averageTime = stats.sessions.length > 0 ? stats.totalTime / stats.sessions.length : 0;

      // Calculate trend
      const recentAccuracy = this.calculateRecentTrend(stats.sessions, 7);
      const olderAccuracy = this.calculateRecentTrend(stats.sessions.slice(0, -Math.floor(stats.sessions.length / 2)), 7);
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentAccuracy > olderAccuracy + 5) trend = 'improving';
      else if (recentAccuracy < olderAccuracy - 5) trend = 'declining';

      // Determine difficulty level
      let difficulty: 'weak' | 'moderate' | 'strong' = 'moderate';
      if (accuracy < 60) difficulty = 'weak';
      else if (accuracy > 80) difficulty = 'strong';

      performance.push({
        category,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        accuracy,
        averageTime,
        trend,
        difficulty,
        lastStudied: stats.sessions[stats.sessions.length - 1]?.date || new Date()
      });
    });

    return performance.sort((a, b) => b.totalQuestions - a.totalQuestions);
  }

  private calculateRecentTrend(sessions: StudySession[], days: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const recentSessions = sessions.filter(s => s.date >= cutoff);
    if (recentSessions.length === 0) return 0;

    const totalCorrect = recentSessions.reduce((sum, s) => sum + s.correctAnswers, 0);
    const totalQuestions = recentSessions.reduce((sum, s) => sum + s.questionsAnswered, 0);
    
    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  }

  // ==================== LEARNING INSIGHTS ====================

  async generateLearningInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    const performance = await this.getCategoryPerformance(30);
    const patterns = await this.getLearningPatterns();

    // Identify strengths
    const strongCategories = performance.filter(p => p.difficulty === 'strong');
    if (strongCategories.length > 0) {
      insights.push({
        type: 'strength',
        title: 'Áreas de Dominio',
        description: `Has demostrado excelencia en ${strongCategories.map(c => c.category).join(', ')}`,
        data: strongCategories,
        priority: 'low',
        actionable: false
      });
    }

    // Identify weaknesses
    const weakCategories = performance.filter(p => p.difficulty === 'weak');
    if (weakCategories.length > 0) {
      insights.push({
        type: 'weakness',
        title: 'Áreas de Mejora',
        description: `Considera enfocarte más en ${weakCategories.map(c => c.category).join(', ')}`,
        data: weakCategories,
        priority: 'high',
        actionable: true
      });
    }

    // Study time optimization
    if (patterns.bestTimeToStudy) {
      insights.push({
        type: 'recommendation',
        title: 'Horario Óptimo',
        description: `Tu mejor rendimiento es ${patterns.bestTimeToStudy}. Programa sesiones importantes en este horario.`,
        data: patterns,
        priority: 'medium',
        actionable: true
      });
    }

    // Streak achievements
    const currentStreak = await this.getCurrentStreak();
    if (currentStreak >= 7) {
      insights.push({
        type: 'milestone',
        title: '🔥 ¡Racha Impresionante!',
        description: `Has mantenido una racha de ${currentStreak} días. ¡Sigue así!`,
        data: { streak: currentStreak },
        priority: 'low',
        actionable: false
      });
    }

    return insights;
  }

  // ==================== TIME ANALYSIS ====================

  async getTimeDistribution(days: number = 7): Promise<TimeDistribution[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentSessions = this.studySessions.filter(s => s.date >= cutoffDate);
    const hourlyStats = new Array(24).fill(0).map((_, hour) => ({
      hour,
      sessions: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      totalMinutes: 0
    }));

    recentSessions.forEach(session => {
      const hour = session.date.getHours();
      hourlyStats[hour].sessions++;
      hourlyStats[hour].totalCorrect += session.correctAnswers;
      hourlyStats[hour].totalQuestions += session.questionsAnswered;
      hourlyStats[hour].totalMinutes += session.duration;
    });

    return hourlyStats.map(stat => ({
      hour: stat.hour,
      sessions: stat.sessions,
      avgAccuracy: stat.totalQuestions > 0 ? (stat.totalCorrect / stat.totalQuestions) * 100 : 0,
      totalMinutes: stat.totalMinutes
    }));
  }

  async getLearningPatterns(): Promise<LearningPattern> {
    const timeDistribution = await this.getTimeDistribution(30);
    const performance = await this.getCategoryPerformance(30);

    // Find best time to study
    const bestHour = timeDistribution.reduce((best, current) => 
      current.avgAccuracy > best.avgAccuracy ? current : best
    );

    let bestTimeToStudy = 'mañana';
    if (bestHour.hour >= 6 && bestHour.hour < 12) bestTimeToStudy = 'mañana';
    else if (bestHour.hour >= 12 && bestHour.hour < 18) bestTimeToStudy = 'tarde';
    else if (bestHour.hour >= 18 && bestHour.hour < 24) bestTimeToStudy = 'noche';

    // Calculate optimal session length
    const sessionLengths = this.studySessions.map(s => s.duration);
    const avgSessionLength = sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length;
    const optimalSessionLength = Math.round(avgSessionLength);

    // Get preferred categories
    const preferredCategories = performance
      .filter(p => p.totalQuestions >= 5)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3)
      .map(p => p.category);

    // Determine study frequency
    const recentDays = 7;
    const studyDaysCount = new Set(
      this.studySessions
        .filter(s => {
          const daysDiff = Math.floor((new Date().getTime() - s.date.getTime()) / (1000 * 3600 * 24));
          return daysDiff <= recentDays;
        })
        .map(s => s.date.toDateString())
    ).size;

    let studyFrequency: 'daily' | 'frequent' | 'occasional' | 'irregular' = 'irregular';
    if (studyDaysCount >= 6) studyFrequency = 'daily';
    else if (studyDaysCount >= 4) studyFrequency = 'frequent';
    else if (studyDaysCount >= 2) studyFrequency = 'occasional';

    return {
      bestTimeToStudy,
      optimalSessionLength,
      preferredCategories,
      streakPattern: bestHour.hour < 12 ? 'morning' : bestHour.hour < 18 ? 'afternoon' : 'evening',
      studyFrequency
    };
  }

  // ==================== PREDICTIVE ANALYSIS ====================

  async getPredictiveAnalysis(): Promise<PredictiveAnalysis> {
    const performance = await this.getCategoryPerformance(30);
    const patterns = await this.getLearningPatterns();

    // Calculate time to master each category
    const timeToMaster: { [category: string]: number } = {};
    
    performance.forEach(p => {
      if (p.accuracy < 90) { // Not mastered yet
        // Simple formula: lower accuracy = more days needed
        const masteryGap = 90 - p.accuracy;
        const improvementRate = p.trend === 'improving' ? 2 : p.trend === 'stable' ? 1 : 0.5;
        timeToMaster[p.category] = Math.ceil(masteryGap / improvementRate);
      }
    });

    // Recommended daily goal based on current patterns
    const avgSessionTime = patterns.optimalSessionLength;
    const recommendedDailyGoal = Math.max(15, Math.min(60, avgSessionTime));

    // Next week forecast
    const recentAccuracy = this.studySessions
      .slice(-10)
      .reduce((sum, s) => sum + s.accuracy, 0) / Math.min(10, this.studySessions.length);

    const totalStudyTime = this.studySessions
      .slice(-7)
      .reduce((sum, s) => sum + s.duration, 0);

    let riskOfBurnout: 'low' | 'medium' | 'high' = 'low';
    if (totalStudyTime > 300) riskOfBurnout = 'high'; // More than 5 hours per week
    else if (totalStudyTime > 180) riskOfBurnout = 'medium'; // More than 3 hours per week

    const suggestedTopics = performance
      .filter(p => p.difficulty === 'weak' || p.trend === 'declining')
      .slice(0, 3)
      .map(p => p.category);

    return {
      timeToMaster,
      recommendedDailyGoal,
      nextWeekForecast: {
        expectedAccuracy: Math.min(100, recentAccuracy + (patterns.studyFrequency === 'daily' ? 2 : 0)),
        suggestedTopics,
        riskOfBurnout
      }
    };
  }

  // ==================== UTILITY METHODS ====================

  async getCurrentStreak(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    while (streak < 365) { // Max check 1 year
      const hasSessionOnDate = this.studySessions.some(s => {
        const sessionDate = new Date(s.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });
      
      if (hasSessionOnDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  async getStudyHeatmapData(days: number = 30): Promise<{ date: string; value: number }[]> {
    const result = [];
    const endDate = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      const dateStr = date.toISOString().split('T')[0];
      const sessionsOnDate = this.studySessions.filter(s => {
        const sessionDateStr = s.date.toISOString().split('T')[0];
        return sessionDateStr === dateStr;
      });
      
      const totalMinutes = sessionsOnDate.reduce((sum, s) => sum + s.duration, 0);
      
      result.push({
        date: dateStr,
        value: Math.min(4, Math.floor(totalMinutes / 15)) // Scale 0-4 for heatmap
      });
    }
    
    return result.reverse(); // Chronological order
  }

  // ==================== EXPORT METHODS ====================

  async exportAnalyticsData(): Promise<string> {
    const data = {
      studySessions: this.studySessions,
      categoryPerformance: await this.getCategoryPerformance(90),
      learningInsights: await this.generateLearningInsights(),
      predictiveAnalysis: await this.getPredictiveAnalysis(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const advancedAnalyticsService = new AdvancedAnalyticsService();
export default advancedAnalyticsService;