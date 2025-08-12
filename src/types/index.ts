// ==================== CORE TYPES ====================

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  lastReviewed?: Date;
  dueDate?: Date;
  totalReviews?: number;
  correctCount?: number;
  studyCount?: number;
  easeFactor?: number;
  interval?: number;
}

export interface PlayerData {
  level: number;
  xp: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  totalXp: number;
  title: string;
  streak: number;
  maxStreak: number;
  questionsAnswered: number;
  correctAnswers: number;
  voiceCommandsUsed: number;
}

export interface GameStats {
  total: number;
  correct: number;
  incorrect: number;
  streak: number;
  accuracy: number;
  averageTime: number;
  sessionsCompleted: number;
  questionsAnswered: number;
  correctAnswers: number;
  maxStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
}

// ==================== VOICE & AI TYPES ====================

export interface VoiceCommand {
  command: string;
  timestamp: Date;
  confidence: number;
  action: VoiceAction;
}

export type VoiceAction = 
  | 'next'
  | 'previous' 
  | 'show_answer'
  | 'mark_correct'
  | 'mark_incorrect'
  | 'read_question'
  | 'repeat'
  | 'answer_response';

export interface ResponseEvaluation {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
  improvements?: string;
  keywordAnalysis?: {
    foundKeywords: string[];
    missingKeywords: string[];
    score: number;
  };
  starAnalysis?: STARAnalysis;
}

export interface STARAnalysis {
  components: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  };
  score: number;
  isComplete: boolean;
  suggestions: string[];
}

// ==================== PITCH TELEPROMPTER TYPES ====================

export interface PitchData {
  intro: string;
  contextualNotes: Record<string, string[]>;
  starExamples: Record<string, STARExample>;
}

export interface STARExample {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface TeleprompterState {
  currentPosition: number;
  isListening: boolean;
  discreteMode: boolean;
  showContextualNotes: string[];
  autoScroll: boolean;
  scrollSpeed: number;
}

// ==================== UI/UX TYPES ====================

export type Screen = 
  | 'home' 
  | 'pitch' 
  | 'camino' 
  | 'achievements' 
  | 'stats' 
  | 'settings';

export type AnswerMode = 'flashcard' | 'interview';

export interface UIState {
  currentScreen: Screen;
  menuVisible: boolean;
  loading: boolean;
  error: string | null;
  toast: ToastMessage | null;
}

export interface ToastMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface AnimationState {
  fadeAnim: any; // Animated.Value
  slideAnim: any;
  scaleAnim: any;
  rotateAnim: any;
}

// ==================== SERVICE TYPES ====================

export interface WhisperService {
  setApiKey(key: string): void;
  transcribeAudio(uri: string): Promise<string>;
  isConfigured(): boolean;
}

export interface InterviewService {
  generateQuestionsFromJobDescription(jobDesc: string): Promise<Flashcard[]>;
  getFallbackQuestions(): Flashcard[];
  getQuestionsByTechnology(tech: string): Flashcard[];
}

export interface GamificationService {
  getPlayerData(): Promise<PlayerData>;
  awardXP(amount: number, reason: string): Promise<boolean>;
  updateStats(stats: Partial<GameStats>): Promise<void>;
  getLevelProgress(): Promise<Record<string, any>>;
  getAchievements(): Promise<Record<string, Achievement>>;
  checkAchievements(criteria: any): Promise<string[]>;
}

export interface ResponseEvaluationService {
  setApiKey(key: string): void;
  evaluateResponse(question: string, correctAnswer: string, userResponse: string): Promise<ResponseEvaluation>;
  evaluateTechnicalKeywords(response: string, keywords: string[]): any;
  detectSTARPattern(response: string): STARAnalysis;
}

// ==================== STORAGE TYPES ====================

export interface StorageKeys {
  FLASHCARDS: '@study_cards';
  STATS: '@study_stats';
  API_KEY: '@openai_api_key';
  PLAYER_DATA: '@player_data';
  ACHIEVEMENTS: '@achievements';
  PITCH_DATA: '@pitch_data';
  SETTINGS: '@app_settings';
}

export interface AppSettings {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  voiceEnabled: boolean;
  autoScroll: boolean;
  language: 'es' | 'en';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ==================== API TYPES ====================

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface APIError {
  status: number;
  message: string;
  code?: string;
}

// ==================== HOOK TYPES ====================

export interface UseFlashcardsReturn {
  flashcards: Flashcard[];
  currentIndex: number;
  currentCard: Flashcard | null;
  loading: boolean;
  error: string | null;
  nextCard: () => void;
  previousCard: () => void;
  addCard: (card: Omit<Flashcard, 'id'>) => Promise<void>;
  deleteCard: (id: number) => Promise<void>;
  updateCard: (id: number, updates: Partial<Flashcard>) => Promise<void>;
}

export interface UseVoiceReturn {
  isListening: boolean;
  isProcessing: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  processCommand: (command: string) => Promise<void>;
}

export interface UsePlayerReturn {
  playerData: PlayerData | null;
  loading: boolean;
  updatePlayer: (updates: Partial<PlayerData>) => Promise<void>;
  awardXP: (amount: number, reason: string) => Promise<void>;
}

// ==================== COMPONENT PROPS ====================

export interface GameHUDProps {
  playerData: PlayerData | null;
  onMenuPress: () => void;
  streak: number;
  showXPGain: number | null;
  onXPAnimationComplete?: () => void;
}

export interface GameMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  playerData: PlayerData | null;
  achievements: Record<string, Achievement>;
  onJobInterview?: () => void;
  onSeniorPrep?: () => void;
  onConfigWhisper?: () => void;
}

export interface PitchTeleprompterProps {
  onClose: () => void;
}

export interface SkillTreeMapProps {
  onLevelSelect: (treeId: string, level: any) => void;
  playerData: PlayerData | null;
}

// ==================== CONSTANTS ====================

export const COLORS = {
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
  primary: '#FF1E1E',
  dark: '#0A0A0A',
  lightGray: '#666666',
  accent: '#FF1E1E',
} as const;

export const STORAGE_KEYS: StorageKeys = {
  FLASHCARDS: '@study_cards',
  STATS: '@study_stats',
  API_KEY: '@openai_api_key',
  PLAYER_DATA: '@player_data',
  ACHIEVEMENTS: '@achievements',
  PITCH_DATA: '@pitch_data',
  SETTINGS: '@app_settings',
} as const;