import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { PlayerData, GameStats } from '../types';
import gamificationService from '../../services/gamificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../types';

export const usePlayer = () => {
  const {
    playerData,
    stats,
    achievements,
    streak,
    showXPGain,
    setPlayerData,
    updatePlayerData,
    setStats,
    updateStats,
    setAchievements,
    setStreak,
    setShowXPGain,
    markCorrect: storeMarkCorrect,
    markIncorrect: storeMarkIncorrect,
  } = useAppStore();

  const loadGameData = useCallback(async () => {
    try {
      const [player, progress, gameAchievements] = await Promise.all([
        gamificationService.getPlayerData(),
        gamificationService.getLevelProgress(),
        gamificationService.getAchievements()
      ]);
      
      setPlayerData(player);
      setAchievements(gameAchievements);
      
      if (player) {
        setStreak(player.streak || 0);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  }, [setPlayerData, setAchievements, setStreak]);

  const loadStats = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
      if (stored) {
        const loadedStats = JSON.parse(stored);
        setStats(loadedStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [setStats]);

  const saveStats = useCallback(async (newStats: GameStats) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(newStats));
      setStats(newStats);
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  }, [setStats]);

  const awardXP = useCallback(async (amount: number, reason: string) => {
    try {
      const result = await gamificationService.awardXP(amount, reason);
      
      if (result) {
        setShowXPGain(amount);
        const updatedPlayer = await gamificationService.getPlayerData();
        setPlayerData(updatedPlayer);
        
        // Hide XP gain after animation
        setTimeout(() => {
          setShowXPGain(null);
        }, 3000);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error awarding XP:', error);
      return false;
    }
  }, [setShowXPGain, setPlayerData]);

  const updatePlayerStats = useCallback(async (updates: Partial<GameStats>) => {
    try {
      await gamificationService.updateStats(updates);
      const updatedPlayer = await gamificationService.getPlayerData();
      setPlayerData(updatedPlayer);
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }, [setPlayerData]);

  const checkAchievements = useCallback(async (criteria: any) => {
    try {
      const newAchievements = await gamificationService.checkAchievements(criteria);
      
      if (newAchievements.length > 0) {
        // Update achievements
        const updatedAchievements = await gamificationService.getAchievements();
        setAchievements(updatedAchievements);
        
        return newAchievements;
      }
      return [];
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }, [setAchievements]);

  const markCorrect = useCallback(async () => {
    // Update local state first
    storeMarkCorrect();
    
    const newStreak = streak + 1;
    const newStats = {
      ...stats,
      total: stats.total + 1,
      correct: stats.correct + 1,
      streak: newStreak,
      accuracy: ((stats.correct + 1) / (stats.total + 1)) * 100,
    };
    
    // Save to AsyncStorage
    await saveStats(newStats);
    setStreak(newStreak);
    
    // Award XP with streak bonus
    const xpGained = 50 + (newStreak * 5);
    await awardXP(xpGained, 'Correct Answer');
    
    // Update gamification stats
    await updatePlayerStats({
      questionsAnswered: newStats.total,
      correctAnswers: newStats.correct,
      streak: newStreak,
      maxStreak: Math.max(playerData?.maxStreak || 0, newStreak)
    });
    
    // Check for new achievements
    const newAchievements = await checkAchievements({
      questionsAnswered: newStats.total,
      correctAnswers: newStats.correct,
      streak: newStreak,
      voiceCommandsUsed: playerData?.voiceCommandsUsed || 0
    });
    
    return {
      xpGained,
      newAchievements,
      newStreak,
      newStats,
    };
  }, [
    storeMarkCorrect,
    streak,
    stats,
    saveStats,
    setStreak,
    awardXP,
    updatePlayerStats,
    checkAchievements,
    playerData
  ]);

  const markIncorrect = useCallback(async () => {
    // Update local state first
    storeMarkIncorrect();
    
    const newStats = {
      ...stats,
      total: stats.total + 1,
      incorrect: stats.incorrect + 1,
      streak: 0,
      accuracy: (stats.correct / (stats.total + 1)) * 100,
    };
    
    // Save to AsyncStorage
    await saveStats(newStats);
    setStreak(0);
    
    // Update gamification stats
    await updatePlayerStats({
      questionsAnswered: newStats.total,
      correctAnswers: newStats.correct,
      streak: 0
    });
    
    return {
      newStats,
    };
  }, [
    storeMarkIncorrect,
    stats,
    saveStats,
    setStreak,
    updatePlayerStats
  ]);

  const resetProgress = useCallback(async () => {
    const defaultStats: GameStats = {
      total: 0,
      correct: 0,
      incorrect: 0,
      streak: 0,
      accuracy: 0,
      averageTime: 0,
      sessionsCompleted: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      maxStreak: 0,
    };
    
    await saveStats(defaultStats);
    setStreak(0);
    
    // Reset player data (keep level and XP, just reset session stats)
    if (playerData) {
      updatePlayerData({
        streak: 0,
      });
    }
  }, [saveStats, setStreak, playerData, updatePlayerData]);

  const getPlayerTitle = useCallback((level: number) => {
    if (level >= 50) return 'Master Developer';
    if (level >= 40) return 'Senior Expert';
    if (level >= 30) return 'Senior Developer';
    if (level >= 20) return 'Intermediate Developer';
    if (level >= 10) return 'Junior Developer';
    return 'Novice Developer';
  }, []);

  const getXPProgress = useCallback(() => {
    if (!playerData) return { current: 0, next: 100, percentage: 0 };
    
    const current = playerData.currentLevelXP || 0;
    const next = playerData.xpToNextLevel || 100;
    const percentage = (current / next) * 100;
    
    return { current, next, percentage };
  }, [playerData]);

  const getStreakMultiplier = useCallback((currentStreak: number) => {
    if (currentStreak >= 20) return 3.0;
    if (currentStreak >= 15) return 2.5;
    if (currentStreak >= 10) return 2.0;
    if (currentStreak >= 5) return 1.5;
    return 1.0;
  }, []);

  return {
    // State
    playerData,
    stats,
    achievements,
    streak,
    showXPGain,
    
    // Actions
    loadGameData,
    loadStats,
    saveStats,
    awardXP,
    markCorrect,
    markIncorrect,
    resetProgress,
    updatePlayerStats,
    checkAchievements,
    
    // Computed
    playerTitle: playerData ? getPlayerTitle(playerData.level) : 'Novice Developer',
    xpProgress: getXPProgress(),
    streakMultiplier: getStreakMultiplier(streak),
    accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    
    // Utils
    getPlayerTitle,
    getXPProgress,
    getStreakMultiplier,
  };
};