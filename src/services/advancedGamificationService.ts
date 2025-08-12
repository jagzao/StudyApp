import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from './databaseService.platform';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  condition: BadgeCondition;
}

interface BadgeCondition {
  type: 'streak' | 'accuracy' | 'questions' | 'category_master' | 'time_played' | 'special';
  target: number;
  category?: string;
  timeframe?: number; // days
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  xpReward: number;
  badgeReward?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  progress: number;
  maxProgress: number;
  condition: ChallengeCondition;
}

interface ChallengeCondition {
  type: 'answer_questions' | 'maintain_streak' | 'achieve_accuracy' | 'study_minutes' | 'complete_categories';
  target: number;
  parameters?: { [key: string]: any };
}

interface XPMultiplier {
  id: string;
  name: string;
  multiplier: number;
  duration: number; // minutes
  startTime: Date;
  isActive: boolean;
  condition: 'streak_bonus' | 'perfect_score' | 'speed_bonus' | 'challenge_complete';
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  level: number;
  xp: number;
  streak: number;
  accuracy: number;
  rank: number;
  badgeCount: number;
  lastActive: Date;
}

interface UserStats {
  level: number;
  xp: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  streak: number;
  maxStreak: number;
  badges: Badge[];
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  xpMultipliers: XPMultiplier[];
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

class AdvancedGamificationService {
  private userStats: UserStats | null = null;
  private badges: Badge[] = [];
  private challenges: Challenge[] = [];
  private leaderboard: LeaderboardEntry[] = [];

  async initialize(): Promise<void> {
    try {
      await this.loadUserStats();
      await this.initializeBadges();
      await this.initializeChallenges();
      await this.updateActiveChallenges();
      console.log('🎮 Advanced Gamification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Gamification:', error);
    }
  }

  private async loadUserStats(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@gamification_stats');
      if (saved) {
        this.userStats = JSON.parse(saved);
        // Convert date strings back to Date objects
        if (this.userStats) {
          this.userStats.badges = this.userStats.badges.map(b => ({
            ...b,
            unlockedAt: b.unlockedAt ? new Date(b.unlockedAt) : undefined
          }));
          this.userStats.activeChallenges = this.userStats.activeChallenges.map(c => ({
            ...c,
            startDate: new Date(c.startDate),
            endDate: new Date(c.endDate)
          }));
        }
      } else {
        // Initialize new user stats
        this.userStats = {
          level: 1,
          xp: 0,
          totalXP: 0,
          currentLevelXP: 0,
          nextLevelXP: 1000,
          streak: 0,
          maxStreak: 0,
          badges: [],
          activeChallenges: [],
          completedChallenges: [],
          xpMultipliers: [],
          weeklyGoal: 300, // 5 hours per week in minutes
          weeklyProgress: 0,
          monthlyGoal: 1200, // ~20 hours per month
          monthlyProgress: 0
        };
      }
    } catch (error) {
      console.error('Failed to load gamification stats:', error);
    }
  }

  private async saveUserStats(): Promise<void> {
    try {
      if (this.userStats) {
        await AsyncStorage.setItem('@gamification_stats', JSON.stringify(this.userStats));
      }
    } catch (error) {
      console.error('Failed to save gamification stats:', error);
    }
  }

  // ==================== BADGES SYSTEM ====================

