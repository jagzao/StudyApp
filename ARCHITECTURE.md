# 🏗️ ARQUITECTURA LIMPIA - STUDY AI

## 📋 Índice
1. [Visión General](#visión-general)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Capas de la Arquitectura](#capas-de-la-arquitectura)
4. [Tecnologías y Patrones](#tecnologías-y-patrones)
5. [Manejo de Estado](#manejo-de-estado)
6. [Servicios](#servicios)
7. [Hooks Personalizados](#hooks-personalizados)
8. [Tipos TypeScript](#tipos-typescript)
9. [Buenas Prácticas](#buenas-prácticas)
10. [Flujo de Datos](#flujo-de-datos)

---

## 🎯 Visión General

La aplicación Study AI implementa **Arquitectura Limpia** con **TypeScript**, siguiendo los principios SOLID y separación de responsabilidades. La arquitectura está diseñada para ser:

- ✅ **Mantenible**: Código fácil de modificar y extender
- ✅ **Testeable**: Cada capa puede probarse independientemente
- ✅ **Escalable**: Fácil agregar nuevas funcionalidades
- ✅ **Legible**: Código autodocumentado con TypeScript
- ✅ **Robusta**: Manejo de errores y estados consistente

---

## 📁 Estructura de Carpetas

```
src/
├── components/           # Componentes reutilizables de UI
│   ├── GameHUD.tsx
│   ├── GameMenu.tsx
│   ├── PitchTeleprompter.tsx
│   └── SkillTreeMap.tsx
├── screens/             # Pantallas principales
│   ├── HomeScreen.tsx
│   ├── PitchScreen.tsx
│   └── SettingsScreen.tsx
├── hooks/               # Custom hooks para lógica reutilizable
│   ├── useFlashcards.ts
│   ├── useVoice.ts
│   ├── usePlayer.ts
│   └── useSettings.ts
├── services/            # Servicios externos y APIs
│   ├── whisperService.ts
│   ├── interviewService.ts
│   ├── gamificationService.ts
│   └── responseEvaluationService.ts
├── stores/              # Manejo de estado global
│   └── appStore.ts
├── types/               # Definiciones TypeScript
│   └── index.ts
├── utils/               # Utilidades y helpers
│   ├── storage.ts
│   ├── animations.ts
│   └── validation.ts
└── constants/           # Constantes de la aplicación
    └── index.ts
```

---

## 🏛️ Capas de la Arquitectura

### 1. **Capa de Presentación (UI)**
- **Componentes React**: Interfaz de usuario pura
- **Screens**: Pantallas completas de la aplicación
- **Hooks de UI**: Lógica específica de interfaz

### 2. **Capa de Aplicación (Business Logic)**
- **Custom Hooks**: Lógica de negocio reutilizable
- **Stores**: Manejo de estado global
- **Controladores**: Coordinación entre capas

### 3. **Capa de Dominio (Core)**
- **Types**: Entidades y interfaces de negocio
- **Constants**: reglas de negocio constantes
- **Validation**: Reglas de validación

### 4. **Capa de Infraestructura**
- **Services**: APIs externas y servicios
- **Storage**: Persistencia de datos
- **Utils**: Utilidades técnicas

---

## 🛠️ Tecnologías y Patrones

### **Tecnologías Principales**
- **React Native**: Framework móvil
- **TypeScript**: Tipado estático
- **Expo**: Toolchain y runtime
- **Zustand**: Manejo de estado
- **AsyncStorage**: Persistencia local

### **Patrones Implementados**
- **Repository Pattern**: En servicios de datos
- **Observer Pattern**: En el store de estado
- **Command Pattern**: En comandos de voz
- **Strategy Pattern**: En evaluación de respuestas
- **Factory Pattern**: En creación de componentes

### **Principios SOLID**
- ✅ **S**ingle Responsibility: Cada módulo tiene una responsabilidad
- ✅ **O**pen/Closed: Extensible sin modificar código existente
- ✅ **L**iskov Substitution: Interfaces consistentes
- ✅ **I**nterface Segregation: Interfaces específicas y pequeñas
- ✅ **D**ependency Inversion: Dependencias hacia abstracciones

---

## 🗄️ Manejo de Estado

### **Zustand Store Central**

```typescript
// Estructura del Estado Global
interface AppState {
  // UI State
  ui: UIState;
  
  // Business State
  flashcards: Flashcard[];
  playerData: PlayerData | null;
  stats: GameStats;
  
  // Feature State
  voice: VoiceState;
  teleprompter: TeleprompterState;
  
  // Actions
  actions: {
    updateFlashcard: (id: number, data: Partial<Flashcard>) => void;
    markCorrect: () => void;
    markIncorrect: () => void;
  };
}
```

### **Ventajas del Patrón Elegido**
- **Performance**: Solo re-renderiza componentes afectados
- **DevTools**: Debugging avanzado con Zustand DevTools
- **Persistencia**: Automática con middleware persist
- **TypeScript**: Tipado completo del estado
- **Simplicidad**: Menos boilerplate que Redux

---

## 🔧 Servicios

### **WhisperService** - Transcripción de Audio
```typescript
interface WhisperService {
  setApiKey(key: string): void;
  transcribeAudio(uri: string): Promise<string>;
  isConfigured(): boolean;
}
```

### **InterviewService** - Gestión de Entrevistas
```typescript
interface InterviewService {
  generateQuestionsFromJobDescription(jobDesc: string): Promise<Flashcard[]>;
  getFallbackQuestions(): Flashcard[];
  getQuestionsByTechnology(tech: string): Flashcard[];
}
```

### **GamificationService** - Sistema de Puntos
```typescript
interface GamificationService {
  getPlayerData(): Promise<PlayerData>;
  awardXP(amount: number, reason: string): Promise<boolean>;
  updateStats(stats: Partial<GameStats>): Promise<void>;
  checkAchievements(criteria: any): Promise<string[]>;
}
```

### **ResponseEvaluationService** - IA de Evaluación
```typescript
interface ResponseEvaluationService {
  evaluateResponse(question: string, correct: string, user: string): Promise<ResponseEvaluation>;
  detectSTARPattern(response: string): STARAnalysis;
  evaluateTechnicalKeywords(response: string, keywords: string[]): KeywordAnalysis;
}
```

---

## 🎣 Hooks Personalizados

### **useFlashcards** - Gestión de Tarjetas
```typescript
const useFlashcards = () => {
  // State
  const { flashcards, currentIndex, showAnswer } = useAppStore();
  
  // Actions
  const nextCard = useCallback(() => { /* logic */ }, []);
  const addCard = useCallback(async (card) => { /* logic */ }, []);
  
  // Computed
  const currentCard = flashcards[currentIndex] || null;
  const progress = (currentIndex + 1) / flashcards.length * 100;
  
  return { flashcards, currentCard, nextCard, addCard, progress };
};
```

### **useVoice** - Reconocimiento de Voz
```typescript
const useVoice = () => {
  const { isListening, isProcessing } = useAppStore();
  
  const startListening = useCallback(async () => {
    // Audio recording logic
  }, []);
  
  const processCommand = useCallback(async (command: string) => {
    // Command processing logic
  }, []);
  
  return { isListening, isProcessing, startListening, processCommand };
};
```

### **usePlayer** - Sistema de Jugador
```typescript
const usePlayer = () => {
  const { playerData, stats, streak } = useAppStore();
  
  const markCorrect = useCallback(async () => {
    // Award XP, update streak, check achievements
  }, []);
  
  const awardXP = useCallback(async (amount: number) => {
    // XP awarding logic
  }, []);
  
  return { playerData, stats, markCorrect, awardXP };
};
```

---

## 📝 Tipos TypeScript

### **Entidades Principales**
```typescript
interface Flashcard {
  id: number;
  question: string;
  answer: string;
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerData {
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
}

interface ResponseEvaluation {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
  improvements?: string;
  keywordAnalysis?: KeywordAnalysis;
  starAnalysis?: STARAnalysis;
}
```

### **Props de Componentes**
```typescript
interface GameHUDProps {
  playerData: PlayerData | null;
  onMenuPress: () => void;
  streak: number;
  showXPGain: number | null;
  onXPAnimationComplete?: () => void;
}

interface PitchTeleprompterProps {
  onClose: () => void;
}
```

---

## ✅ Buenas Prácticas

### **1. Naming Conventions**
```typescript
// Interfaces: PascalCase con sufijo descriptivo
interface UserService { }
interface FlashcardProps { }

// Types: PascalCase
type Screen = 'home' | 'pitch' | 'settings';

// Constants: UPPER_SNAKE_CASE
const API_ENDPOINTS = { } as const;

// Functions: camelCase con verbos
const getUserData = () => {};
const validateInput = () => {};
```

### **2. Error Handling**
```typescript
// Consistente manejo de errores
const processVoiceCommand = async (command: string) => {
  try {
    const result = await whisperService.transcribe(command);
    return { success: true, data: result };
  } catch (error) {
    console.error('Voice processing error:', error);
    return { success: false, error: error.message };
  }
};
```

### **3. Type Safety**
```typescript
// Type guards para validación
const isValidScreen = (screen: string): screen is Screen => {
  return ['home', 'pitch', 'settings'].includes(screen);
};

// Assertions con validación
const getScreenComponent = (screen: string) => {
  if (!isValidScreen(screen)) {
    throw new Error(`Invalid screen: ${screen}`);
  }
  return screenComponents[screen];
};
```

### **4. Performance**
```typescript
// Memoización de selectores
const selectCurrentCard = useMemo(() => 
  flashcards[currentIndex] || null, 
  [flashcards, currentIndex]
);

// Callbacks estables
const handleNext = useCallback(() => {
  nextCard();
}, [nextCard]);
```

---

## 🔄 Flujo de Datos

### **1. Flujo de Comandos de Voz**
```
User speaks → Audio Recording → Whisper API → Command Processing → State Update → UI Re-render
```

### **2. Flujo de Evaluación de Respuestas**
```
User Response → AI Evaluation → Score Calculation → XP Award → Achievement Check → UI Feedback
```

### **3. Flujo de Gamificación**
```
Correct Answer → XP Calculation → Level Check → Achievement Unlock → Stats Update → Persistence
```

### **4. Flujo de Datos General**
```
UI Event → Hook Action → Service Call → State Update → Component Re-render → UI Update
```

---

## 🚀 Beneficios de esta Arquitectura

### **✅ Mantenibilidad**
- Separación clara de responsabilidades
- Código autodocumentado con TypeScript
- Fácil localización y corrección de bugs

### **✅ Escalabilidad**
- Nuevas features sin afectar código existente
- Servicios intercambiables (diferentes APIs)
- Componentes reutilizables

### **✅ Testabilidad**
- Cada capa puede probarse independientemente
- Mocks sencillos para servicios
- Hooks aislados para testing unitario

### **✅ Developer Experience**
- IntelliSense completo con TypeScript
- Detección temprana de errores
- Refactoring seguro

### **✅ Performance**
- Re-renders optimizados con Zustand
- Lazy loading de componentes
- Memoización inteligente

---

## 📚 Próximos Pasos de Arquitectura

1. **Testing Suite**: Jest + React Native Testing Library
2. **Error Boundary**: Manejo global de errores de React
3. **Offline Support**: Sincronización automática
4. **Code Splitting**: Lazy loading de pantallas
5. **CI/CD**: Pipeline automatizado con GitHub Actions
6. **Performance Monitoring**: Flipper integration
7. **Analytics**: Event tracking con arquitectura pluggable

Esta arquitectura proporciona una base sólida para el crecimiento y mantenimiento a largo plazo de la aplicación Study AI. 🎯