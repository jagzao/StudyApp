import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { anonymousUserService, AnonymousUser } from '../services/anonymousUserService';
import { socialService } from '../services/socialService';
import { achievementService } from '../services/achievementService';
import { databaseService } from '../services/databaseService.platform';
import { debugLogger, logUserAction } from '../utils/debugLogger';
import { COLORS } from '../constants/colors';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  questions_answered: number;
  accuracy: number;
  study_goal_minutes: number;
  avatar_url?: string;
}

interface SocialStats {
  rank: number;
  weeklyRank: number;
  totalUsers: number;
  friendsCount: number;
  challengesWon: number;
  averageAccuracy: number;
  studyStreak: number;
}

interface AchievementStats {
  totalAchievements: number;
  unlockedCount: number;
  completionRate: number;
  totalXPFromAchievements: number;
  rareAchievements: number;
  epicAchievements: number;
  legendaryAchievements: number;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [achievementStats, setAchievementStats] = useState<AchievementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);

      // Load user profile
      const userProfile = authService.getCurrentProfile();
      if (userProfile) {
        const accuracy = userProfile.questions_answered > 0 
          ? (userProfile.correct_answers / userProfile.questions_answered) * 100 
          : 0;
        
        setProfile({
          ...userProfile,
          accuracy: Math.round(accuracy),
          avatar_url: userProfile.avatar_url || undefined
        });
      }

      // Load social stats
      const stats = socialService.getSocialStats();
      setSocialStats(stats);

      // Load achievement stats
      const achievementData = achievementService.getAchievementStats();
      setAchievementStats(achievementData);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkedInImport = () => {
    Alert.alert(
      'Cargar desde LinkedIn',
      'Conecta tu perfil de LinkedIn para importar información profesional y generar preguntas personalizadas basadas en tu experiencia.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Conectar LinkedIn',
          onPress: async () => {
            try {
              // TODO: Implement LinkedIn OAuth integration
              Alert.alert('Próximamente', 'La integración con LinkedIn estará disponible pronto. Por ahora puedes copiar y pegar tu información profesional en la sección de Job Description.');
            } catch (error) {
              Alert.alert('Error', 'No se pudo conectar con LinkedIn');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              // Navigate back to login (would need navigation)
              console.log('Signed out successfully');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  const getXPForNextLevel = () => {
    if (!profile) return 0;
    return authService.getXPRequiredForLevel(profile.level + 1);
  };

  const getXPProgress = () => {
    if (!profile) return 0;
    const currentLevelXP = authService.getXPRequiredForLevel(profile.level);
    const nextLevelXP = authService.getXPRequiredForLevel(profile.level + 1);
    const progress = (profile.xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
    return Math.max(0, Math.min(1, progress));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{profile.level}</Text>
          </View>
        </View>

        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.email}>{profile.email}</Text>

        {/* XP Progress */}
        <View style={styles.xpContainer}>
          <Text style={styles.xpLabel}>XP: {profile.xp}</Text>
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpProgress,
                { width: `${getXPProgress() * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.xpNext}>
            Siguiente nivel: {getXPForNextLevel() - profile.xp} XP
          </Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>📊 Estadísticas de Estudio</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.streak}</Text>
            <Text style={styles.statLabel}>🔥 Racha</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.questions_answered}</Text>
            <Text style={styles.statLabel}>❓ Preguntas</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.accuracy.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>🎯 Precisión</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{profile.study_goal_minutes}</Text>
            <Text style={styles.statLabel}>⏰ Meta/día</Text>
          </View>
        </View>
      </View>

      {/* Social Stats Section */}
      {socialStats && (
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>👥 Estadísticas Sociales</Text>
          
          <View style={styles.socialGrid}>
            <View style={styles.socialCard}>
              <Text style={styles.socialNumber}>#{socialStats.rank}</Text>
              <Text style={styles.socialLabel}>Ranking Global</Text>
            </View>
            
            <View style={styles.socialCard}>
              <Text style={styles.socialNumber}>#{socialStats.weeklyRank}</Text>
              <Text style={styles.socialLabel}>Ranking Semanal</Text>
            </View>
            
            <View style={styles.socialCard}>
              <Text style={styles.socialNumber}>{socialStats.challengesWon}</Text>
              <Text style={styles.socialLabel}>🏆 Desafíos Ganados</Text>
            </View>
            
            <View style={styles.socialCard}>
              <Text style={styles.socialNumber}>{socialStats.totalUsers}</Text>
              <Text style={styles.socialLabel}>👤 Usuarios Totales</Text>
            </View>
          </View>
        </View>
      )}

      {/* Achievement Stats Section */}
      {achievementStats && (
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>🏆 Logros</Text>
          
          <View style={styles.achievementSummary}>
            <Text style={styles.achievementProgress}>
              {achievementStats.unlockedCount} / {achievementStats.totalAchievements} logros desbloqueados
            </Text>
            <Text style={styles.completionRate}>
              {achievementStats.completionRate.toFixed(1)}% completado
            </Text>
          </View>

          <View style={styles.achievementGrid}>
            <View style={styles.achievementCard}>
              <Text style={styles.achievementIcon}>🥉</Text>
              <Text style={styles.achievementCount}>{achievementStats.rareAchievements}</Text>
              <Text style={styles.achievementType}>Raros</Text>
            </View>
            
            <View style={styles.achievementCard}>
              <Text style={styles.achievementIcon}>🥈</Text>
              <Text style={styles.achievementCount}>{achievementStats.epicAchievements}</Text>
              <Text style={styles.achievementType}>Épicos</Text>
            </View>
            
            <View style={styles.achievementCard}>
              <Text style={styles.achievementIcon}>🥇</Text>
              <Text style={styles.achievementCount}>{achievementStats.legendaryAchievements}</Text>
              <Text style={styles.achievementType}>Legendarios</Text>
            </View>
          </View>

          <Text style={styles.totalXP}>
            +{achievementStats.totalXPFromAchievements} XP de logros
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={[styles.actionButton, styles.linkedinButton]} onPress={handleLinkedInImport}>
          <Text style={[styles.actionText, styles.linkedinText]}>💼 Cargar desde LinkedIn</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Edit profile')}>
          <Text style={styles.actionText}>✏️ Editar Perfil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => console.log('View achievements')}>
          <Text style={styles.actionText}>🏆 Ver Todos los Logros</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Study statistics')}>
          <Text style={styles.actionText}>📈 Estadísticas Detalladas</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Settings')}>
          <Text style={styles.actionText}>⚙️ Configuración</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={handleSignOut}>
          <Text style={[styles.actionText, styles.signOutText]}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.neonRed,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.neonRed,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.neonRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: COLORS.neonBlue,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  levelText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  username: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    color: COLORS.gray,
    fontSize: 16,
    marginBottom: 20,
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpLabel: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  xpBar: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.darkGray,
    borderRadius: 4,
    marginBottom: 5,
  },
  xpProgress: {
    height: '100%',
    backgroundColor: COLORS.neonBlue,
    borderRadius: 4,
  },
  xpNext: {
    color: COLORS.gray,
    fontSize: 14,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
  },
  statNumber: {
    color: COLORS.neonBlue,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
  },
  socialSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.neonRed + '30',
  },
  socialNumber: {
    color: COLORS.neonRed,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  socialLabel: {
    color: COLORS.white,
    fontSize: 12,
    textAlign: 'center',
  },
  achievementsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  achievementSummary: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  achievementProgress: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  completionRate: {
    color: COLORS.neonBlue,
    fontSize: 14,
  },
  achievementGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  achievementCard: {
    alignItems: 'center',
    flex: 1,
  },
  achievementIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  achievementCount: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  achievementType: {
    color: COLORS.gray,
    fontSize: 12,
  },
  totalXP: {
    color: COLORS.neonBlue,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionsSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  actionButton: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.gray + '30',
  },
  actionText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  signOutButton: {
    backgroundColor: COLORS.neonRed + '20',
    borderColor: COLORS.neonRed,
    marginTop: 10,
  },
  signOutText: {
    color: COLORS.neonRed,
  },
  linkedinButton: {
    backgroundColor: '#0077B5' + '20',
    borderColor: '#0077B5',
    marginBottom: 15,
  },
  linkedinText: {
    color: '#0077B5',
    fontWeight: '600',
  },
});