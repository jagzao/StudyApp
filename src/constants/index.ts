import { Dimensions } from 'react-native';

// ==================== DEVICE CONSTANTS ====================

export const DEVICE = {
  WIDTH: Dimensions.get('window').width,
  HEIGHT: Dimensions.get('window').height,
  SCREEN: Dimensions.get('screen'),
} as const;

// ==================== COLORS ====================

export const COLORS = {
  // Main theme colors
  background: '#0A0A0A',
  secondary: '#1A1A1A',
  neonRed: '#FF1E1E',
  neonBlue: '#00D4FF',
  white: '#FFFFFF',
  gray: '#666666',
  success: '#00FF88',
  warning: '#FFB800',
  error: '#dc3545',
  
  // Extended colors
  glowRed: '#FF1E1E80',
  darkGray: '#2A2A2A',
  lightGray: '#666666',
  
  // Aliases for backward compatibility
  primary: '#FF1E1E',
  dark: '#0A0A0A',
  accent: '#FF1E1E',
} as const;

// ==================== TYPOGRAPHY ====================

export const TYPOGRAPHY = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    huge: 24,
    massive: 32,
  },
  weights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
    black: '900' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
} as const;

// ==================== SPACING ====================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
  massive: 48,
} as const;

// ==================== BORDER RADIUS ====================

export const BORDER_RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 50,
} as const;

// ==================== SHADOWS ====================

