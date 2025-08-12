import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Colores del esquema futurista
const COLORS = {
  background: '#0A0A0A',
  secondary: '#1A1A1A',
  neonRed: '#FF1E1E',
  white: '#FFFFFF',
  gray: '#666666',
  success: '#00FF88',
  warning: '#FFB800',
};

const GameMenu = ({ visible, onClose, onNavigate, playerData, achievements, onJobInterview, onSeniorPrep, onConfigWhisper }) => {
  const [slideAnimation] = useState(new Animated.Value(-width));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnimation, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const menuItems = [
    {
      id: 'home',
      title: 'HOME',
      subtitle: 'Interview Training',
      icon: '🏠',
      color: COLORS.neonRed
    },
    {
      id: 'pitch',
      title: 'PITCH',
      subtitle: 'Smart Teleprompter',
      icon: '🎤',
      color: COLORS.success
    },
    {
      id: 'camino',
      title: 'MI CAMINO',
      subtitle: 'Skill Tree Progress',
      icon: '🗺️',
      color: COLORS.warning
    },
    {
      id: 'achievements',
      title: 'LOGROS',
      subtitle: 'Achievements & Badges',
      icon: '🏆',
      color: COLORS.success
    },
    {
      id: 'stats',
      title: 'ESTADÍSTICAS',
      subtitle: 'Performance Analytics',
      icon: '📊',
      color: COLORS.gray
    },
    {
      id: 'job-interview',
      title: 'JOB INTERVIEW',
      subtitle: 'Custom Interview Prep',
      icon: '🎯',
      color: COLORS.neonRed
    },
    {
      id: 'senior-prep',
      title: 'SENIOR PREP',
      subtitle: 'Advanced Questions',
      icon: '🚀',
      color: COLORS.warning
    },
    {
      id: 'config-whisper',
      title: 'CONFIG WHISPER',
      subtitle: 'OpenAI API Settings',
      icon: '⚙️',
      color: COLORS.gray
    },
    {
      id: 'settings',
      title: 'CONFIGURACIÓN',
      subtitle: 'Settings & Preferences',
      icon: '⚙️',
      color: COLORS.gray
    }
  ];

  const handleItemPress = (itemId) => {
    switch (itemId) {
      case 'job-interview':
        onJobInterview && onJobInterview();
        break;
      case 'senior-prep':
        onSeniorPrep && onSeniorPrep();
        break;
      case 'config-whisper':
        onConfigWhisper && onConfigWhisper();
        break;
      default:
        onNavigate(itemId);
        break;
    }
    onClose();
  };

  const renderPlayerCard = () => (
    <View style={styles.playerCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>👨‍💻</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{playerData?.level || 1}</Text>
        </View>
      </View>
      
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>Juan Zambrano</Text>
        <Text style={styles.playerTitle}>{playerData?.title || 'Novice Developer'}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{playerData?.totalXp || 0}</Text>
            <Text style={styles.statLabel}>TOTAL XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{playerData?.questionsAnswered || 0}</Text>
            <Text style={styles.statLabel}>QUESTIONS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{playerData?.maxStreak || 0}</Text>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => handleItemPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.menuIcon, { borderColor: item.color }]}>
        <Text style={styles.menuIconText}>{item.icon}</Text>
      </View>
      
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      
      <View style={styles.menuArrow}>
        <Text style={styles.menuArrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentAchievements = () => {
    if (!achievements || Object.keys(achievements).length === 0) return null;
    
    const recentAchievements = Object.entries(achievements)
      .filter(([_, data]) => data.unlocked)
      .slice(-3); // Últimos 3 logros
    
    if (recentAchievements.length === 0) return null;
    
    return (
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>RECENT ACHIEVEMENTS</Text>
        {recentAchievements.map(([id, data]) => (
          <View key={id} style={styles.achievementItem}>
            <Text style={styles.achievementIcon}>🏆</Text>
            <Text style={styles.achievementText}>{id.replace('-', ' ').toUpperCase()}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
        
        <Animated.View 
          style={[
            styles.menuContainer,
            { transform: [{ translateX: slideAnimation }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>STUDY AI</Text>
            <Text style={styles.headerSubtitle}>COMMAND CENTER</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Player Card */}
            {renderPlayerCard()}
            
            {/* Menu Items */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>NAVIGATION</Text>
              {menuItems.map(renderMenuItem)}
            </View>
            
            {/* Recent Achievements */}
            {renderRecentAchievements()}
          </ScrollView>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              POWERED BY NEURAL NETWORKS
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    width: width * 0.85,
    height: '100%',
    backgroundColor: COLORS.background,
    borderRightWidth: 3,
    borderRightColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    backgroundColor: COLORS.secondary,
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.neonRed,
    position: 'relative',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: COLORS.neonRed,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.neonRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  playerCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  avatarText: {
    fontSize: 48,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerInfo: {
    alignItems: 'center',
  },
  playerName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerTitle: {
    color: COLORS.neonRed,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 5,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.warning,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  menuSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    paddingLeft: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSubtitle: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 2,
  },
  menuArrow: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuArrowText: {
    color: COLORS.neonRed,
    fontSize: 18,
    fontWeight: 'bold',
  },
  achievementsSection: {
    marginBottom: 20,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  achievementIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  achievementText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderTopWidth: 2,
    borderTopColor: COLORS.neonRed,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.gray,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default GameMenu;