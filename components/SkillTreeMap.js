import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  StyleSheet
} from 'react-native';
import gamificationService from '../services/gamificationService';

const { width, height } = Dimensions.get('window');

// Colores del nuevo esquema futurista
const COLORS = {
  background: '#0A0A0A',      // Negro profundo
  secondary: '#1A1A1A',       // Gris oscuro
  neonRed: '#FF1E1E',         // Rojo neón
  white: '#FFFFFF',           // Blanco puro
  gray: '#666666',            // Gris medio
  success: '#00FF88',         // Verde neón
  warning: '#FFB800',         // Amarillo neón
};

const SkillTreeMap = ({ onLevelSelect, playerData }) => {
  const [skillTrees, setSkillTrees] = useState({});
  const [levelProgress, setLevelProgress] = useState({});
  const [selectedTree, setSelectedTree] = useState('FRONTEND');
  const [animations] = useState({});
  
  // Referencias para animaciones
  const nodeAnimations = useRef({});

  useEffect(() => {
    loadData();
    initializeAnimations();
  }, []);

  const loadData = async () => {
    const trees = gamificationService.getSkillTrees();
    const progress = await gamificationService.getLevelProgress();
    setSkillTrees(trees);
    setLevelProgress(progress);
  };

  const initializeAnimations = () => {
    Object.keys(gamificationService.getSkillTrees()).forEach(treeKey => {
      const tree = gamificationService.getSkillTrees()[treeKey];
      tree.levels.forEach(level => {
        nodeAnimations.current[level.id] = {
          scale: new Animated.Value(1),
          glow: new Animated.Value(0.3),
          pulse: new Animated.Value(1)
        };
      });
    });
    
    // Animación continua de pulsación para niveles activos
    startPulseAnimations();
  };

  const startPulseAnimations = () => {
    Object.keys(nodeAnimations.current).forEach(levelId => {
      const anim = nodeAnimations.current[levelId];
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim.pulse, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.pulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const handleLevelPress = (treeId, level) => {
    const progress = levelProgress[treeId]?.[level.id];
    
    if (!progress?.unlocked) {
      // Animación de sacudida para niveles bloqueados
      const anim = nodeAnimations.current[level.id];
      Animated.sequence([
        Animated.timing(anim.scale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(anim.scale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.timing(anim.scale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      return;
    }
    
    // Animación de selección
    const anim = nodeAnimations.current[level.id];
    Animated.sequence([
      Animated.timing(anim.scale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(anim.scale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    
    onLevelSelect(treeId, level);
  };

  const renderSkillTreeTabs = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
      >
        {Object.keys(skillTrees).map(treeKey => {
          const tree = skillTrees[treeKey];
          const isSelected = selectedTree === treeKey;
          
          return (
            <TouchableOpacity
              key={treeKey}
              style={[styles.tab, isSelected && styles.selectedTab]}
              onPress={() => setSelectedTree(treeKey)}
            >
              <Text style={styles.tabIcon}>{tree.icon}</Text>
              <Text style={[styles.tabText, isSelected && styles.selectedTabText]}>
                {tree.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderLevelNode = (level, index, treeId) => {
    const progress = levelProgress[treeId]?.[level.id];
    const isUnlocked = progress?.unlocked || false;
    const isCompleted = progress?.completed || false;
    const attempts = progress?.attempts || 0;
    const bestScore = progress?.bestScore || 0;
    
    const anim = nodeAnimations.current[level.id];
    
    let nodeStyle = styles.lockedNode;
    let textStyle = styles.lockedNodeText;
    
    if (isCompleted) {
      nodeStyle = styles.completedNode;
      textStyle = styles.completedNodeText;
    } else if (isUnlocked) {
      nodeStyle = styles.unlockedNode;
      textStyle = styles.unlockedNodeText;
    }
    
    return (
      <View key={level.id} style={styles.levelContainer}>
        {/* Línea de conexión */}
        {index > 0 && (
          <View style={[
            styles.connectionLine,
            isUnlocked && styles.activeConnectionLine
          ]} />
        )}
        
        {/* Nodo del nivel */}
        <Animated.View
          style={[
            nodeStyle,
            {
              transform: [
                { scale: anim?.scale || 1 },
                { scale: anim?.pulse || 1 }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.nodeButton}
            onPress={() => handleLevelPress(treeId, level)}
            activeOpacity={0.8}
          >
            <View style={styles.nodeContent}>
              {isCompleted ? (
                <Text style={styles.nodeIcon}>✅</Text>
              ) : isUnlocked ? (
                <Text style={styles.nodeIcon}>🎯</Text>
              ) : (
                <Text style={styles.nodeIcon}>🔒</Text>
              )}
              
              <Text style={textStyle} numberOfLines={2}>
                {level.name}
              </Text>
              
              <View style={styles.nodeStats}>
                <Text style={styles.xpText}>{level.xp} XP</Text>
                {attempts > 0 && (
                  <Text style={styles.attemptsText}>
                    {attempts} tries • {bestScore}%
                  </Text>
                )}
              </View>
            </View>
            
            {/* Efecto glow para nodos activos */}
            {isUnlocked && !isCompleted && (
              <Animated.View 
                style={[
                  styles.glowEffect,
                  { opacity: anim?.glow || 0.3 }
                ]} 
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderSkillTree = () => {
    const tree = skillTrees[selectedTree];
    if (!tree) return null;
    
    return (
      <ScrollView style={styles.treeContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.treeHeader}>
          <Text style={styles.treeTitle}>{tree.icon} {tree.name}</Text>
          <Text style={styles.treeDescription}>
            Master the skills of {tree.name.toLowerCase()}
          </Text>
        </View>
        
        <View style={styles.levelsContainer}>
          {tree.levels.map((level, index) => 
            renderLevelNode(level, index, selectedTree)
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Encabezado con pestañas de skill trees */}
      {renderSkillTreeTabs()}
      
      {/* Mapa de niveles */}
      {renderSkillTree()}
      
      {/* Información del progreso */}
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          Level {playerData?.level || 1} • {playerData?.xp || 0} XP
        </Text>
        <Text style={styles.titleText}>
          {playerData?.title || 'Novice Developer'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    maxHeight: 80,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.neonRed,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTab: {
    borderBottomColor: COLORS.neonRed,
    backgroundColor: COLORS.background,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  selectedTabText: {
    color: COLORS.neonRed,
  },
  treeContainer: {
    flex: 1,
    padding: 20,
  },
  treeHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  treeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  treeDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
  levelsContainer: {
    alignItems: 'center',
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  connectionLine: {
    width: 3,
    height: 30,
    backgroundColor: COLORS.gray,
    marginBottom: 10,
  },
  activeConnectionLine: {
    backgroundColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  lockedNode: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedNode: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    borderWidth: 3,
    borderColor: COLORS.neonRed,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  completedNode: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  nodeButton: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  nodeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  nodeIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  lockedNodeText: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  unlockedNodeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  completedNodeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  nodeStats: {
    marginTop: 5,
    alignItems: 'center',
  },
  xpText: {
    color: COLORS.warning,
    fontSize: 8,
    fontWeight: 'bold',
  },
  attemptsText: {
    color: COLORS.gray,
    fontSize: 7,
    marginTop: 2,
  },
  glowEffect: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.neonRed,
    opacity: 0.2,
    top: -10,
    left: -10,
  },
  progressInfo: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderTopWidth: 2,
    borderTopColor: COLORS.neonRed,
    alignItems: 'center',
  },
  progressText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleText: {
    color: COLORS.neonRed,
    fontSize: 12,
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default SkillTreeMap;