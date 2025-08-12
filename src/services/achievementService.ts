import { supabase, Achievement } from './supabaseClient';
import { authService } from './authService';
import { databaseService } from './databaseService.platform';
import { notificationService } from './notificationService';
import { socialService } from './socialService';

interface AchievementDefinition {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  maxProgress: number;
  rewardXP: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  conditions: AchievementCondition[];
  isSecret: boolean;
  unlocksFeature?: string;
}

interface AchievementCondition {
  type: 'streak' | 'questions_answered' | 'accuracy' | 'category_mastery' | 'level' | 'time_based' | 'social' | 'special';
  target: number;
  category?: string;
  timeFrame?: number; // days
  operation?: 'gte' | 'lte' | 'eq';
}

interface AchievementProgress {
  achievementId: string;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  milestones: number[];
}

class AchievementService {
  private achievementDefinitions: AchievementDefinition[] = [];
  private userAchievements: Map<string, AchievementProgress> = new Map();
  private lastCheckTimestamp: Date | null = null;

  async initialize(): Promise<void> {
    try {
      this.initializeAchievementDefinitions();
      await this.loadUserAchievements();
      
      console.log('🏆 Achievement Service initialized with', this.achievementDefinitions.length, 'achievements');
    } catch (error) {
      console.error('❌ Failed to initialize Achievement Service:', error);
    }
  }

  // ==================== ACHIEVEMENT DEFINITIONS ====================

