import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../App';

// Mock all services
jest.mock('../services/configService', () => ({
  configService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    hasOpenAIApiKey: jest.fn().mockResolvedValue(false),
    isConfigInitialized: jest.fn().mockReturnValue(true),
  }
}));

jest.mock('../services/analyticsService', () => ({
  analyticsService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('../services/authService', () => ({
  authService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isAuthenticated: jest.fn().mockReturnValue(false),
  }
}));

jest.mock('../services/cloudSyncService', () => ({
  cloudSyncService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    startPeriodicSync: jest.fn(),
    cleanup: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('../services/notificationService', () => ({
  notificationService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    scheduleSmartNotifications: jest.fn(),
  }
}));

jest.mock('../services/aiTutorService', () => ({
  aiTutorService: {
    initialize: jest.fn().mockResolvedValue(undefined),
  }
}));

jest.mock('../services/socialService', () => ({
  socialService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    updateUserRanking: jest.fn(),
  }
}));

jest.mock('../services/achievementService', () => ({
  achievementService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    triggerAchievementCheck: jest.fn(),
  }
}));

jest.mock('../services/advancedSpeechService', () => ({
  advancedSpeechService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isServiceAvailable: jest.fn().mockResolvedValue(true),
    isRecordingActive: jest.fn().mockReturnValue(false),
    startListening: jest.fn().mockResolvedValue(undefined),
    stopListening: jest.fn().mockResolvedValue({
      text: 'test command',
      confidence: 0.9,
    }),
    processVoiceCommand: jest.fn().mockResolvedValue({
      recognized: true,
      action: 'next',
    }),
  }
}));

jest.mock('../services/offlineManager', () => ({
  offlineManager: {
    initialize: jest.fn().mockResolvedValue(undefined),
  }
}));

// Mock hooks
jest.mock('../hooks/useFlashcards', () => ({
  useFlashcards: () => ({
    isLoading: false,
    isInitialized: true,
    currentCard: {
      id: 1,
      question: 'Test Question',
      answer: 'Test Answer',
      category: 'Test',
      difficulty: 'Beginner',
    },
    currentIndex: 0,
    totalCards: 5,
    showAnswer: false,
    userAnswer: '',
    showUserAnswer: false,
    answerMode: 'flashcard',
    nextCard: jest.fn(),
    previousCard: jest.fn(),
    setShowAnswer: jest.fn(),
    setAnswerMode: jest.fn(),
  })
}));

// Mock components
jest.mock('../components/FlashcardScreen', () => {
  return function MockFlashcardScreen(props: any) {
    return require('react-native').Text(`FlashcardScreen: ${props.currentCard?.question}`);
  };
});

jest.mock('../components/NavigationBar', () => {
  return function MockNavigationBar(props: any) {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="nav-profile" onPress={() => props.onScreenChange('profile')}>
        <Text>Profile</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../components/HamburgerMenu', () => {
  return function MockHamburgerMenu(props: any) {
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
      <View testID="hamburger-menu">
        <TouchableOpacity 
          testID="menu-close"
          onPress={props.onClose}
        >
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../components/APIKeyModal', () => {
  return function MockAPIKeyModal(props: any) {
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
      <View testID="api-key-modal">
        <TouchableOpacity 
          testID="api-key-save"
          onPress={() => props.onApiKeySet('sk-test123')}
        >
          <Text>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="api-key-close"
          onPress={props.onClose}
        >
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../screens/ProfileScreen', () => {
  return function MockProfileScreen() {
    const { Text } = require('react-native');
    return <Text testID="profile-screen">Profile Screen</Text>;
  };
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    // Mock loading state
    jest.doMock('../hooks/useFlashcards', () => ({
      useFlashcards: () => ({
        isLoading: true,
        isInitialized: false,
        currentCard: null,
        currentIndex: 0,
        totalCards: 0,
        showAnswer: false,
        userAnswer: '',
        showUserAnswer: false,
        answerMode: 'flashcard',
      })
    }));

    const { getByText } = render(<App />);
    
    expect(getByText('Inicializando Study AI...')).toBeTruthy();
    expect(getByText('Configurando servicios avanzados')).toBeTruthy();
  });

  test('renders main app after loading', async () => {
    const { getByText, getByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByText('Study AI')).toBeTruthy();
      expect(getByText('FlashcardScreen: Test Question')).toBeTruthy();
    });
  });

  test('opens hamburger menu when menu button is pressed', async () => {
    const { getByText, getByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByText('Study AI')).toBeTruthy();
    });

    // Find and press menu button
    const menuButton = getByText('☰');
    fireEvent.press(menuButton);

    await waitFor(() => {
      expect(getByTestId('hamburger-menu')).toBeTruthy();
    });
  });

  test('closes hamburger menu when close button is pressed', async () => {
    const { getByText, getByTestId, queryByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByText('Study AI')).toBeTruthy();
    });

    // Open menu
    const menuButton = getByText('☰');
    fireEvent.press(menuButton);

    await waitFor(() => {
      expect(getByTestId('hamburger-menu')).toBeTruthy();
    });

    // Close menu
    const closeButton = getByTestId('menu-close');
    fireEvent.press(closeButton);

    await waitFor(() => {
      expect(queryByTestId('hamburger-menu')).toBeNull();
    });
  });

  test('shows API key modal when no API key is present', async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByTestId('api-key-modal')).toBeTruthy();
    });
  });

  test('handles API key configuration', async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByTestId('api-key-modal')).toBeTruthy();
    });

    // Save API key
    const saveButton = getByTestId('api-key-save');
    fireEvent.press(saveButton);

    // Modal should close after saving
    await waitFor(() => {
      expect(() => getByTestId('api-key-modal')).toThrow();
    });
  });

  test('shows API status indicator', async () => {
    const { getByText } = render(<App />);

    await waitFor(() => {
      // Should show warning when no API key
      expect(getByText('⚠️ API')).toBeTruthy();
    });
  });

  test('navigates between screens', async () => {
    const { getByTestId, getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('Study AI')).toBeTruthy();
    });

    // Navigate to profile
    const profileButton = getByTestId('nav-profile');
    fireEvent.press(profileButton);

    await waitFor(() => {
      expect(getByTestId('profile-screen')).toBeTruthy();
    });
  });

  test('handles service initialization errors gracefully', async () => {
    // Mock service failure
    const configService = require('../services/configService').configService;
    configService.initialize.mockRejectedValue(new Error('Config service failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<App />);

    await waitFor(() => {
      expect(getByText('Study AI')).toBeTruthy();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '❌ Failed to initialize Study AI services:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  test('initializes all services on mount', async () => {
    render(<App />);

    const services = [
      require('../services/configService').configService,
      require('../services/analyticsService').analyticsService,
      require('../services/authService').authService,
      require('../services/cloudSyncService').cloudSyncService,
      require('../services/notificationService').notificationService,
      require('../services/aiTutorService').aiTutorService,
      require('../services/socialService').socialService,
      require('../services/achievementService').achievementService,
      require('../services/advancedSpeechService').advancedSpeechService,
      require('../services/offlineManager').offlineManager,
    ];

    await waitFor(() => {
      services.forEach(service => {
        expect(service.initialize).toHaveBeenCalled();
      });
    });
  });

  test('cleans up services on unmount', () => {
    const { unmount } = render(<App />);
    
    const analyticsService = require('../services/analyticsService').analyticsService;
    const cloudSyncService = require('../services/cloudSyncService').cloudSyncService;

    unmount();

    expect(analyticsService.cleanup).toHaveBeenCalled();
    expect(cloudSyncService.cleanup).toHaveBeenCalled();
  });
});