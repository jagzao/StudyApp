import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

// Colores del esquema futurista mejorado
const COLORS = {
  background: '#0A0A0A',
  secondary: '#1A1A1A',
  neonRed: '#FF1E1E',
  neonBlue: '#00D4FF',
  white: '#FFFFFF',
  gray: '#666666',
  success: '#00FF88',
  warning: '#FFB800',
  glowRed: '#FF1E1E80',
  darkGray: '#2A2A2A',
};

const GameHUD = ({ 
  playerData, 
  onMenuPress, 
  streak = 0, 
  showXPGain = null,
  onXPAnimationComplete 
}) => {
  const [xpBarAnimation] = useState(new Animated.Value(0));
  const [xpGainAnimation] = useState(new Animated.Value(0));
  const [streakAnimation] = useState(new Animated.Value(1));
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [menuRotation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (playerData) {
      // Animar barra de XP
      const xpProgress = playerData.xp / (playerData.xp + playerData.xpToNext);
      Animated.timing(xpBarAnimation, {
        toValue: xpProgress,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [playerData]);

  useEffect(() => {
    // Hexagonal level badge pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    );
    pulse.start();
    
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (showXPGain) {
      // Animación mejorada de XP ganado con floating effect
      xpGainAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(xpGainAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(xpGainAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start(() => {
        if (onXPAnimationComplete) {
          onXPAnimationComplete();
        }
      });
    }
  }, [showXPGain]);

  useEffect(() => {
    if (streak > 0) {
      // Animación de streak
      Animated.sequence([
        Animated.timing(streakAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(streakAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [streak]);

  const getStreakColor = () => {
    if (streak >= 10) return COLORS.success;
    if (streak >= 5) return COLORS.warning;
    if (streak >= 3) return COLORS.neonRed;
    return COLORS.gray;
  };

  const getStreakIcon = () => {
    if (streak >= 10) return '💎';
    if (streak >= 5) return '🔥';
    if (streak >= 3) return '⚡';
    return '🎯';
  };

  const animateMenu = () => {
    Animated.timing(menuRotation, {
      toValue: menuRotation._value === 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    onMenuPress();
  };

  if (!playerData) return null;

  return (
    <View style={styles.container}>
      {/* Futuristic Background Overlay */}
      <View style={styles.hudBackground} />
      {/* Sección izquierda: Hexagonal Level Badge */}
      <View style={styles.leftSection}>
        <Animated.View 
          style={[
            styles.hexagonContainer, 
            { transform: [{ scale: pulseAnimation }] }
          ]}
        >
          <View style={styles.hexagon}>
            <View style={styles.hexagonInner}>
              <Text style={styles.levelNumber}>{playerData.level}</Text>
            </View>
          </View>
        </Animated.View>
        
        <View style={styles.xpContainer}>
          <Text style={styles.xpText}>
            {playerData.xp.toLocaleString()}
          </Text>
          <Text style={styles.xpUnit}>XP</Text>
          <Text style={styles.titleText}>{playerData.title}</Text>
        </View>
      </View>

      {/* Sección central: Barra de progreso XP */}
      <View style={styles.centerSection}>
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarBackground}>
            <Animated.View 
              style={[
                styles.xpBarFill,
                {
                  width: xpBarAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
            
            {/* Efectos de partículas en la barra */}
            <View style={styles.xpBarGlow} />
          </View>
          
          <Text style={styles.xpToNextText}>
            {playerData.xpToNext} to next level
          </Text>
        </View>

        {/* Animación de XP ganado */}
        {showXPGain && (
          <Animated.View 
            style={[
              styles.xpGainContainer,
              {
                opacity: xpGainAnimation,
                transform: [
                  {
                    translateY: xpGainAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -60]
                    })
                  },
                  {
                    scale: xpGainAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1.2, 1]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={styles.xpGainBadge}>
              <Text style={styles.xpGainText}>+{showXPGain}</Text>
              <Text style={styles.xpGainUnit}>XP</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Sección derecha: Streak y Menú */}
      <View style={styles.rightSection}>
        {streak > 0 && (
          <Animated.View 
            style={[
              styles.streakContainer,
              { transform: [{ scale: streakAnimation }] }
            ]}
          >
            <Text style={styles.streakIcon}>{getStreakIcon()}</Text>
            <Text style={[styles.streakText, { color: getStreakColor() }]}>
              {streak}
            </Text>
          </Animated.View>
        )}
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={animateMenu}
          activeOpacity={0.7}
        >
          <Animated.View 
            style={[
              styles.menuIcon,
              {
                transform: [{
                  rotate: menuRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg']
                  })
                }]
              }
            ]}
          >
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  hudBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(90deg, rgba(255,30,30,0.1) 0%, rgba(0,212,255,0.05) 100%)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.3,
  },
  hexagonContainer: {
    marginRight: 15,
  },
  hexagon: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.neonRed,
    transform: [{ rotate: '45deg' }],
    borderRadius: 8,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  hexagonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  levelNumber: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  xpContainer: {
    flex: 1,
  },
  xpText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: COLORS.neonRed,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  xpUnit: {
    color: COLORS.neonBlue,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  titleText: {
    color: COLORS.gray,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  centerSection: {
    flex: 0.4,
    alignItems: 'center',
    position: 'relative',
  },
  xpBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: COLORS.background,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
    overflow: 'hidden',
    position: 'relative',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.neonRed,
    borderRadius: 4,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  xpBarGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: COLORS.neonRed,
    opacity: 0.4,
    borderRadius: 8,
  },
  xpToNextText: {
    color: COLORS.gray,
    fontSize: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  xpGainContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
  },
  xpGainBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  xpGainText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '900',
    marginRight: 2,
  },
  xpGainUnit: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.3,
    justifyContent: 'flex-end',
  },
  streakContainer: {
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  streakBadge: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  streakGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: COLORS.neonRed,
    opacity: 0.3,
    borderRadius: 14,
  },
  streakIcon: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  menuIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    backgroundColor: COLORS.neonRed,
    marginVertical: 2,
    borderRadius: 1,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
});

export default GameHUD;