  private initializeAchievementDefinitions(): void {
    this.achievementDefinitions = [
      // STREAK ACHIEVEMENTS
      {
        id: 'first_steps',
        type: 'streak',
        title: 'Primeros Pasos',
        description: 'Estudia por primera vez',
        icon: '👶',
        category: 'progression',
        maxProgress: 1,
        rewardXP: 50,
        rarity: 'common',
        conditions: [{ type: 'questions_answered', target: 1, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'consistency_king',
        type: 'streak',
        title: 'Rey de la Consistencia',
        description: 'Mantén una racha de 30 días',
        icon: '👑',
        category: 'streak',
        maxProgress: 30,
        rewardXP: 1000,
        rarity: 'epic',
        conditions: [{ type: 'streak', target: 30, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'weekly_warrior',
        type: 'streak',
        title: 'Guerrero Semanal',
        description: 'Estudia 7 días seguidos',
        icon: '⚔️',
        category: 'streak',
        maxProgress: 7,
        rewardXP: 200,
        rarity: 'rare',
        conditions: [{ type: 'streak', target: 7, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'century_club',
        type: 'streak',
        title: 'Club del Centenario',
        description: 'Increíble racha de 100 días',
        icon: '🔥',
        category: 'streak',
        maxProgress: 100,
        rewardXP: 5000,
        rarity: 'legendary',
        conditions: [{ type: 'streak', target: 100, operation: 'gte' }],
        isSecret: true,
        unlocksFeature: 'premium_tutor_access',
      },

      // MASTERY ACHIEVEMENTS
      {
        id: 'js_apprentice',
        type: 'category_mastery',
        title: 'Aprendiz de JavaScript',
        description: '80% precisión en JavaScript con 20+ preguntas',
        icon: '🟨',
        category: 'mastery',
        maxProgress: 100,
        rewardXP: 300,
        rarity: 'rare',
        conditions: [
          { type: 'accuracy', target: 80, category: 'JavaScript', operation: 'gte' },
          { type: 'questions_answered', target: 20, category: 'JavaScript', operation: 'gte' }
        ],
        isSecret: false,
      },
      {
        id: 'react_master',
        type: 'category_mastery',
        title: 'Maestro de React',
        description: '90% precisión en React con 50+ preguntas',
        icon: '⚛️',
        category: 'mastery',
        maxProgress: 100,
        rewardXP: 500,
        rarity: 'epic',
        conditions: [
          { type: 'accuracy', target: 90, category: 'React', operation: 'gte' },
          { type: 'questions_answered', target: 50, category: 'React', operation: 'gte' }
        ],
        isSecret: false,
      },
      {
        id: 'full_stack_guru',
        type: 'category_mastery',
        title: 'Gurú Full Stack',
        description: 'Domina 5 categorías diferentes con 85%+ precisión',
        icon: '🚀',
        category: 'mastery',
        maxProgress: 5,
        rewardXP: 2000,
        rarity: 'legendary',
        conditions: [
          { type: 'category_mastery', target: 5, operation: 'gte' }
        ],
        isSecret: false,
        unlocksFeature: 'advanced_analytics',
      },

      // PRODUCTIVITY ACHIEVEMENTS
      {
        id: 'speed_demon',
        type: 'special',
        title: 'Demonio de Velocidad',
        description: 'Responde 10 preguntas en menos de 5 minutos',
        icon: '⚡',
        category: 'productivity',
        maxProgress: 1,
        rewardXP: 150,
        rarity: 'rare',
        conditions: [{ type: 'special', target: 1, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'marathon_runner',
        type: 'time_based',
        title: 'Corredor de Maratón',
        description: 'Estudia por más de 2 horas en un día',
        icon: '🏃',
        category: 'productivity',
        maxProgress: 120, // minutes
        rewardXP: 400,
        rarity: 'epic',
        conditions: [{ type: 'time_based', target: 120, timeFrame: 1, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'early_bird',
        type: 'time_based',
        title: 'Madrugador',
        description: 'Estudia antes de las 7 AM por 5 días consecutivos',
        icon: '🐦',
        category: 'productivity',
        maxProgress: 5,
        rewardXP: 300,
        rarity: 'rare',
        conditions: [{ type: 'time_based', target: 5, operation: 'gte' }],
        isSecret: false,
        unlocksFeature: 'morning_boost_multiplier',
      },

      // LEVEL ACHIEVEMENTS
      {
        id: 'level_5_warrior',
        type: 'level',
        title: 'Guerrero Nivel 5',
        description: 'Alcanza el nivel 5',
        icon: '🥉',
        category: 'progression',
        maxProgress: 5,
        rewardXP: 250,
        rarity: 'common',
        conditions: [{ type: 'level', target: 5, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'level_15_champion',
        type: 'level',
        title: 'Campeón Nivel 15',
        description: 'Alcanza el nivel 15',
        icon: '🥈',
        category: 'progression',
        maxProgress: 15,
        rewardXP: 750,
        rarity: 'rare',
        conditions: [{ type: 'level', target: 15, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'level_30_legend',
        type: 'level',
        title: 'Leyenda Nivel 30',
        description: 'Alcanza el nivel 30',
        icon: '🥇',
        category: 'progression',
        maxProgress: 30,
        rewardXP: 1500,
        rarity: 'epic',
        conditions: [{ type: 'level', target: 30, operation: 'gte' }],
        isSecret: false,
        unlocksFeature: 'custom_study_paths',
      },

      // ACCURACY ACHIEVEMENTS
      {
        id: 'perfectionist',
        type: 'accuracy',
        title: 'Perfeccionista',
        description: '100% precisión en 10 preguntas consecutivas',
        icon: '💎',
        category: 'accuracy',
        maxProgress: 10,
        rewardXP: 400,
        rarity: 'epic',
        conditions: [{ type: 'special', target: 1, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'consistent_performer',
        type: 'accuracy',
        title: 'Rendimiento Consistente',
        description: 'Mantén 85%+ precisión por 30 días',
        icon: '📈',
        category: 'accuracy',
        maxProgress: 30,
        rewardXP: 800,
        rarity: 'epic',
        conditions: [{ type: 'accuracy', target: 85, timeFrame: 30, operation: 'gte' }],
        isSecret: false,
      },

      // SOCIAL ACHIEVEMENTS
      {
        id: 'team_player',
        type: 'social',
        title: 'Jugador de Equipo',
        description: 'Completa tu primer desafío grupal',
        icon: '🤝',
        category: 'social',
        maxProgress: 1,
        rewardXP: 200,
        rarity: 'rare',
        conditions: [{ type: 'social', target: 1, operation: 'gte' }],
        isSecret: false,
      },
      {
        id: 'community_contributor',
        type: 'social',
        title: 'Contribuidor de la Comunidad',
        description: 'Comparte 10 flashcards públicas',
        icon: '🌟',
        category: 'social',
        maxProgress: 10,
        rewardXP: 500,
        rarity: 'rare',
        conditions: [{ type: 'social', target: 10, operation: 'gte' }],
        isSecret: false,
      },

      // SECRET ACHIEVEMENTS
      {
        id: 'night_owl',
        type: 'time_based',
        title: 'Búho Nocturno',
        description: 'Estudia después de medianoche por 7 días',
        icon: '🦉',
        category: 'productivity',
        maxProgress: 7,
        rewardXP: 350,
        rarity: 'rare',
        conditions: [{ type: 'time_based', target: 7, operation: 'gte' }],
        isSecret: true,
      },
      {
        id: 'time_traveler',
        type: 'special',
        title: 'Viajero del Tiempo',
        description: 'Estudia en tu cumpleaños',
        icon: '🎂',
        category: 'special',
        maxProgress: 1,
        rewardXP: 200,
        rarity: 'rare',
        conditions: [{ type: 'special', target: 1, operation: 'gte' }],
        isSecret: true,
      },
    ];
  }

  // ==================== USER ACHIEVEMENTS MANAGEMENT ====================

  private async loadUserAchievements(): Promise<void> {
    try {
      const userId = authService.getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to load user achievements:', error);
        return;
      }

      this.userAchievements.clear();
      
      for (const achievement of data || []) {
        this.userAchievements.set(achievement.achievement_type, {
          achievementId: achievement.achievement_type,
          currentProgress: achievement.progress,
          unlocked: achievement.unlocked_at !== null,
          unlockedAt: achievement.unlocked_at ? new Date(achievement.unlocked_at) : undefined,
          milestones: [], // Would load from separate table
        });
      }
    } catch (error) {
      console.error('Error loading user achievements:', error);
    }
  }

  async checkAchievements(): Promise<Achievement[]> {
    const userId = authService.getUserId();
    if (!userId) return [];

    const newlyUnlocked: Achievement[] = [];
    
    try {
      // Get user data for checking conditions
      const profile = authService.getCurrentProfile();
      const analytics = await databaseService.getStudyAnalytics(30);
      
      for (const definition of this.achievementDefinitions) {
        const currentProgress = this.userAchievements.get(definition.id);
        
        if (currentProgress?.unlocked) {
          continue; // Already unlocked
        }

        const progress = await this.calculateProgress(definition, profile, analytics);
        
        if (progress >= definition.maxProgress) {
          // Achievement unlocked!
          const achievement = await this.unlockAchievement(definition);
          if (achievement) {
            newlyUnlocked.push(achievement);
          }
        } else {
          // Update progress
          await this.updateProgress(definition.id, progress);
        }
      }

      this.lastCheckTimestamp = new Date();
      
      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  private async calculateProgress(
    definition: AchievementDefinition,
    profile: any,
    analytics: any
  ): Promise<number> {
    let progress = 0;

    for (const condition of definition.conditions) {
      let conditionMet = false;

      switch (condition.type) {
        case 'streak':
          conditionMet = (profile?.streak || 0) >= condition.target;
          if (conditionMet) progress = profile?.streak || 0;
          break;

        case 'level':
          conditionMet = (profile?.level || 1) >= condition.target;
          if (conditionMet) progress = profile?.level || 1;
          break;

        case 'questions_answered':
          if (condition.category) {
            const categoryStats = analytics.categoryBreakdown.find(
              (c: any) => c.category === condition.category
            );
            const count = categoryStats?.count || 0;
            conditionMet = count >= condition.target;
            progress = Math.max(progress, count);
          } else {
            conditionMet = analytics.totalQuestions >= condition.target;
            progress = Math.max(progress, analytics.totalQuestions);
          }
          break;

        case 'accuracy':
          if (condition.category) {
            const categoryStats = analytics.categoryBreakdown.find(
              (c: any) => c.category === condition.category
            );
            const accuracy = categoryStats?.accuracy || 0;
            conditionMet = accuracy >= condition.target;
            progress = Math.max(progress, accuracy);
          } else {
            conditionMet = analytics.accuracy >= condition.target;
            progress = Math.max(progress, analytics.accuracy);
          }
          break;

        case 'category_mastery':
          const masteredCategories = analytics.categoryBreakdown.filter(
            (c: any) => c.accuracy >= 85 && c.count >= 20
          );
          conditionMet = masteredCategories.length >= condition.target;
          progress = Math.max(progress, masteredCategories.length);
          break;

        case 'time_based':
          // Would need to track study times - for now, approximate
          progress = Math.min(condition.target, profile?.total_study_time / 60 || 0);
          conditionMet = progress >= condition.target;
          break;

        case 'social':
          // Would need to track social activities - placeholder
          progress = 0;
          conditionMet = false;
          break;

        case 'special':
          // Special conditions handled case by case
          progress = await this.checkSpecialCondition(definition.id, condition);
          conditionMet = progress >= condition.target;
          break;
      }

      // All conditions must be met for achievement
      if (!conditionMet) {
        return progress;
      }
    }

    return definition.maxProgress;
  }

  private async checkSpecialCondition(achievementId: string, condition: AchievementCondition): Promise<number> {
    switch (achievementId) {
      case 'speed_demon':
        // Would track actual response times - placeholder
        return Math.random() > 0.8 ? 1 : 0;
      
      case 'perfectionist':
        // Would track consecutive correct answers - placeholder
        return Math.random() > 0.9 ? 10 : Math.floor(Math.random() * 9);
      
      case 'time_traveler':
        // Check if today is user's birthday (would need birthday in profile)
        const today = new Date();
        // Placeholder - assume random chance
        return Math.random() > 0.99 ? 1 : 0;
      
      default:
        return 0;
    }
  }

  private async unlockAchievement(definition: AchievementDefinition): Promise<Achievement | null> {
    try {
      const userId = authService.getUserId();
      if (!userId) return null;

      const { data, error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_type: definition.id,
          title: definition.title,
          description: definition.description,
          icon: definition.icon,
          unlocked_at: new Date().toISOString(),
          progress: definition.maxProgress,
          max_progress: definition.maxProgress,
          reward_xp: definition.rewardXP,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to unlock achievement:', error);
        return null;
      }

      // Update local cache
      this.userAchievements.set(definition.id, {
        achievementId: definition.id,
        currentProgress: definition.maxProgress,
        unlocked: true,
        unlockedAt: new Date(),
        milestones: [],
      });

      // Award XP
      await authService.addXP(definition.rewardXP, `achievement_${definition.id}`);

      // Send notification
      await notificationService.celebrateAchievement(definition.title, definition.rewardXP);

      // Share to social feed
      await socialService.shareAchievement({
        type: 'achievement',
        title: definition.title,
        description: definition.description,
      });

      console.log(`🏆 Achievement unlocked: ${definition.title} (+${definition.rewardXP} XP)`);

      return data;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return null;
    }
  }

  private async updateProgress(achievementId: string, progress: number): Promise<void> {
    try {
      const userId = authService.getUserId();
      if (!userId) return;

      await supabase
        .from('achievements')
        .upsert({
          user_id: userId,
          achievement_type: achievementId,
          progress,
        });

      // Update local cache
      const current = this.userAchievements.get(achievementId);
      if (current) {
        current.currentProgress = progress;
      }
    } catch (error) {
      console.error('Error updating achievement progress:', error);
    }
  }

  // ==================== PUBLIC API ====================

  async triggerAchievementCheck(): Promise<Achievement[]> {
    return await this.checkAchievements();
  }

  getAchievementDefinitions(includeSecret: boolean = false): AchievementDefinition[] {
    return this.achievementDefinitions.filter(def => 
      includeSecret || !def.isSecret
    );
  }

  getUserAchievements(): Array<AchievementDefinition & { progress: number; unlocked: boolean; unlockedAt?: Date }> {
    return this.achievementDefinitions.map(def => {
      const userProgress = this.userAchievements.get(def.id);
      return {
        ...def,
        progress: userProgress?.currentProgress || 0,
        unlocked: userProgress?.unlocked || false,
        unlockedAt: userProgress?.unlockedAt,
      };
    });
  }

  getUnlockedAchievements(): Array<AchievementDefinition & { unlockedAt: Date }> {
    return this.achievementDefinitions
      .map(def => {
        const userProgress = this.userAchievements.get(def.id);
        return userProgress?.unlocked ? {
          ...def,
          unlockedAt: userProgress.unlockedAt!
        } : null;
      })
      .filter(Boolean) as Array<AchievementDefinition & { unlockedAt: Date }>;
  }

  getAchievementsByCategory(category: string): AchievementDefinition[] {
    return this.achievementDefinitions.filter(def => def.category === category);
  }

  getAchievementProgress(achievementId: string): AchievementProgress | null {
    return this.userAchievements.get(achievementId) || null;
  }

  // ==================== ANALYTICS ====================

  getAchievementStats(): {
    totalAchievements: number;
    unlockedCount: number;
    completionRate: number;
    totalXPFromAchievements: number;
    rareAchievements: number;
    epicAchievements: number;
    legendaryAchievements: number;
  } {
    const totalAchievements = this.achievementDefinitions.length;
    const unlockedAchievements = Array.from(this.userAchievements.values())
      .filter(progress => progress.unlocked);
    
    const totalXP = unlockedAchievements.reduce((sum, progress) => {
      const def = this.achievementDefinitions.find(d => d.id === progress.achievementId);
      return sum + (def?.rewardXP || 0);
    }, 0);

    const byRarity = unlockedAchievements.reduce((counts, progress) => {
      const def = this.achievementDefinitions.find(d => d.id === progress.achievementId);
      if (def) {
        counts[def.rarity] = (counts[def.rarity] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);

    return {
      totalAchievements,
      unlockedCount: unlockedAchievements.length,
      completionRate: (unlockedAchievements.length / totalAchievements) * 100,
      totalXPFromAchievements: totalXP,
      rareAchievements: byRarity.rare || 0,
      epicAchievements: byRarity.epic || 0,
      legendaryAchievements: byRarity.legendary || 0,
    };
  }

  // ==================== MILESTONE REWARDS ====================

  async checkMilestoneRewards(): Promise<void> {
    const stats = this.getAchievementStats();
    
    // Special rewards for achievement milestones
    const milestones = [
      { count: 10, xp: 500, title: 'Coleccionista Novato' },
      { count: 25, xp: 1000, title: 'Coleccionista Experto' },
      { count: 50, xp: 2500, title: 'Coleccionista Maestro' },
    ];

    for (const milestone of milestones) {
      if (stats.unlockedCount >= milestone.count) {
        // Check if already rewarded (would need to track this)
        console.log(`Milestone reward: ${milestone.title} (+${milestone.xp} XP)`);
        // await authService.addXP(milestone.xp, `milestone_${milestone.count}`);
      }
    }
  }
}

// Singleton instance
export const achievementService = new AchievementService();
export default achievementService;