export const SHADOWS = {
  small: {
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  large: {
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  huge: {
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
} as const;

// ==================== ANIMATIONS ====================

export const ANIMATIONS = {
  durations: {
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 800,
    slowest: 1000,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    linear: 'linear',
  },
} as const;

// ==================== STORAGE KEYS ====================

export const STORAGE_KEYS = {
  FLASHCARDS: '@study_cards',
  STATS: '@study_stats',
  API_KEY: '@openai_api_key',
  PLAYER_DATA: '@player_data',
  ACHIEVEMENTS: '@achievements',
  PITCH_DATA: '@pitch_data',
  SETTINGS: '@app_settings',
  LEVEL_PROGRESS: '@level_progress',
} as const;

// ==================== API ENDPOINTS ====================

export const API = {
  OPENAI: {
    BASE_URL: 'https://api.openai.com/v1',
    CHAT_COMPLETIONS: '/chat/completions',
    AUDIO_TRANSCRIPTIONS: '/audio/transcriptions',
  },
} as const;

// ==================== GAME CONSTANTS ====================

export const GAME = {
  XP: {
    CORRECT_ANSWER: 50,
    STREAK_BONUS: 5,
    DAILY_BONUS: 100,
    ACHIEVEMENT_BONUS: 200,
  },
  LEVELS: {
    XP_PER_LEVEL: 1000,
    MAX_LEVEL: 100,
  },
  STREAKS: {
    BRONZE: 5,
    SILVER: 10,
    GOLD: 20,
    DIAMOND: 50,
  },
  ACCURACY: {
    EXCELLENT: 90,
    GOOD: 75,
    FAIR: 60,
    POOR: 40,
  },
} as const;

// ==================== VOICE CONSTANTS ====================

export const VOICE = {
  RECORDING: {
    MAX_DURATION: 30000, // 30 seconds
    QUALITY: 'HIGH_QUALITY',
  },
  SPEECH: {
    LANGUAGE: 'es-ES',
    PITCH: 1.0,
    RATE: 0.9,
  },
  COMMANDS: {
    NAVIGATION: ['siguiente', 'anterior', 'next', 'previous'],
    ACTIONS: ['correcto', 'incorrecto', 'correct', 'wrong'],
    CONTENT: ['respuesta', 'leer', 'repetir', 'answer', 'read', 'repeat'],
  },
} as const;

// ==================== PITCH TELEPROMPTER CONSTANTS ====================

export const TELEPROMPTER = {
  SCROLL_SPEED: {
    SLOW: 0.5,
    NORMAL: 1.0,
    FAST: 1.5,
  },
  KEYWORDS: {
    TECHNICAL: ['.net', 'react', 'azure', 'sql', 'javascript', 'typescript'],
    SOFT_SKILLS: ['liderazgo', 'comunicación', 'trabajo en equipo', 'problem solving'],
    EXPERIENCE: ['años', 'proyectos', 'experiencia', 'desarrollo', 'implementación'],
  },
  WAVE_ANIMATIONS: {
    WAVE1: { scale: 1.2, duration: 1000 },
    WAVE2: { scale: 1.4, duration: 1500 },
    WAVE3: { scale: 1.6, duration: 2000 },
  },
} as const;

// ==================== SCREEN NAMES ====================

export const SCREENS = {
  HOME: 'home',
  PITCH: 'pitch',
  SKILL_TREE: 'camino',
  ACHIEVEMENTS: 'achievements',
  STATS: 'stats',
  SETTINGS: 'settings',
} as const;

// ==================== DIFFICULTY LEVELS ====================

export const DIFFICULTY = {
  BEGINNER: {
    name: 'Beginner',
    color: COLORS.success,
    icon: '🌱',
    multiplier: 1.0,
  },
  INTERMEDIATE: {
    name: 'Intermediate',
    color: COLORS.warning,
    icon: '⚡',
    multiplier: 1.2,
  },
  ADVANCED: {
    name: 'Advanced',
    color: COLORS.neonRed,
    icon: '🔥',
    multiplier: 1.5,
  },
  EXPERT: {
    name: 'Expert',
    color: COLORS.neonBlue,
    icon: '💎',
    multiplier: 2.0,
  },
} as const;

// ==================== ACHIEVEMENT CATEGORIES ====================

export const ACHIEVEMENT_CATEGORIES = {
  LEARNING: 'learning',
  STREAK: 'streak',
  ACCURACY: 'accuracy',
  VOICE: 'voice',
  SPECIAL: 'special',
} as const;

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  NETWORK: 'Error de conexión. Verifica tu internet.',
  API_KEY: 'API Key no configurada o inválida.',
  AUDIO_PERMISSION: 'Se necesitan permisos de audio.',
  STORAGE: 'Error guardando datos localmente.',
  TRANSCRIPTION: 'Error transcribiendo audio.',
  EVALUATION: 'Error evaluando respuesta.',
  GENERIC: 'Ha ocurrido un error inesperado.',
} as const;

// ==================== SUCCESS MESSAGES ====================

export const SUCCESS_MESSAGES = {
  API_KEY_SAVED: 'API Key configurada correctamente',
  CARD_ADDED: 'Nueva tarjeta agregada',
  CARD_UPDATED: 'Tarjeta actualizada',
  CARD_DELETED: 'Tarjeta eliminada',
  PROGRESS_SAVED: 'Progreso guardado',
  ACHIEVEMENT_UNLOCKED: '🏆 ¡Logro desbloqueado!',
} as const;

// ==================== DEFAULT VALUES ====================

export const DEFAULTS = {
  FLASHCARDS: [
    {
      id: 1,
      question: "¿Qué es React Native?",
      answer: "Un framework para crear aplicaciones móviles usando React",
      category: "React Native",
      difficulty: "Beginner" as const,
    },
    {
      id: 2,
      question: "¿Qué es JavaScript?",
      answer: "Un lenguaje de programación interpretado",
      category: "JavaScript",
      difficulty: "Beginner" as const,
    },
    {
      id: 3,
      question: "¿Qué es una función?",
      answer: "Un bloque de código reutilizable que realiza una tarea específica",
      category: "Programación",
      difficulty: "Beginner" as const,
    },
  ],
  PLAYER_DATA: {
    level: 1,
    xp: 0,
    currentLevelXP: 0,
    xpToNextLevel: 1000,
    totalXp: 0,
    title: 'Novice Developer',
    streak: 0,
    maxStreak: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    voiceCommandsUsed: 0,
  },
  SETTINGS: {
    theme: 'dark' as const,
    soundEnabled: true,
    voiceEnabled: true,
    autoScroll: true,
    language: 'es' as const,
    difficulty: 'intermediate' as const,
  },
} as const;

// ==================== TYPE GUARDS ====================

export const isValidScreen = (screen: string): screen is keyof typeof SCREENS => {
  return Object.values(SCREENS).includes(screen as any);
};

export const isValidDifficulty = (difficulty: string): difficulty is keyof typeof DIFFICULTY => {
  return Object.keys(DIFFICULTY).includes(difficulty.toUpperCase());
};