import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFlashcards } from './src/hooks/useFlashcards';
import FlashcardScreen from './src/components/FlashcardScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import NavigationBar from './src/components/NavigationBar';
import ProfileScreen from './src/screens/ProfileScreen';
import AnonymousProfileScreen from './src/screens/AnonymousProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import AITutorScreen from './src/screens/AITutorScreen';
import SeniorPrepScreen from './src/screens/SeniorPrepScreen';
import InterviewPrepScreen from './src/screens/InterviewPrepScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import BackupScreen from './src/screens/BackupScreen';
import AuthScreen from './src/screens/AuthScreen';
import ResourcesScreen from './src/screens/ResourcesScreen';
import HamburgerMenu from './src/components/HamburgerMenu';
import APIKeyModal from './src/components/APIKeyModal';
import { analyticsService } from './src/services/analyticsService';
import { localAuthService as authService } from './src/services/authService.local';
import { anonymousUserService } from './src/services/anonymousUserService';
import { cloudSyncService } from './src/services/cloudSyncService';
import { notificationService } from './src/services/notificationService';
import { aiTutorService } from './src/services/aiTutorService';
import { socialService } from './src/services/socialService';
import { achievementService } from './src/services/achievementService';
import { advancedSpeechService } from './src/services/advancedSpeechService';
import { offlineManager } from './src/services/offlineManager';
import { configService } from './src/services/configService';
import { textToSpeechService } from './src/services/textToSpeechService';
import { advancedAnalyticsService } from './src/services/advancedAnalyticsService';
import { supabaseService } from './src/services/supabaseService';
import { firebaseService } from './src/services/firebaseService';
import { advancedGamificationService } from './src/services/advancedGamificationService';
import { spacedRepetitionService } from './src/services/spacedRepetitionService';
import { questionGenerationService } from './src/services/questionGenerationService';
import { COLORS } from './src/constants/colors';

export default function App(): React.ReactElement {
  const [activeScreen, setActiveScreen] = useState('study');
  const [menuVisible, setMenuVisible] = useState(false);
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Hooks
  const {
    isLoading: flashcardsLoading,
    isInitialized,
    currentCard,
    currentIndex,
    totalCards,
    showAnswer,
    userAnswer,
    showUserAnswer,
    answerMode,
  } = useFlashcards();

  // Initialize all services
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing Study AI...');
        
        // Initialize essential services only - reduce crash risk
        try {
          await configService.initialize();
          console.log('✅ Config service initialized');
        } catch (error) {
          console.warn('⚠️ Config service failed:', error);
        }

        try {
          // Use anonymous user service instead of authentication
          await anonymousUserService.initialize();
          console.log('✅ Anonymous user service initialized');
          
          // Always set as authenticated for anonymous usage
          setIsAuthenticated(true);
          setAuthChecked(true);
        } catch (error) {
          console.warn('⚠️ Anonymous user service failed:', error);
          // Still set as authenticated - we allow anonymous usage
          setIsAuthenticated(true);
          setAuthChecked(true);
        }

        // Initialize other services safely with individual error handling
        const initializeServiceSafely = async (serviceName: string, initFn: () => Promise<void>) => {
          try {
            await initFn();
            console.log(`✅ ${serviceName} initialized`);
          } catch (error) {
            console.warn(`⚠️ ${serviceName} failed:`, error);
          }
        };

        await initializeServiceSafely('Analytics', () => analyticsService.initialize());
        await initializeServiceSafely('Question Generation', () => questionGenerationService.initialize());
        await initializeServiceSafely('Spaced Repetition', () => spacedRepetitionService.initialize());
        
        // Check API key after config is ready
        try {
          const apiKeyExists = await configService.hasOpenAIApiKey();
          setHasApiKey(apiKeyExists);
          if (!apiKeyExists) {
            setApiKeyModalVisible(true);
          }
        } catch (error) {
          console.warn('⚠️ API key check failed:', error);
          setHasApiKey(false);
        }
        
        console.log('✅ Study AI core services initialized');
      } catch (error) {
        console.error('❌ Critical initialization error:', error);
        // Don't crash - show error state instead
        setAuthChecked(true);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      try {
        analyticsService?.cleanup?.();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };
  }, []);

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'study':
        return (
          <FlashcardScreen
            currentCard={currentCard}
            currentIndex={currentIndex}
            totalCards={totalCards}
            showAnswer={showAnswer}
            userAnswer={userAnswer}
            showUserAnswer={showUserAnswer}
            answerMode={answerMode}
            isListening={advancedSpeechService.isRecordingActive()}
            isProcessing={false}
            onStartListening={async () => {
              if (await advancedSpeechService.isServiceAvailable()) {
                await advancedSpeechService.startListening();
              }
            }}
            onStopListening={async () => {
              if (await advancedSpeechService.isServiceAvailable()) {
                const result = await advancedSpeechService.stopListening();
                if (result) {
                  // Process voice command or answer
                  const commandResult = await advancedSpeechService.processVoiceCommand(result.text);
                  if (!commandResult.recognized) {
                    // Treat as answer input
                    console.log('Voice answer:', result.text);
                  }
                }
              }
            }}
          />
        );
      case 'profile':
        return <AnonymousProfileScreen />;
      case 'leaderboard':
        return <LeaderboardScreen />;
      case 'achievements':
        return <AchievementsScreen />;
      case 'tutor':
        return <AITutorScreen />;
      case 'senior':
        return <SeniorPrepScreen />;
      case 'interview':
        return <InterviewPrepScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'backup':
        return <BackupScreen />;
      case 'auth':
        return <AuthScreen onAuthSuccess={() => setActiveScreen('profile')} />;
      case 'resources':
        return <ResourcesScreen onBack={() => setActiveScreen('study')} />;
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Pantalla no encontrada</Text>
          </View>
        );
    }
  };

  // Loading state
  if (flashcardsLoading || !isInitialized || !authChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.neonRed} />
        <Text style={styles.loadingText}>Inicializando Study AI...</Text>
        <Text style={styles.subLoadingText}>Configurando servicios avanzados</Text>
      </View>
    );
  }

  const handleApiKeySet = (apiKey: string) => {
    setHasApiKey(true);
    setApiKeyModalVisible(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  // Anonymous mode - no authentication required

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={COLORS.background} 
          translucent 
        />
        
        {/* Header with Menu Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Study AI</Text>
          
          <View style={styles.apiStatus}>
            {hasApiKey ? (
              <Text style={styles.apiStatusGood}>🤖 IA</Text>
            ) : (
              <TouchableOpacity onPress={() => setApiKeyModalVisible(true)}>
                <Text style={styles.apiStatusBad}>⚠️ API</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Main Content */}
        {renderActiveScreen()}
        
        {/* Navigation Bar */}
        <NavigationBar
          activeScreen={activeScreen}
          onScreenChange={setActiveScreen}
        />
        
        {/* Hamburger Menu */}
        <HamburgerMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onNavigate={setActiveScreen}
        />
        
        {/* API Key Modal */}
        <APIKeyModal
          visible={apiKeyModalVisible}
          onClose={() => setApiKeyModalVisible(false)}
          onApiKeySet={handleApiKeySet}
          isRequired={false}
        />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  apiStatus: {
    alignItems: 'center',
  },
  apiStatusGood: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  apiStatusBad: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  subLoadingText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
  },
});