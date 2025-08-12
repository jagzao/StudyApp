import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Flashcard, 
  PlayerData, 
  GameStats, 
  Achievement, 
  UIState, 
  Screen, 
  AnswerMode,
  AppSettings,
  PitchData,
  TeleprompterState 
} from '../types';

// ==================== APP STATE INTERFACE ====================

interface AppState {
  // UI State
  ui: UIState;
  setCurrentScreen: (screen: Screen) => void;
  setMenuVisible: (visible: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  hideToast: () => void;

  // Flashcards State
  flashcards: Flashcard[];
  currentIndex: number;
  answerMode: AnswerMode;
  showAnswer: boolean;
  userAnswer: string;
  showUserAnswer: boolean;
  setFlashcards: (cards: Flashcard[]) => void;
  addFlashcard: (card: Omit<Flashcard, 'id'>) => void;
  updateFlashcard: (id: number, updates: Partial<Flashcard>) => void;
  deleteFlashcard: (id: number) => void;
  setCurrentIndex: (index: number) => void;
  nextCard: () => void;
  previousCard: () => void;
  setAnswerMode: (mode: AnswerMode) => void;
  setShowAnswer: (show: boolean) => void;
  setUserAnswer: (answer: string) => void;
  setShowUserAnswer: (show: boolean) => void;

  // Player & Game State
  playerData: PlayerData | null;
  stats: GameStats;
  achievements: Record<string, Achievement>;
  streak: number;
  showXPGain: number | null;
  setPlayerData: (data: PlayerData | null) => void;
  updatePlayerData: (updates: Partial<PlayerData>) => void;
  setStats: (stats: GameStats) => void;
  updateStats: (updates: Partial<GameStats>) => void;
  setAchievements: (achievements: Record<string, Achievement>) => void;
  setStreak: (streak: number) => void;
  setShowXPGain: (xp: number | null) => void;

  // Voice & Recording State
  isListening: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  apiKey: string;
  setIsListening: (listening: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setApiKey: (key: string) => void;

  // Pitch Teleprompter State
  pitchData: PitchData | null;
  teleprompterState: TeleprompterState;
  setPitchData: (data: PitchData) => void;
  updateTeleprompterState: (updates: Partial<TeleprompterState>) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Modal States
  modals: {
    apiKeyModal: boolean;
    jobDescModal: boolean;
    addCardModal: boolean;
  };
  setModalVisible: (modal: keyof AppState['modals'], visible: boolean) => void;

  // Actions
  resetGame: () => void;
  markCorrect: () => void;
  markIncorrect: () => void;
}

// ==================== DEFAULT VALUES ====================

const defaultUIState: UIState = {
  currentScreen: 'home',
  menuVisible: false,
  loading: false,
  error: null,
  toast: null,
};

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

const defaultSettings: AppSettings = {
  theme: 'dark',
  soundEnabled: true,
  voiceEnabled: true,
  autoScroll: true,
  language: 'es',
  difficulty: 'intermediate',
};

const defaultTeleprompterState: TeleprompterState = {
  currentPosition: 0,
  isListening: false,
  discreteMode: false,
  showContextualNotes: [],
  autoScroll: true,
  scrollSpeed: 1,
};

// ==================== ZUSTAND STORE ====================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // UI State
      ui: defaultUIState,
      setCurrentScreen: (screen) => 
        set((state) => ({ ui: { ...state.ui, currentScreen: screen } })),
      setMenuVisible: (visible) => 
        set((state) => ({ ui: { ...state.ui, menuVisible: visible } })),
      setLoading: (loading) => 
        set((state) => ({ ui: { ...state.ui, loading } })),
      setError: (error) => 
        set((state) => ({ ui: { ...state.ui, error } })),
      showToast: (type, message) => 
        set((state) => ({ ui: { ...state.ui, toast: { type, message } } })),
      hideToast: () => 
        set((state) => ({ ui: { ...state.ui, toast: null } })),

      // Flashcards State
      flashcards: [],
      currentIndex: 0,
      answerMode: 'flashcard',
      showAnswer: false,
      userAnswer: '',
      showUserAnswer: false,
      setFlashcards: (cards) => set({ flashcards: cards }),
      addFlashcard: (card) => set((state) => ({
        flashcards: [...state.flashcards, { ...card, id: Date.now() }]
      })),
      updateFlashcard: (id, updates) => set((state) => ({
        flashcards: state.flashcards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        )
      })),
      deleteFlashcard: (id) => set((state) => ({
        flashcards: state.flashcards.filter(card => card.id !== id)
      })),
      setCurrentIndex: (index) => set({ currentIndex: index }),
      nextCard: () => set((state) => ({
        currentIndex: (state.currentIndex + 1) % state.flashcards.length,
        showAnswer: false,
        userAnswer: '',
        showUserAnswer: false,
      })),
      previousCard: () => set((state) => ({
        currentIndex: (state.currentIndex - 1 + state.flashcards.length) % state.flashcards.length,
        showAnswer: false,
        userAnswer: '',
        showUserAnswer: false,
      })),
      setAnswerMode: (mode) => set({ answerMode: mode }),
      setShowAnswer: (show) => set({ showAnswer: show }),
      setUserAnswer: (answer) => set({ userAnswer: answer }),
      setShowUserAnswer: (show) => set({ showUserAnswer: show }),

