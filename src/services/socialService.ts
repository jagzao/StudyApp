import { supabase, LeaderboardEntry, Challenge, ChallengeParticipant } from './supabaseClient';
import { authService } from './authService';
import { databaseService } from './databaseService.platform';
import { notificationService } from './notificationService';

interface SocialStats {
  rank: number;
  weeklyRank: number;
  totalUsers: number;
  friendsCount: number;
  challengesWon: number;
  averageAccuracy: number;
  studyStreak: number;
}

interface UserActivity {
  id: string;
  userId: string;
  username: string;
  type: 'level_up' | 'achievement' | 'streak_milestone' | 'challenge_win';
  title: string;
  description: string;
  timestamp: Date;
  isPublic: boolean;
}

interface StudyBuddy {
  id: string;
  username: string;
  level: number;
  streak: number;
  commonCategories: string[];
  studyCompatibility: number; // 0-1 score
  lastActive: Date;
  isOnline: boolean;
}

class SocialService {
  private currentUserStats: SocialStats | null = null;
  private friendsList: StudyBuddy[] = [];
  private recentActivities: UserActivity[] = [];

  async initialize(): Promise<void> {
    try {
      if (authService.isAuthenticated()) {
        await this.loadUserSocialStats();
        await this.loadRecentActivities();
      }
      
      console.log('👥 Social Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Social Service:', error);
    }
  }

  // ==================== LEADERBOARD SYSTEM ====================

  async getGlobalLeaderboard(type: 'weekly' | 'monthly' | 'alltime' = 'weekly'): Promise<LeaderboardEntry[]> {
    try {
      const column = type === 'weekly' ? 'weekly_xp' : 
                   type === 'monthly' ? 'monthly_xp' : 'xp';

      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order(column, { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      return [];
    }
  }

  async updateUserRanking(): Promise<void> {
    try {
      const userId = authService.getUserId();
      const profile = authService.getCurrentProfile();
      
      if (!userId || !profile) return;

      const analytics = await databaseService.getStudyAnalytics(30);
      
      // Calculate weekly XP (simplified - last 7 days activity)
      const weeklyXP = Math.floor(profile.xp * 0.1); // Approximate
      
      const { error } = await supabase
        .from('leaderboard')
        .upsert({
          user_id: userId,
          username: profile.username,
          level: profile.level,
          xp: profile.xp,
          streak: profile.streak,
          weekly_xp: weeklyXP,
          monthly_xp: weeklyXP * 4, // Approximate
          questions_answered: profile.questions_answered,
          accuracy: analytics.accuracy,
        });

      if (error) {
        console.error('Failed to update ranking:', error);
      } else {
        await this.calculateUserRank();
      }
    } catch (error) {
      console.error('Error updating user ranking:', error);
    }
  }

  private async calculateUserRank(): Promise<void> {
    try {
      const userId = authService.getUserId();
      if (!userId) return;

      // Get user's position in weekly leaderboard
      const { data, error } = await supabase
        .from('leaderboard')
        .select('user_id, weekly_xp')
        .order('weekly_xp', { ascending: false });

      if (!error && data) {
        const userIndex = data.findIndex(entry => entry.user_id === userId);
        const rank = userIndex + 1;

        // Update local stats
        if (this.currentUserStats) {
          this.currentUserStats.rank = rank;
          this.currentUserStats.totalUsers = data.length;
        }
      }
    } catch (error) {
      console.error('Error calculating user rank:', error);
    }
  }

  async getUserRank(userId: string): Promise<{ rank: number; totalUsers: number }> {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('user_id')
        .order('weekly_xp', { ascending: false });

      if (error || !data) {
        return { rank: 0, totalUsers: 0 };
      }

      const userIndex = data.findIndex(entry => entry.user_id === userId);
      return {
        rank: userIndex >= 0 ? userIndex + 1 : 0,
        totalUsers: data.length,
      };
    } catch (error) {
      console.error('Error getting user rank:', error);
      return { rank: 0, totalUsers: 0 };
    }
  }

  // ==================== CHALLENGES SYSTEM ====================

  async getActiveClallenges(): Promise<Challenge[]> {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Failed to load challenges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error loading challenges:', error);
      return [];
    }
  }

