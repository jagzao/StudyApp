import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';

interface NavigationBarProps {
  activeScreen: string;
  onScreenChange: (screen: string) => void;
}

const screens = [
  { id: 'study', name: 'Estudio', icon: '📚' },
  { id: 'profile', name: 'Perfil', icon: '👤' },
  { id: 'leaderboard', name: 'Rankings', icon: '🏆' },
  { id: 'achievements', name: 'Logros', icon: '🎯' },
  { id: 'tutor', name: 'AI Tutor', icon: '🤖' },
];

export default function NavigationBar({ activeScreen, onScreenChange }: NavigationBarProps) {
  return (
    <View style={styles.container}>
      {screens.map((screen) => (
        <TouchableOpacity
          key={screen.id}
          style={[
            styles.navButton,
            activeScreen === screen.id && styles.activeNavButton
          ]}
          onPress={() => onScreenChange(screen.id)}
        >
          <Text style={styles.navIcon}>{screen.icon}</Text>
          <Text style={[
            styles.navText,
            activeScreen === screen.id && styles.activeNavText
          ]}>
            {screen.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray + '30',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  activeNavButton: {
    backgroundColor: COLORS.neonBlue + '20',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeNavText: {
    color: COLORS.neonBlue,
  },
});