      // Player & Game State
      playerData: null,
      stats: defaultStats,
      achievements: {},
      streak: 0,
      showXPGain: null,
      setPlayerData: (data) => set({ playerData: data }),
      updatePlayerData: (updates) => set((state) => ({
        playerData: state.playerData ? { ...state.playerData, ...updates } : null
      })),
      setStats: (stats) => set({ stats }),
      updateStats: (updates) => set((state) => ({
        stats: { ...state.stats, ...updates }
      })),
      setAchievements: (achievements) => set({ achievements }),
      setStreak: (streak) => set({ streak }),
      setShowXPGain: (xp) => set({ showXPGain: xp }),

      // Voice & Recording State
      isListening: false,
      isRecording: false,
      isProcessing: false,
      apiKey: '',
      setIsListening: (listening) => set({ isListening: listening }),
      setIsRecording: (recording) => set({ isRecording: recording }),
      setIsProcessing: (processing) => set({ isProcessing: processing }),
      setApiKey: (key) => set({ apiKey: key }),

      // Pitch Teleprompter State
      pitchData: null,
      teleprompterState: defaultTeleprompterState,
      setPitchData: (data) => set({ pitchData: data }),
      updateTeleprompterState: (updates) => set((state) => ({
        teleprompterState: { ...state.teleprompterState, ...updates }
      })),

      // Settings
      settings: defaultSettings,
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),

      // Modal States
      modals: {
        apiKeyModal: false,
        jobDescModal: false,
        addCardModal: false,
      },
      setModalVisible: (modal, visible) => set((state) => ({
        modals: { ...state.modals, [modal]: visible }
      })),

      // Actions
      resetGame: () => set({
        currentIndex: 0,
        showAnswer: false,
        userAnswer: '',
        showUserAnswer: false,
        streak: 0,
        stats: defaultStats,
      }),

      markCorrect: () => {
        const state = get();
        const newStreak = state.streak + 1;
        const newStats = {
          ...state.stats,
          total: state.stats.total + 1,
          correct: state.stats.correct + 1,
          streak: newStreak,
          accuracy: ((state.stats.correct + 1) / (state.stats.total + 1)) * 100,
        };
        
        set({
          stats: newStats,
          streak: newStreak,
        });
      },

      markIncorrect: () => {
        const state = get();
        const newStats = {
          ...state.stats,
          total: state.stats.total + 1,
          incorrect: state.stats.incorrect + 1,
          streak: 0,
          accuracy: (state.stats.correct / (state.stats.total + 1)) * 100,
        };
        
        set({
          stats: newStats,
          streak: 0,
        });
      },
    }),
    {
      name: 'study-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these parts of the state
        flashcards: state.flashcards,
        playerData: state.playerData,
        stats: state.stats,
        achievements: state.achievements,
        settings: state.settings,
        apiKey: state.apiKey,
        pitchData: state.pitchData,
      }),
    }
  )
);

// ==================== SELECTORS ====================

// UI Selectors
export const selectCurrentScreen = (state: AppState) => state.ui.currentScreen;
export const selectMenuVisible = (state: AppState) => state.ui.menuVisible;
export const selectLoading = (state: AppState) => state.ui.loading;
export const selectError = (state: AppState) => state.ui.error;
export const selectToast = (state: AppState) => state.ui.toast;

// Flashcard Selectors
export const selectCurrentCard = (state: AppState) => 
  state.flashcards[state.currentIndex] || null;
export const selectFlashcards = (state: AppState) => state.flashcards;
export const selectCurrentIndex = (state: AppState) => state.currentIndex;
export const selectAnswerMode = (state: AppState) => state.answerMode;

// Player Selectors
export const selectPlayerData = (state: AppState) => state.playerData;
export const selectStats = (state: AppState) => state.stats;
export const selectStreak = (state: AppState) => state.streak;
export const selectAchievements = (state: AppState) => state.achievements;

// Voice Selectors
export const selectIsListening = (state: AppState) => state.isListening;
export const selectIsProcessing = (state: AppState) => state.isProcessing;
export const selectApiKey = (state: AppState) => state.apiKey;

// Settings Selectors
export const selectSettings = (state: AppState) => state.settings;