  private async initializeBadges(): Promise<void> {
    this.badges = [
      // Streak Badges
      {
        id: 'first_steps',
        name: 'Primeros Pasos',
        description: 'Completa tu primera sesión de estudio',
        icon: '👶',
        category: 'Inicio',
        rarity: 'common',
        progress: 0,
        maxProgress: 1,
        condition: { type: 'questions', target: 1 }
      },
      {
        id: 'streak_warrior',
        name: 'Guerrero de la Constancia',
        description: 'Mantén una racha de 7 días consecutivos',
        icon: '⚔️',
        category: 'Constancia',
        rarity: 'rare',
        progress: 0,
        maxProgress: 7,
        condition: { type: 'streak', target: 7 }
      },
      {
        id: 'streak_legend',
        name: 'Leyenda Imparable',
        description: 'Mantén una racha de 30 días consecutivos',
        icon: '🏆',
        category: 'Constancia',
        rarity: 'legendary',
        progress: 0,
        maxProgress: 30,
        condition: { type: 'streak', target: 30 }
      },

      // Accuracy Badges
      {
        id: 'sharp_shooter',
        name: 'Tirador Certero',
        description: 'Alcanza 90% de precisión en 50 preguntas',
        icon: '🎯',
        category: 'Precisión',
        rarity: 'epic',
        progress: 0,
        maxProgress: 50,
        condition: { type: 'accuracy', target: 90 }
      },
      {
        id: 'perfectionist',
        name: 'Perfeccionista',
        description: 'Responde 20 preguntas seguidas sin fallar',
        icon: '💯',
        category: 'Precisión',
        rarity: 'legendary',
        progress: 0,
        maxProgress: 20,
        condition: { type: 'accuracy', target: 100 }
      },

      // Category Master Badges
      {
        id: 'js_master',
        name: 'Maestro JavaScript',
        description: 'Domina JavaScript con 95% de precisión',
        icon: '🟨',
        category: 'Maestría',
        rarity: 'epic',
        progress: 0,
        maxProgress: 1,
        condition: { type: 'category_master', target: 95, category: 'JavaScript' }
      },
      {
        id: 'react_guru',
        name: 'Gurú de React',
        description: 'Domina React con 95% de precisión',
        icon: '⚛️',
        category: 'Maestría',
        rarity: 'epic',
        progress: 0,
        maxProgress: 1,
        condition: { type: 'category_master', target: 95, category: 'React' }
      },
      {
        id: 'fullstack_god',
        name: 'Dios Full Stack',
        description: 'Domina todas las categorías principales',
        icon: '🌟',
        category: 'Maestría',
        rarity: 'legendary',
        progress: 0,
        maxProgress: 6,
        condition: { type: 'special', target: 1 }
      },

      // Volume Badges
      {
        id: 'question_hunter',
        name: 'Cazador de Preguntas',
        description: 'Responde 100 preguntas',
        icon: '🏹',
        category: 'Volumen',
        rarity: 'common',
        progress: 0,
        maxProgress: 100,
        condition: { type: 'questions', target: 100 }
      },
      {
        id: 'question_beast',
        name: 'Bestia de Preguntas',
        description: 'Responde 1000 preguntas',
        icon: '🦁',
        category: 'Volumen',
        rarity: 'epic',
        progress: 0,
        maxProgress: 1000,
        condition: { type: 'questions', target: 1000 }
      },

      // Time Badges
      {
        id: 'study_marathon',
        name: 'Maratón de Estudio',
        description: 'Estudia por 10 horas en total',
        icon: '🏃',
        category: 'Dedicación',
        rarity: 'rare',
        progress: 0,
        maxProgress: 600, // 10 hours in minutes
        condition: { type: 'time_played', target: 600 }
      },
      {
        id: 'study_legend',
        name: 'Leyenda del Estudio',
        description: 'Estudia por 100 horas en total',
        icon: '👑',
        category: 'Dedicación',
        rarity: 'legendary',
        progress: 0,
        maxProgress: 6000, // 100 hours in minutes
        condition: { type: 'time_played', target: 6000 }
      }
    ];

    // Load progress for existing badges
    if (this.userStats) {
      this.userStats.badges.forEach(userBadge => {
        const badge = this.badges.find(b => b.id === userBadge.id);
        if (badge) {
          badge.progress = userBadge.progress;
          badge.unlockedAt = userBadge.unlockedAt;
        }
      });
    }
  }

