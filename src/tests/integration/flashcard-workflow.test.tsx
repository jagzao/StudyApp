import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { render, mockFlashcards, mockSuccessfulFetch } from '../utils/test-utils';
import App from '../../../App';

// Mock all the services
jest.mock('../../services/databaseService.platform', () => ({
  databaseService: {
    initialize: jest.fn(() => Promise.resolve()),
    getFlashcards: jest.fn(() => Promise.resolve(mockFlashcards)),
    addFlashcard: jest.fn(() => Promise.resolve('3')),
    updateFlashcard: jest.fn(() => Promise.resolve()),
    deleteFlashcard: jest.fn(() => Promise.resolve()),
    updateStudyProgress: jest.fn(() => Promise.resolve()),
    getStudyStats: jest.fn(() => Promise.resolve({ total: 2, correct: 1, streak: 1 })),
  }
}));

jest.mock('../../services/configService', () => ({
  configService: {
    initialize: jest.fn(() => Promise.resolve()),
    hasOpenAIApiKey: jest.fn(() => Promise.resolve(true)),
    getOpenAIApiKey: jest.fn(() => Promise.resolve('mock-api-key')),
  }
}));

// Mock all other services
const mockServices = [
  'analyticsService',
  'authService',
  'cloudSyncService',
  'notificationService',
  'aiTutorService',
  'socialService',
  'achievementService',
  'advancedSpeechService',
  'offlineManager',
  'textToSpeechService',
  'advancedAnalyticsService',
].forEach(service => {
  jest.mock(`../../services/${service}`, () => ({
    [service]: {
      initialize: jest.fn(() => Promise.resolve()),
      cleanup: jest.fn(() => Promise.resolve()),
      isAuthenticated: jest.fn(() => false),
      isRecordingActive: jest.fn(() => false),
      isServiceAvailable: jest.fn(() => Promise.resolve(false)),
      startListening: jest.fn(() => Promise.resolve()),
      stopListening: jest.fn(() => Promise.resolve(null)),
      processVoiceCommand: jest.fn(() => Promise.resolve({ recognized: false })),
      startPeriodicSync: jest.fn(),
      triggerAchievementCheck: jest.fn(),
      updateUserRanking: jest.fn(),
      scheduleSmartNotifications: jest.fn(),
    }
  }));
});

describe('Flashcard Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full flashcard study workflow', async () => {
    const { getByText, queryByText } = render(<App />);

    // Wait for app to initialize
    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    }, { timeout: 5000 });

    // Should show the first flashcard
    await waitFor(() => {
      expect(getByText('What is React?')).toBeTruthy();
    });

    // Should show card navigation info
    expect(getByText('1 / 2')).toBeTruthy();

    // Click to show answer
    const answerButton = getByText('RESPUESTA');
    fireEvent.press(answerButton);

    await waitFor(() => {
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });

    // Mark as correct
    const correctButton = getByText('✓ CORRECTO');
    fireEvent.press(correctButton);

    // Should advance to next card
    await waitFor(() => {
      expect(getByText('What is TypeScript?')).toBeTruthy();
    });

    expect(getByText('2 / 2')).toBeTruthy();
  });

  it('should navigate between cards using navigation buttons', async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    // Should be on first card
    await waitFor(() => {
      expect(getByText('What is React?')).toBeTruthy();
    });

    // Go to next card
    const nextButton = getByText('SIGUIENTE ➡️');
    fireEvent.press(nextButton);

    await waitFor(() => {
      expect(getByText('What is TypeScript?')).toBeTruthy();
    });

    // Go back to previous card
    const prevButton = getByText('⬅️ ANTERIOR');
    fireEvent.press(prevButton);

    await waitFor(() => {
      expect(getByText('What is React?')).toBeTruthy();
    });
  });

  it('should open and navigate using hamburger menu', async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    // Open hamburger menu
    const menuButton = getByText('☰');
    fireEvent.press(menuButton);

    await waitFor(() => {
      expect(getByText('⚙️ Menú')).toBeTruthy();
    });

    // Navigate to Analytics
    const analyticsButton = getByText('Analytics');
    fireEvent.press(analyticsButton);

    // Should close menu and navigate (we'd need to check for analytics screen content)
    await waitFor(() => {
      expect(queryByText('⚙️ Menú')).toBeNull();
    });
  });

  it('should handle voice command button', async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    const voiceButton = getByText('🎙️ COMANDO DE VOZ');
    fireEvent.press(voiceButton);

    // Should trigger voice recognition
    const advancedSpeechService = require('../../services/advancedSpeechService').advancedSpeechService;
    expect(advancedSpeechService.startListening).toHaveBeenCalled();
  });

  it('should handle API key configuration', async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    const configButton = getByText('⚙️ CONFIG WHISPER');
    fireEvent.press(configButton);

    // Should open API key modal (we'd need to check for modal content)
    // This depends on the actual modal implementation
  });

  it('should show stats correctly', async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    // Should show study statistics
    expect(getByText('CORRECTAS')).toBeTruthy();
    expect(getByText('RACHA')).toBeTruthy();
    expect(getByText('TOTAL')).toBeTruthy();
  });

  it('should handle empty flashcard state', async () => {
    // Mock empty flashcard list
    const databaseService = require('../../services/databaseService.platform').databaseService;
    databaseService.getFlashcards.mockResolvedValue([]);

    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    await waitFor(() => {
      expect(getByText('No hay tarjetas disponibles')).toBeTruthy();
    });
  });

  it('should handle service initialization errors gracefully', async () => {
    // Mock service error
    const databaseService = require('../../services/databaseService.platform').databaseService;
    databaseService.initialize.mockRejectedValue(new Error('Database error'));

    const { getByText, queryByText } = render(<App />);

    // Should still render even with initialization errors
    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    }, { timeout: 10000 });

    // App should handle the error gracefully
  });

  it('should complete study session workflow', async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => {
      expect(queryByText('Inicializando Study AI...')).toBeNull();
    });

    // Study first card
    await waitFor(() => {
      expect(getByText('What is React?')).toBeTruthy();
    });

    fireEvent.press(getByText('RESPUESTA'));
    await waitFor(() => {
      expect(getByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });

    fireEvent.press(getByText('✓ CORRECTO'));

    // Study second card
    await waitFor(() => {
      expect(getByText('What is TypeScript?')).toBeTruthy();
    });

    fireEvent.press(getByText('RESPUESTA'));
    await waitFor(() => {
      expect(getByText('A typed superset of JavaScript that compiles to plain JavaScript')).toBeTruthy();
    });

    fireEvent.press(getByText('✓ CORRECTO'));

    // Should have completed the study session
    // The behavior depends on how the app handles end of cards
  });
});