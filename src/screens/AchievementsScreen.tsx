import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { achievementService } from '../services/achievementService';
import { COLORS } from '../constants/colors';

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
  conditions: any[];
  isSecret: boolean;
  unlocksFeature?: string;
  progress?: number;
  unlocked?: boolean;
  unlockedAt?: Date;
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

type CategoryFilter = 'all' | 'progression' | 'streak' | 'mastery' | 'productivity' | 'accuracy' | 'social' | 'special';
type StatusFilter = 'all' | 'unlocked' | 'locked';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDefinition | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const userAchievements = achievementService.getUserAchievements();
      const achievementStats = achievementService.getAchievementStats();
      
      setAchievements(userAchievements);
      setStats(achievementStats);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return COLORS.white;
      case 'rare': return '#4A90E2';
      case 'epic': return '#9B59B6';
      case 'legendary': return '#F39C12';
      default: return COLORS.gray;
    }
  };

  const getRarityStyle = (rarity: string) => {
    return {
      borderColor: getRarityColor(rarity),
      backgroundColor: getRarityColor(rarity) + '15',
    };
  };

  const getProgressPercentage = (achievement: AchievementDefinition) => {
    if (achievement.unlocked) return 100;
    return Math.round((achievement.progress || 0) / achievement.maxProgress * 100);
  };

  const filteredAchievements = achievements.filter(achievement => {
    // Category filter
    if (categoryFilter !== 'all' && achievement.category !== categoryFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter === 'unlocked' && !achievement.unlocked) {
      return false;
    }
    if (statusFilter === 'locked' && achievement.unlocked) {
      return false;
    }
    
    // Hide secret achievements if not unlocked
    if (achievement.isSecret && !achievement.unlocked) {
      return false;
    }
    
    return true;
  });

  const openAchievementDetail = (achievement: AchievementDefinition) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  const renderStatsHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats?.unlockedCount}</Text>
        <Text style={styles.statLabel}>Desbloqueados</Text>
      </View>
      
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats?.completionRate.toFixed(1)}%</Text>
        <Text style={styles.statLabel}>Completado</Text>
      </View>
      
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{stats?.totalXPFromAchievements}</Text>
        <Text style={styles.statLabel}>XP Total</Text>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Category Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {(['all', 'progression', 'streak', 'mastery', 'productivity', 'accuracy', 'social', 'special'] as CategoryFilter[]).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterButton,
              categoryFilter === category && styles.activeFilter
            ]}
            onPress={() => setCategoryFilter(category)}
          >
            <Text style={[
              styles.filterText,
              categoryFilter === category && styles.activeFilterText
            ]}>
              {category === 'all' ? 'Todos' : 
               category === 'progression' ? 'Progresión' :
               category === 'streak' ? 'Racha' :
               category === 'mastery' ? 'Maestría' :
               category === 'productivity' ? 'Productividad' :
               category === 'accuracy' ? 'Precisión' :
               category === 'social' ? 'Social' :
               'Especial'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Status Filters */}
      <View style={styles.statusFilters}>
        {(['all', 'unlocked', 'locked'] as StatusFilter[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusButton,
              statusFilter === status && styles.activeStatusFilter
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[
              styles.statusText,
              statusFilter === status && styles.activeStatusText
            ]}>
              {status === 'all' ? 'Todos' :
               status === 'unlocked' ? 'Desbloqueados' :
               'Bloqueados'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAchievementItem = (achievement: AchievementDefinition) => (
    <TouchableOpacity
      key={achievement.id}
      style={[
        styles.achievementCard,
        getRarityStyle(achievement.rarity),
        !achievement.unlocked && styles.lockedCard
      ]}
      onPress={() => openAchievementDetail(achievement)}
    >
      <View style={styles.achievementHeader}>
        <Text style={styles.achievementIcon}>
          {achievement.unlocked ? achievement.icon : '🔒'}
        </Text>
        <View style={styles.achievementInfo}>
          <Text style={[
            styles.achievementTitle,
            !achievement.unlocked && styles.lockedText
          ]}>
            {achievement.unlocked || !achievement.isSecret ? achievement.title : '???'}
          </Text>
          <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{achievement.rewardXP}</Text>
        </View>
      </View>
      
      <Text style={[
        styles.achievementDescription,
        !achievement.unlocked && styles.lockedText
      ]}>
        {achievement.unlocked || !achievement.isSecret ? achievement.description : 'Logro secreto'}
      </Text>
      
      {!achievement.unlocked && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${getProgressPercentage(achievement)}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {achievement.progress || 0} / {achievement.maxProgress}
          </Text>
        </View>
      )}
      
      {achievement.unlocked && achievement.unlockedAt && (
        <Text style={styles.unlockedDate}>
          Desbloqueado: {achievement.unlockedAt.toLocaleDateString()}
        </Text>
      )}
      
      {achievement.unlocksFeature && achievement.unlocked && (
        <Text style={styles.featureUnlock}>
          🔓 Desbloquea: {achievement.unlocksFeature}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderAchievementModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedAchievement && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalIcon}>{selectedAchievement.icon}</Text>
                <Text style={styles.modalTitle}>{selectedAchievement.title}</Text>
                <Text style={[styles.modalRarity, { color: getRarityColor(selectedAchievement.rarity) }]}>
                  {selectedAchievement.rarity.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.modalDescription}>
                {selectedAchievement.description}
              </Text>
              
              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Recompensa XP</Text>
                  <Text style={styles.modalStatValue}>+{selectedAchievement.rewardXP}</Text>
                </View>
                
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Categoría</Text>
                  <Text style={styles.modalStatValue}>{selectedAchievement.category}</Text>
                </View>
                
                {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Desbloqueado</Text>
                    <Text style={styles.modalStatValue}>
                      {selectedAchievement.unlockedAt.toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                {!selectedAchievement.unlocked && (
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Progreso</Text>
                    <Text style={styles.modalStatValue}>
                      {selectedAchievement.progress || 0} / {selectedAchievement.maxProgress}
                    </Text>
                  </View>
                )}
              </View>
              
              {selectedAchievement.unlocksFeature && (
                <View style={styles.featureUnlockCard}>
                  <Text style={styles.featureUnlockTitle}>🔓 Desbloquea funcionalidad</Text>
                  <Text style={styles.featureUnlockText}>{selectedAchievement.unlocksFeature}</Text>
                </View>
              )}
              
              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderStatsHeader()}
      {renderFilters()}
      
      <ScrollView style={styles.achievementsList}>
        <Text style={styles.sectionTitle}>
          🏆 Logros ({filteredAchievements.length})
        </Text>
        
        {filteredAchievements.map(renderAchievementItem)}
        
        {filteredAchievements.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay logros que coincidan con los filtros
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Prueba cambiando los filtros o sigue estudiando para desbloquear más logros
            </Text>
          </View>
        )}
      </ScrollView>
      
      {renderAchievementModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-around',
  },
  statCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  statNumber: {
    color: COLORS.neonBlue,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    color: COLORS.white,
    fontSize: 12,
    textAlign: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  filterScroll: {
    marginBottom: 10,
  },
  filterButton: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: COLORS.neonBlue,
  },
  filterText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterText: {
    color: COLORS.white,
  },
  statusFilters: {
    flexDirection: 'row',
  },
  statusButton: {
    flex: 1,
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  activeStatusFilter: {
    backgroundColor: COLORS.neonRed,
  },
  statusText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '500',
  },
  activeStatusText: {
    color: COLORS.white,
  },
  achievementsList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  achievementCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
  },
  lockedCard: {
    opacity: 0.7,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  lockedText: {
    color: COLORS.gray,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
  },
  xpBadge: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  xpText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  achievementDescription: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.gray + '40',
    borderRadius: 3,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.neonBlue,
    borderRadius: 3,
  },
  progressText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'right',
  },
  unlockedDate: {
    color: COLORS.gray,
    fontSize: 12,
    fontStyle: 'italic',
  },
  featureUnlock: {
    color: COLORS.neonBlue,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
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
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalRarity: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDescription: {
    color: COLORS.gray,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalStats: {
    marginBottom: 20,
  },
  modalStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalStatLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  modalStatValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  featureUnlockCard: {
    backgroundColor: COLORS.neonBlue + '20',
    borderColor: COLORS.neonBlue,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  featureUnlockTitle: {
    color: COLORS.neonBlue,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureUnlockText: {
    color: COLORS.white,
    fontSize: 13,
  },
  closeButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});