  async checkBadgeProgress(stats: {
    questionsAnswered: number;
    correctAnswers: number;
    studyTimeMinutes: number;
    streak: number;
    categoryStats: { [category: string]: { accuracy: number; questions: number } };
  }): Promise<Badge[]> {
    const newlyUnlocked: Badge[] = [];

    for (const badge of this.badges) {
      if (badge.unlockedAt) continue; // Already unlocked

      let progress = 0;
      let shouldUnlock = false;

      switch (badge.condition.type) {
        case 'questions':
          progress = stats.questionsAnswered;
          shouldUnlock = progress >= badge.condition.target;
          break;

        case 'streak':
          progress = stats.streak;
          shouldUnlock = progress >= badge.condition.target;
          break;

        case 'accuracy':
          const accuracy = stats.questionsAnswered > 0 ? 
            (stats.correctAnswers / stats.questionsAnswered) * 100 : 0;
          if (badge.id === 'perfectionist') {
            // Special logic for perfectionist badge
            // This would need more complex tracking in real implementation
            progress = 0; // Simplified for now
          } else {
            progress = accuracy >= badge.condition.target ? badge.maxProgress : 0;
            shouldUnlock = progress >= badge.maxProgress;
          }
          break;

        case 'category_master':
          if (badge.condition.category && stats.categoryStats[badge.condition.category]) {
            const categoryAccuracy = stats.categoryStats[badge.condition.category].accuracy;
            const categoryQuestions = stats.categoryStats[badge.condition.category].questions;
            progress = categoryAccuracy >= badge.condition.target && categoryQuestions >= 20 ? 1 : 0;
            shouldUnlock = progress >= badge.maxProgress;
          }
          break;

        case 'time_played':
          progress = stats.studyTimeMinutes;
          shouldUnlock = progress >= badge.condition.target;
          break;

        case 'special':
          if (badge.id === 'fullstack_god') {
            // Count categories with 95%+ accuracy
            const masteredCategories = Object.values(stats.categoryStats)
              .filter(cat => cat.accuracy >= 95 && cat.questions >= 20).length;
            progress = masteredCategories;
            shouldUnlock = progress >= 6; // 6 main categories
          }
          break;
      }

      badge.progress = Math.min(progress, badge.maxProgress);

      if (shouldUnlock && !badge.unlockedAt) {
        badge.unlockedAt = new Date();
        newlyUnlocked.push(badge);
        
        // Award XP for unlocking badge
        const xpReward = this.getBadgeXPReward(badge.rarity);
        await this.awardXP(xpReward, `Insignia desbloqueada: ${badge.name}`);
      }
    }

    // Update user stats
    if (this.userStats) {
      this.userStats.badges = this.badges;
      await this.saveUserStats();
    }

    return newlyUnlocked;
  }

  private getBadgeXPReward(rarity: Badge['rarity']): number {
    switch (rarity) {
      case 'common': return 50;
      case 'rare': return 100;
      case 'epic': return 200;
      case 'legendary': return 500;
      default: return 50;
    }
  }

  // ==================== CHALLENGES SYSTEM ====================

