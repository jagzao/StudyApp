import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { socialService } from '../services/socialService';
import { authService } from '../services/authService';
import { COLORS } from '../constants/colors';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  level: number;
  xp: number;
  streak: number;
  weekly_xp: number;
  monthly_xp: number;
  questions_answered: number;
  accuracy: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  questions: string[];
  reward_xp: number;
  created_by: string;
  is_active: boolean;
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

type TabType = 'leaderboard' | 'challenges' | 'activity';

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [leaderboardType, setLeaderboardType] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRank, setUserRank] = useState<{ rank: number; totalUsers: number }>({ rank: 0, totalUsers: 0 });

  useEffect(() => {
    loadData();
  }, [activeTab, leaderboardType]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      if (activeTab === 'leaderboard') {
        const data = await socialService.getGlobalLeaderboard(leaderboardType);
        setLeaderboard(data);
        
        // Get current user's rank
        const userId = authService.getUserId();
        if (userId) {
          const rank = await socialService.getUserRank(userId);
          setUserRank(rank);
        }
      } else if (activeTab === 'challenges') {
        const data = await socialService.getActiveClallenges();
        setChallenges(data);
      } else if (activeTab === 'activity') {
        const data = await socialService.getActivityFeed();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'level_up': return '📈';
      case 'achievement': return '🏆';
      case 'streak_milestone': return '🔥';
      case 'challenge_win': return '👑';
      default: return '⭐';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `hace ${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `hace ${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `hace ${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const result = await socialService.joinChallenge(challengeId);
      if (result.success) {
        // Refresh challenges to show updated participant count
        loadData();
      } else {
        console.error('Failed to join challenge:', result.error);
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'leaderboard' && styles.activeTab]}
        onPress={() => setActiveTab('leaderboard')}
      >
        <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
          🏆 Rankings
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'challenges' && styles.activeTab]}
        onPress={() => setActiveTab('challenges')}
      >
        <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
          ⚔️ Desafíos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'activity' && styles.activeTab]}
        onPress={() => setActiveTab('activity')}
      >
        <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
          📰 Actividad
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLeaderboardFilters = () => (
    <View style={styles.filtersContainer}>
      {(['weekly', 'monthly', 'alltime'] as const).map((type) => (
        <TouchableOpacity
          key={type}
          style={[styles.filterButton, leaderboardType === type && styles.activeFilter]}
          onPress={() => setLeaderboardType(type)}
        >
          <Text style={[styles.filterText, leaderboardType === type && styles.activeFilterText]}>
            {type === 'weekly' ? 'Semanal' : type === 'monthly' ? 'Mensual' : 'Todo el tiempo'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUserRankCard = () => {
    if (userRank.rank === 0) return null;
    
    return (
      <View style={styles.userRankCard}>
        <Text style={styles.userRankText}>
          Tu posición: #{userRank.rank} de {userRank.totalUsers}
        </Text>
        <Text style={styles.userRankSubtext}>
          {userRank.rank <= 10 ? '🎉 ¡Top 10!' : userRank.rank <= 50 ? '⭐ Top 50!' : '💪 ¡Sigue mejorando!'}
        </Text>
      </View>
    );
  };

  const renderLeaderboard = () => (
    <View>
      {renderLeaderboardFilters()}
      {renderUserRankCard()}
      
      {leaderboard.map((entry, index) => (
        <View key={entry.user_id} style={styles.leaderboardItem}>
          <View style={styles.rankContainer}>
            <Text style={styles.rankText}>{getRankIcon(index + 1)}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>{entry.username}</Text>
            <Text style={styles.userStats}>
              Nivel {entry.level} • {entry.accuracy.toFixed(1)}% precisión • {entry.streak} días
            </Text>
          </View>
          
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>
              {leaderboardType === 'weekly' ? entry.weekly_xp : 
               leaderboardType === 'monthly' ? entry.monthly_xp : entry.xp} XP
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderChallenges = () => (
    <View>
      {challenges.map((challenge) => (
        <View key={challenge.id} style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeReward}>+{challenge.reward_xp} XP</Text>
          </View>
          
          <Text style={styles.challengeDescription}>{challenge.description}</Text>
          
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeInfoText}>
              👥 {challenge.current_participants || 0}/{challenge.max_participants} participantes
            </Text>
            <Text style={styles.challengeInfoText}>
              ⏰ Termina: {new Date(challenge.end_time).toLocaleDateString()}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => handleJoinChallenge(challenge.id)}
          >
            <Text style={styles.joinButtonText}>🚀 Unirse al Desafío</Text>
          </TouchableOpacity>
        </View>
      ))}
      
      {challenges.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            🎯 No hay desafíos activos en este momento
          </Text>
          <Text style={styles.emptyStateSubtext}>
            ¡Vuelve pronto para nuevos desafíos!
          </Text>
        </View>
      )}
    </View>
  );

  const renderActivity = () => (
    <View>
      {activities.map((activity) => (
        <View key={activity.id} style={styles.activityItem}>
          <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
          
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityDescription}>{activity.description}</Text>
            <Text style={styles.activityTime}>
              {formatTimeAgo(activity.timestamp)}
            </Text>
          </View>
        </View>
      ))}
      
      {activities.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            📱 No hay actividad reciente
          </Text>
          <Text style={styles.emptyStateSubtext}>
            ¡Sé el primero en compartir tus logros!
          </Text>
        </View>
      )}
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.neonBlue} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'leaderboard':
        return renderLeaderboard();
      case 'challenges':
        return renderChallenges();
      case 'activity':
        return renderActivity();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderTabButtons()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.neonBlue]}
            tintColor={COLORS.neonBlue}
          />
        }
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    margin: 15,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.neonBlue,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 10,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: COLORS.neonRed,
  },
  filterText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.white,
  },
  userRankCard: {
    backgroundColor: COLORS.neonBlue + '20',
    borderColor: COLORS.neonBlue,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  userRankText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userRankSubtext: {
    color: COLORS.neonBlue,
    fontSize: 14,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  username: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStats: {
    color: COLORS.gray,
    fontSize: 12,
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpText: {
    color: COLORS.neonBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  challengeCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.neonRed + '30',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  challengeReward: {
    color: COLORS.neonRed,
    fontSize: 14,
    fontWeight: '600',
  },
  challengeDescription: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 10,
  },
  challengeInfo: {
    marginBottom: 12,
  },
  challengeInfoText: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 2,
  },
  joinButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 8,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 15,
    alignSelf: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDescription: {
    color: COLORS.gray,
    fontSize: 13,
    marginBottom: 4,
  },
  activityTime: {
    color: COLORS.gray,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
  },
});