import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class GamificationService {
  constructor() {
    this.STORAGE_KEYS = {
      PLAYER_DATA: '@player_data',
      LEVEL_PROGRESS: '@level_progress',
      ACHIEVEMENTS: '@achievements'
    };
    
    this.SKILL_TREES = {
      FRONTEND: {
        id: 'frontend',
        name: 'Frontend Mastery',
        icon: '⚛️',
        color: '#61DAFB',
        levels: [
          { id: 'react-basics', name: 'React Fundamentals', xp: 100, unlocked: true },
          { id: 'react-hooks', name: 'React Hooks Mastery', xp: 200, unlocked: false },
          { id: 'state-management', name: 'State Management', xp: 300, unlocked: false },
          { id: 'performance', name: 'React Performance', xp: 400, unlocked: false },
          { id: 'next-js', name: 'Next.js Expert', xp: 500, unlocked: false }
        ]
      },
      BACKEND: {
        id: 'backend',
        name: 'Backend Engineering',
        icon: '🔧',
        color: '#512BD4',
        levels: [
          { id: 'dotnet-core', name: '.NET Core Basics', xp: 100, unlocked: true },
          { id: 'web-apis', name: 'Web APIs Mastery', xp: 200, unlocked: false },
          { id: 'microservices', name: 'Microservices', xp: 300, unlocked: false },
          { id: 'cqrs', name: 'CQRS & Event Sourcing', xp: 400, unlocked: false },
          { id: 'architecture', name: 'System Architecture', xp: 500, unlocked: false }
        ]
      },
      DATABASE: {
        id: 'database',
        name: 'Database Expertise',
        icon: '🗄️',
        color: '#CC2927',
        levels: [
          { id: 'sql-basics', name: 'SQL Fundamentals', xp: 100, unlocked: true },
          { id: 'ef-core', name: 'Entity Framework', xp: 200, unlocked: false },
          { id: 'optimization', name: 'Query Optimization', xp: 300, unlocked: false },
          { id: 'nosql', name: 'NoSQL Databases', xp: 400, unlocked: false },
          { id: 'data-architecture', name: 'Data Architecture', xp: 500, unlocked: false }
        ]
      },
      CLOUD: {
        id: 'cloud',
        name: 'Cloud Mastery',
        icon: '☁️',
        color: '#0078D4',
        levels: [
          { id: 'azure-basics', name: 'Azure Fundamentals', xp: 100, unlocked: false },
          { id: 'azure-functions', name: 'Serverless Computing', xp: 200, unlocked: false },
          { id: 'containers', name: 'Containerization', xp: 300, unlocked: false },
          { id: 'devops', name: 'DevOps & CI/CD', xp: 400, unlocked: false },
          { id: 'infrastructure', name: 'Infrastructure as Code', xp: 500, unlocked: false }
        ]
      },
      SECURITY: {
        id: 'security',
        name: 'Security Expert',
        icon: '🛡️',
        color: '#FF6B35',
        levels: [
          { id: 'auth-basics', name: 'Authentication Basics', xp: 100, unlocked: false },
          { id: 'oauth', name: 'OAuth & JWT', xp: 200, unlocked: false },
          { id: 'security-patterns', name: 'Security Patterns', xp: 300, unlocked: false },
          { id: 'penetration', name: 'Security Testing', xp: 400, unlocked: false },
          { id: 'compliance', name: 'Compliance & Standards', xp: 500, unlocked: false }
        ]
      },
      LEADERSHIP: {
        id: 'leadership',
        name: 'Tech Leadership',
        icon: '👑',
        color: '#FFD700',
        levels: [
          { id: 'code-review', name: 'Code Review Mastery', xp: 100, unlocked: false },
          { id: 'mentoring', name: 'Developer Mentoring', xp: 200, unlocked: false },
          { id: 'project-mgmt', name: 'Project Management', xp: 300, unlocked: false },
          { id: 'team-lead', name: 'Team Leadership', xp: 400, unlocked: false },
          { id: 'tech-strategy', name: 'Technical Strategy', xp: 500, unlocked: false }
        ]
      }
    };

    this.ACHIEVEMENTS = [
      { id: 'first-question', name: 'First Steps', description: 'Answer your first question', icon: '🎯', xp: 50 },
      { id: 'streak-5', name: 'On Fire!', description: 'Get 5 correct answers in a row', icon: '🔥', xp: 100 },
      { id: 'streak-10', name: 'Unstoppable', description: 'Get 10 correct answers in a row', icon: '💥', xp: 200 },
      { id: 'level-master', name: 'Level Master', description: 'Complete your first skill level', icon: '⭐', xp: 150 },
      { id: 'speed-demon', name: 'Speed Demon', description: 'Answer 10 questions in under 5 minutes', icon: '⚡', xp: 200 },
      { id: 'perfectionist', name: 'Perfectionist', description: 'Get 100% accuracy in a session', icon: '💎', xp: 300 },
      { id: 'knowledge-seeker', name: 'Knowledge Seeker', description: 'Complete 50 questions', icon: '📚', xp: 250 },
      { id: 'job-ready', name: 'Job Ready', description: 'Complete a job-specific training', icon: '💼', xp: 400 },
      { id: 'voice-master', name: 'Voice Master', description: 'Use voice commands 25 times', icon: '🎤', xp: 150 },
      { id: 'explorer', name: 'Explorer', description: 'Unlock all skill trees', icon: '🗺️', xp: 500 }
    ];
  }

  async getPlayerData() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PLAYER_DATA);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Datos iniciales del jugador
      const initialData = {
        level: 1,
        xp: 0,
        totalXp: 0,
        xpToNext: 1000,
        streak: 0,
        maxStreak: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        sessionsCompleted: 0,
        voiceCommandsUsed: 0,
        joinDate: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        title: 'Novice Developer'
      };
      
      await this.savePlayerData(initialData);
      return initialData;
    } catch (error) {
      console.error('Error loading player data:', error);
      return null;
    }
  }

  async savePlayerData(data) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.PLAYER_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving player data:', error);
    }
  }

  async getLevelProgress() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.LEVEL_PROGRESS);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Progreso inicial - solo algunos niveles desbloqueados
      const initialProgress = {};
      Object.keys(this.SKILL_TREES).forEach(treeKey => {
        initialProgress[treeKey] = {};
        this.SKILL_TREES[treeKey].levels.forEach(level => {
          initialProgress[treeKey][level.id] = {
            unlocked: level.unlocked,
            completed: false,
            progress: 0,
            bestScore: 0,
            attempts: 0
          };
        });
      });
      
      await this.saveLevelProgress(initialProgress);
      return initialProgress;
    } catch (error) {
      console.error('Error loading level progress:', error);
      return {};
    }
  }

  async saveLevelProgress(progress) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.LEVEL_PROGRESS, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving level progress:', error);
    }
  }

  async getAchievements() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.ACHIEVEMENTS);
      if (stored) {
        return JSON.parse(stored);
      }
      
      const initialAchievements = {};
      this.ACHIEVEMENTS.forEach(achievement => {
        initialAchievements[achievement.id] = {
          unlocked: false,
          unlockedAt: null
        };
      });
      
      await this.saveAchievements(initialAchievements);
      return initialAchievements;
    } catch (error) {
      console.error('Error loading achievements:', error);
      return {};
    }
  }

  async saveAchievements(achievements) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    } catch (error) {
      console.error('Error saving achievements:', error);
    }
  }

  async awardXP(amount, reason = '') {
    try {
      const playerData = await this.getPlayerData();
      const oldLevel = playerData.level;
      
      playerData.xp += amount;
      playerData.totalXp += amount;
      playerData.lastActive = new Date().toISOString();
      
      // Calcular nuevo nivel
      const newLevel = this.calculateLevel(playerData.totalXp);
      const leveledUp = newLevel > oldLevel;
      
      if (leveledUp) {
        playerData.level = newLevel;
        playerData.title = this.getTitleForLevel(newLevel);
      }
      
      playerData.xpToNext = this.getXpToNextLevel(playerData.totalXp);
      
      await this.savePlayerData(playerData);
      
      return {
        xpAwarded: amount,
        leveledUp,
        newLevel: playerData.level,
        newTitle: playerData.title,
        reason
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }

  calculateLevel(totalXp) {
    // Fórmula progresiva: cada nivel requiere más XP
    return Math.floor(Math.sqrt(totalXp / 100)) + 1;
  }

  getXpToNextLevel(totalXp) {
    const currentLevel = this.calculateLevel(totalXp);
    const nextLevelXp = Math.pow(currentLevel, 2) * 100;
    return nextLevelXp - totalXp;
  }

  getTitleForLevel(level) {
    const titles = [
      'Novice Developer',
      'Junior Developer', 
      'Developer',
      'Senior Developer',
      'Lead Developer',
      'Principal Engineer',
      'Staff Engineer',
      'Distinguished Engineer',
      'Technical Fellow',
      'Code Wizard',
      'Programming Legend'
    ];
    
    const index = Math.min(Math.floor((level - 1) / 2), titles.length - 1);
    return titles[index];
  }

  async checkAchievements(stats) {
    try {
      const achievements = await this.getAchievements();
      const newAchievements = [];
      
      // First question
      if (!achievements['first-question'].unlocked && stats.questionsAnswered >= 1) {
        await this.unlockAchievement('first-question');
        newAchievements.push('first-question');
      }
      
      // Streak achievements
      if (!achievements['streak-5'].unlocked && stats.streak >= 5) {
        await this.unlockAchievement('streak-5');
        newAchievements.push('streak-5');
      }
      
      if (!achievements['streak-10'].unlocked && stats.streak >= 10) {
        await this.unlockAchievement('streak-10');
        newAchievements.push('streak-10');
      }
      
      // Speed demon (implement timer logic in app)
      // Perfectionist (implement accuracy tracking)
      // Knowledge seeker
      if (!achievements['knowledge-seeker'].unlocked && stats.questionsAnswered >= 50) {
        await this.unlockAchievement('knowledge-seeker');
        newAchievements.push('knowledge-seeker');
      }
      
      // Voice master
      if (!achievements['voice-master'].unlocked && stats.voiceCommandsUsed >= 25) {
        await this.unlockAchievement('voice-master');
        newAchievements.push('voice-master');
      }
      
      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  async unlockAchievement(achievementId) {
    try {
      const achievements = await this.getAchievements();
      achievements[achievementId] = {
        unlocked: true,
        unlockedAt: new Date().toISOString()
      };
      
      await this.saveAchievements(achievements);
      
      const achievement = this.ACHIEVEMENTS.find(a => a.id === achievementId);
      if (achievement) {
        await this.awardXP(achievement.xp, `Achievement: ${achievement.name}`);
        return achievement;
      }
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
    return null;
  }

  async completeLevel(skillTree, levelId, score) {
    try {
      const progress = await this.getLevelProgress();
      const levelProgress = progress[skillTree][levelId];
      
      levelProgress.completed = true;
      levelProgress.attempts += 1;
      levelProgress.bestScore = Math.max(levelProgress.bestScore, score);
      
      // Desbloquear siguiente nivel
      const tree = this.SKILL_TREES[skillTree];
      const currentLevelIndex = tree.levels.findIndex(l => l.id === levelId);
      if (currentLevelIndex < tree.levels.length - 1) {
        const nextLevel = tree.levels[currentLevelIndex + 1];
        progress[skillTree][nextLevel.id].unlocked = true;
      }
      
      await this.saveLevelProgress(progress);
      
      // Award XP based on level difficulty
      const level = tree.levels[currentLevelIndex];
      const xpAwarded = level.xp + (score * 10); // Bonus for high scores
      
      return await this.awardXP(xpAwarded, `Completed ${level.name}`);
    } catch (error) {
      console.error('Error completing level:', error);
      return null;
    }
  }

  getSkillTrees() {
    return this.SKILL_TREES;
  }

  getAchievementDefinitions() {
    return this.ACHIEVEMENTS;
  }

  async updateStats(updates) {
    try {
      const playerData = await this.getPlayerData();
      
      Object.keys(updates).forEach(key => {
        if (key in playerData) {
          playerData[key] = updates[key];
        }
      });
      
      playerData.lastActive = new Date().toISOString();
      await this.savePlayerData(playerData);
      
      // Check for new achievements
      const newAchievements = await this.checkAchievements(playerData);
      
      return { playerData, newAchievements };
    } catch (error) {
      console.error('Error updating stats:', error);
      return null;
    }
  }
}

export default new GamificationService();