  private async initializeChallenges(): Promise<void> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    this.challenges = [
      // Daily Challenges
      {
        id: 'daily_questions',
        title: 'Reto Diario',
        description: 'Responde 10 preguntas hoy',
        type: 'daily',
        difficulty: 'easy',
        xpReward: 100,
        startDate: todayStart,
        endDate: todayEnd,
        isActive: true,
        progress: 0,
        maxProgress: 10,
        condition: { type: 'answer_questions', target: 10 }
      },
      {
        id: 'daily_accuracy',
        title: 'Precisión Diaria',
        description: 'Mantén 80% de precisión en 15 preguntas',
        type: 'daily',
        difficulty: 'medium',
        xpReward: 150,
        startDate: todayStart,
        endDate: todayEnd,
        isActive: true,
        progress: 0,
        maxProgress: 15,
        condition: { type: 'achieve_accuracy', target: 80, parameters: { minQuestions: 15 } }
      },

      // Weekly Challenges
      {
        id: 'weekly_marathon',
        title: 'Maratón Semanal',
        description: 'Estudia 5 horas esta semana',
        type: 'weekly',
        difficulty: 'hard',
        xpReward: 500,
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
        progress: 0,
        maxProgress: 300, // 5 hours in minutes
        condition: { type: 'study_minutes', target: 300 }
      },
      {
        id: 'weekly_streak',
        title: 'Constancia Semanal',
        description: 'Estudia todos los días de esta semana',
        type: 'weekly',
        difficulty: 'medium',
        xpReward: 300,
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
        progress: 0,
        maxProgress: 7,
        condition: { type: 'maintain_streak', target: 7 }
      },

      // Monthly Challenges
      {
        id: 'monthly_master',
        title: 'Maestro del Mes',
        description: 'Domina 2 categorías nuevas este mes',
        type: 'monthly',
        difficulty: 'extreme',
        xpReward: 1000,
        badgeReward: 'monthly_champion',
        startDate: monthStart,
        endDate: monthEnd,
        isActive: true,
        progress: 0,
        maxProgress: 2,
        condition: { type: 'complete_categories', target: 2, parameters: { minAccuracy: 90 } }
      }
    ];
  }

  private async updateActiveChallenges(): Promise<void> {
    const now = new Date();
    
    // Remove expired challenges and add to completed if they were finished
    this.challenges = this.challenges.filter(challenge => {
      if (challenge.endDate <= now) {
        if (this.userStats && challenge.progress >= challenge.maxProgress) {
          this.userStats.completedChallenges.push(challenge);
        }
        return false; // Remove expired challenge
      }
      return true;
    });

    // Update user's active challenges
    if (this.userStats) {
      this.userStats.activeChallenges = this.challenges;
      await this.saveUserStats();
    }
  }

  async updateChallengeProgress(action: {
    type: 'questions_answered' | 'study_time' | 'accuracy_achieved' | 'streak_updated' | 'category_completed';
    value: number;
    metadata?: any;
  }): Promise<Challenge[]> {
    const completedChallenges: Challenge[] = [];

    for (const challenge of this.challenges) {
      if (challenge.progress >= challenge.maxProgress) continue; // Already completed

      let progressIncrease = 0;

      switch (challenge.condition.type) {
        case 'answer_questions':
          if (action.type === 'questions_answered') {
            progressIncrease = action.value;
          }
          break;

        case 'study_minutes':
          if (action.type === 'study_time') {
            progressIncrease = action.value;
          }
          break;

        case 'achieve_accuracy':
          if (action.type === 'accuracy_achieved' && action.metadata?.questionsCount >= challenge.condition.parameters?.minQuestions) {
            if (action.value >= challenge.condition.target) {
              progressIncrease = action.metadata.questionsCount;
            }
          }
          break;

        case 'maintain_streak':
          if (action.type === 'streak_updated') {
            challenge.progress = Math.min(action.value, challenge.maxProgress);
          }
          break;

        case 'complete_categories':
          if (action.type === 'category_completed') {
            progressIncrease = 1;
          }
          break;
      }

      challenge.progress = Math.min(challenge.progress + progressIncrease, challenge.maxProgress);

      // Check if challenge is completed
      if (challenge.progress >= challenge.maxProgress && !completedChallenges.includes(challenge)) {
        completedChallenges.push(challenge);
        
        // Award XP
        await this.awardXP(challenge.xpReward, `Reto completado: ${challenge.title}`);
        
        // Award badge if specified
        if (challenge.badgeReward) {
          // This would unlock a special badge
          console.log(`Badge reward: ${challenge.badgeReward}`);
        }
      }
    }

    if (this.userStats) {
      await this.saveUserStats();
    }

    return completedChallenges;
  }

  // ==================== XP SYSTEM ====================

  async awardXP(amount: number, reason: string): Promise<void> {
    if (!this.userStats) return;

    // Apply multipliers
    const totalMultiplier = this.getActiveMultipliers().reduce((total, mult) => total * mult.multiplier, 1);
    const finalAmount = Math.round(amount * totalMultiplier);

    this.userStats.xp += finalAmount;
    this.userStats.totalXP += finalAmount;

    // Check for level up
    while (this.userStats.xp >= this.userStats.nextLevelXP) {
      this.userStats.xp -= this.userStats.nextLevelXP;
      this.userStats.level++;
      this.userStats.currentLevelXP = this.userStats.nextLevelXP;
      this.userStats.nextLevelXP = this.calculateXPForLevel(this.userStats.level + 1);
      
      // Level up bonus
      const levelBonus = this.userStats.level * 50;
      this.userStats.xp += levelBonus;
      
      console.log(`🎉 Level up! Now level ${this.userStats.level}. Bonus: ${levelBonus} XP`);
    }

    await this.saveUserStats();
    console.log(`💰 +${finalAmount} XP: ${reason}`);
  }

  private calculateXPForLevel(level: number): number {
    // Exponential growth: each level requires 20% more XP than the previous
    return Math.floor(1000 * Math.pow(1.2, level - 1));
  }

  private getActiveMultipliers(): XPMultiplier[] {
    if (!this.userStats) return [];
    
    const now = new Date();
    return this.userStats.xpMultipliers.filter(mult => {
      const endTime = new Date(mult.startTime.getTime() + mult.duration * 60 * 1000);
      return mult.isActive && now <= endTime;
    });
  }

  async activateMultiplier(condition: XPMultiplier['condition'], duration: number = 30): Promise<void> {
    if (!this.userStats) return;

    const multiplier: XPMultiplier = {
      id: Date.now().toString(),
      name: this.getMultiplierName(condition),
      multiplier: this.getMultiplierValue(condition),
      duration,
      startTime: new Date(),
      isActive: true,
      condition
    };

    this.userStats.xpMultipliers.push(multiplier);
    await this.saveUserStats();

    console.log(`🔥 Multiplicador activado: ${multiplier.name} (x${multiplier.multiplier})`);
  }

  private getMultiplierName(condition: XPMultiplier['condition']): string {
    switch (condition) {
      case 'streak_bonus': return 'Bonus de Racha';
      case 'perfect_score': return 'Puntuación Perfecta';
      case 'speed_bonus': return 'Bonus de Velocidad';
      case 'challenge_complete': return 'Reto Completado';
      default: return 'Bonus Especial';
    }
  }

  private getMultiplierValue(condition: XPMultiplier['condition']): number {
    switch (condition) {
      case 'streak_bonus': return 1.5;
      case 'perfect_score': return 2.0;
      case 'speed_bonus': return 1.3;
      case 'challenge_complete': return 1.8;
      default: return 1.2;
    }
  }

  // ==================== GETTERS ====================

  getUserStats(): UserStats | null {
    return this.userStats;
  }

  getBadges(): Badge[] {
    return this.badges;
  }

  getActiveChallenges(): Challenge[] {
    return this.challenges;
  }

  // ==================== LEADERBOARD ====================

  async updateLeaderboard(): Promise<void> {
    // In a real app, this would sync with a backend
    // For now, we'll simulate some data
    if (!this.userStats) return;

    this.leaderboard = [
      {
        userId: 'current_user',
        username: 'Tú',
        level: this.userStats.level,
        xp: this.userStats.totalXP,
        streak: this.userStats.streak,
        accuracy: 85, // Would calculate from real data
        rank: 1,
        badgeCount: this.userStats.badges.filter(b => b.unlockedAt).length,
        lastActive: new Date()
      }
      // Add more simulated users...
    ];
  }

  getLeaderboard(): LeaderboardEntry[] {
    return this.leaderboard;
  }
}

// Singleton instance
export const advancedGamificationService = new AdvancedGamificationService();
export default advancedGamificationService;