  async createChallenge(challenge: {
    title: string;
    description: string;
    type: string;
    duration: number; // hours
    maxParticipants: number;
    questions: string[];
    rewardXP: number;
  }): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + challenge.duration * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('challenges')
        .insert({
          title: challenge.title,
          description: challenge.description,
          type: challenge.type,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          max_participants: challenge.maxParticipants,
          questions: challenge.questions,
          reward_xp: challenge.rewardXP,
          created_by: userId,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, challengeId: data.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async joinChallenge(challengeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if already joined
      const { data: existing } = await supabase
        .from('challenge_participants')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return { success: false, error: 'Already joined this challenge' };
      }

      // Join challenge
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          score: 0,
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Update participant count
      await supabase.rpc('increment_challenge_participants', {
        challenge_id: challengeId
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async submitChallengeScore(challengeId: string, score: number): Promise<{ success: boolean; position?: number }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { success: false };
      }

      // Update score
      const { error } = await supabase
        .from('challenge_participants')
        .update({
          score,
          completed_at: new Date().toISOString(),
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to submit score:', error);
        return { success: false };
      }

      // Calculate position
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('score')
        .eq('challenge_id', challengeId)
        .order('score', { ascending: false });

      const position = participants ? participants.findIndex(p => p.score <= score) + 1 : 1;

      // Update position
      await supabase
        .from('challenge_participants')
        .update({ position })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      return { success: true, position };
    } catch (error) {
      console.error('Error submitting challenge score:', error);
      return { success: false };
    }
  }

  async getChallengeLeaderboard(challengeId: string): Promise<ChallengeParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          profiles (username, level)
        `)
        .eq('challenge_id', challengeId)
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load challenge leaderboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error loading challenge leaderboard:', error);
      return [];
    }
  }

  // ==================== STUDY BUDDIES ====================

  async findStudyBuddies(): Promise<StudyBuddy[]> {
    try {
      const userId = authService.getUserId();
      const userProfile = authService.getCurrentProfile();
      
      if (!userId || !userProfile) return [];

      const userAnalytics = await databaseService.getStudyAnalytics(30);
      const userCategories = userAnalytics.categoryBreakdown.map((c: any) => c.category);

      // Find users with similar level and interests
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .gte('level', Math.max(1, userProfile.level - 2))
        .lte('level', userProfile.level + 2)
        .limit(20);

      if (error) {
        console.error('Failed to find study buddies:', error);
        return [];
      }

      // Calculate compatibility and return matched buddies
      const buddies: StudyBuddy[] = [];
      
      for (const profile of data || []) {
        const commonCategories = profile.preferred_categories.filter((cat: string) =>
          userCategories.includes(cat)
        );
        
        const compatibility = this.calculateStudyCompatibility(
          userProfile,
          profile,
          commonCategories.length
        );

        if (compatibility > 0.3) { // Minimum compatibility threshold
          buddies.push({
            id: profile.id,
            username: profile.username,
            level: profile.level,
            streak: profile.streak,
            commonCategories,
            studyCompatibility: compatibility,
            lastActive: new Date(profile.updated_at),
            isOnline: false, // Would need real-time presence system
          });
        }
      }

      // Sort by compatibility
      buddies.sort((a, b) => b.studyCompatibility - a.studyCompatibility);
      
      return buddies.slice(0, 10);
    } catch (error) {
      console.error('Error finding study buddies:', error);
      return [];
    }
  }

  private calculateStudyCompatibility(
    user1: any,
    user2: any,
    commonCategoriesCount: number
  ): number {
    let score = 0;

    // Level similarity (30%)
    const levelDiff = Math.abs(user1.level - user2.level);
    const levelScore = Math.max(0, 1 - levelDiff / 10);
    score += levelScore * 0.3;

    // Common interests (40%)
    const interestScore = Math.min(1, commonCategoriesCount / 3);
    score += interestScore * 0.4;

    // Study consistency (streak similarity) (20%)
    const streakDiff = Math.abs(user1.streak - user2.streak);
    const streakScore = Math.max(0, 1 - streakDiff / 30);
    score += streakScore * 0.2;

    // Study goal similarity (10%)
    const goalDiff = Math.abs(user1.study_goal_minutes - user2.study_goal_minutes);
    const goalScore = Math.max(0, 1 - goalDiff / 60);
    score += goalScore * 0.1;

    return Math.min(1, score);
  }

  async sendStudyBuddyRequest(buddyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = authService.getUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // In a real app, you'd have a friend_requests table
      // For now, we'll just simulate the request
      console.log(`Study buddy request sent from ${userId} to ${buddyId}`);
      
      // Send notification to the potential buddy
      await notificationService.sendPushToUser(
        buddyId,
        '👥 Nueva solicitud de Study Buddy',
        `${authService.getCurrentProfile()?.username} quiere ser tu compañero de estudio`,
        { type: 'buddy_request', fromUserId: userId }
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ==================== ACTIVITY FEED ====================

  async getActivityFeed(limit: number = 20): Promise<UserActivity[]> {
    try {
      // In a real app, you'd have an activities table
      // For now, we'll generate mock activities based on recent data
      
      const activities: UserActivity[] = [];
      
      // Get recent achievements from leaderboard changes
      const { data: recentUsers, error } = await supabase
        .from('leaderboard')
        .select('user_id, username, level, streak, xp')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (!error && recentUsers) {
        for (const user of recentUsers) {
          // Simulate different activity types
          if (user.level > 5) {
            activities.push({
              id: `activity_${user.user_id}_level`,
              userId: user.user_id,
              username: user.username,
              type: 'level_up',
              title: `¡Subió a nivel ${user.level}!`,
              description: `${user.username} alcanzó el nivel ${user.level}`,
              timestamp: new Date(Date.now() - Math.random() * 86400000), // Random within last day
              isPublic: true,
            });
          }
          
          if (user.streak >= 7) {
            activities.push({
              id: `activity_${user.user_id}_streak`,
              userId: user.user_id,
              username: user.username,
              type: 'streak_milestone',
              title: `🔥 Racha de ${user.streak} días`,
              description: `${user.username} mantiene una racha de ${user.streak} días estudiando`,
              timestamp: new Date(Date.now() - Math.random() * 86400000),
              isPublic: true,
            });
          }
        }
      }

      // Sort by timestamp
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return activities.slice(0, limit);
    } catch (error) {
      console.error('Error loading activity feed:', error);
      return [];
    }
  }

  async shareAchievement(achievement: {
    type: string;
    title: string;
    description: string;
  }): Promise<{ success: boolean }> {
    try {
      const userId = authService.getUserId();
      const profile = authService.getCurrentProfile();
      
      if (!userId || !profile) {
        return { success: false };
      }

      // In a real app, you'd insert into an activities table
      console.log('Sharing achievement:', {
        userId,
        username: profile.username,
        ...achievement,
      });

      // Add to local activities
      this.recentActivities.unshift({
        id: `activity_${userId}_${Date.now()}`,
        userId,
        username: profile.username,
        type: achievement.type as any,
        title: achievement.title,
        description: achievement.description,
        timestamp: new Date(),
        isPublic: true,
      });

      return { success: true };
    } catch (error) {
      console.error('Error sharing achievement:', error);
      return { success: false };
    }
  }

  // ==================== SOCIAL STATS ====================

  private async loadUserSocialStats(): Promise<void> {
    try {
      const userId = authService.getUserId();
      if (!userId) return;

      const rankData = await this.getUserRank(userId);
      const profile = authService.getCurrentProfile();
      const analytics = await databaseService.getStudyAnalytics(30);

      this.currentUserStats = {
        rank: rankData.rank,
        weeklyRank: rankData.rank, // Simplified
        totalUsers: rankData.totalUsers,
        friendsCount: 0, // Would load from friends table
        challengesWon: 0, // Would load from challenge history
        averageAccuracy: analytics.accuracy,
        studyStreak: profile?.streak || 0,
      };
    } catch (error) {
      console.error('Error loading social stats:', error);
    }
  }

  private async loadRecentActivities(): Promise<void> {
    try {
      this.recentActivities = await this.getActivityFeed(10);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  }

  getSocialStats(): SocialStats | null {
    return this.currentUserStats;
  }

  getRecentActivities(): UserActivity[] {
    return [...this.recentActivities];
  }

  // ==================== SOCIAL SHARING ====================

  generateShareMessage(achievement: {
    type: string;
    title: string;
    level?: number;
    streak?: number;
    category?: string;
  }): string {
    const baseMessage = `🚀 ¡Logré ${achievement.title} en Study AI!`;
    
    switch (achievement.type) {
      case 'level_up':
        return `${baseMessage} Ahora soy nivel ${achievement.level}! 🎯 #StudyAI #TechLearning`;
      case 'streak_milestone':
        return `${baseMessage} ${achievement.streak} días consecutivos estudiando! 🔥 #Consistency #StudyAI`;
      case 'category_mastery':
        return `${baseMessage} He dominado ${achievement.category}! 💪 #Programming #StudyAI`;
      default:
        return `${baseMessage} #StudyAI #Learning`;
    }
  }

  async shareOnSocialMedia(platform: 'twitter' | 'linkedin' | 'facebook', message: string): Promise<void> {
    // In a real app, you'd integrate with social media APIs
    console.log(`Sharing on ${platform}:`, message);
    
    // Open social media app with pre-filled message
    const encodedMessage = encodeURIComponent(message);
    let url = '';
    
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedMessage}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedMessage}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedMessage}`;
        break;
    }
    
    console.log('Would open URL:', url);
  }
}

// Singleton instance
export const socialService = new SocialService();
export default socialService;