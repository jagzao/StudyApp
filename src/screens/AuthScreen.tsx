import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import { localAuthService as authService } from '../services/authService.local';
import { COLORS } from '../constants/colors';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthScreenType = 'login' | 'signup' | 'forgotPassword';

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>('login');
  const [slideAnim] = useState(new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuthState = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          onAuthSuccess();
        }
      } catch (error) {
        console.log('Not authenticated, showing auth screens');
      }
    };

    checkAuthState();
  }, [onAuthSuccess]);

  const navigateToScreen = (screen: AuthScreenType) => {
    if (screen === currentScreen) return;

    const direction = getAnimationDirection(currentScreen, screen);
    
    Animated.timing(slideAnim, {
      toValue: direction * screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentScreen(screen);
      slideAnim.setValue(-direction * screenWidth);
      
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const getAnimationDirection = (from: AuthScreenType, to: AuthScreenType): number => {
    const screenOrder = { login: 0, signup: 1, forgotPassword: -1 };
    return screenOrder[to] > screenOrder[from] ? 1 : -1;
  };

  const handleAuthSuccess = () => {
    // Add a small delay for better UX
    setTimeout(() => {
      onAuthSuccess();
    }, 500);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleAuthSuccess}
            onNavigateToSignup={() => navigateToScreen('signup')}
            onNavigateToForgotPassword={() => navigateToScreen('forgotPassword')}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            onSignupSuccess={handleAuthSuccess}
            onNavigateToLogin={() => navigateToScreen('login')}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPasswordScreen
            onNavigateBack={() => navigateToScreen('login')}
            onResetSuccess={() => navigateToScreen('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.screenContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {renderCurrentScreen()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
  },
});