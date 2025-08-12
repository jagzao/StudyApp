# 🔧 STACK TECNOLÓGICO - STUDY AI

## 🚀 ¿Qué es Expo?

**Expo** es un framework y plataforma para desarrollar aplicaciones React Native universales. Es como "Create React App" pero para móviles.

### **🎯 Ventajas de Expo:**
- ✅ **Zero Config**: No necesitas configurar Android Studio/Xcode
- ✅ **OTA Updates**: Actualiza tu app sin Google Play Store
- ✅ **Push Notifications**: Sistema integrado de notificaciones
- ✅ **Easy Deployment**: Build en la nube con EAS
- ✅ **Rich APIs**: Cámara, audio, sensores, etc. preconfigurados
- ✅ **Development Speed**: Hot reload, debugging tools

### **⚡ Expo vs React Native CLI:**
```
Expo (Managed Workflow)          React Native CLI (Bare)
├── ✅ Setup rápido               ├── ⚠️ Setup complejo
├── ✅ Build en la nube           ├── ❌ Requiere SDKs locales
├── ✅ OTA updates               ├── ❌ Solo store updates
├── ⚠️ Limitado a APIs Expo      ├── ✅ Acceso completo nativo
└── ✅ Ideal para MVPs           └── ✅ Ideal para apps complejas
```

---

## 🗄️ Base de Datos Actual

### **📱 AsyncStorage (Actual)**
```typescript
// Estado actual: Key-Value storage simple
await AsyncStorage.setItem('@study_cards', JSON.stringify(flashcards));
await AsyncStorage.setItem('@player_data', JSON.stringify(playerData));
await AsyncStorage.setItem('@openai_api_key', apiKey);
```

**Limitaciones:**
- ❌ Solo strings (no relaciones)
- ❌ No queries complejas
- ❌ No indexes
- ❌ Difícil de escalar

---

## 📊 Cómo se Obtienen las Preguntas Actualmente

### **1. Preguntas Predefinidas** (Fallback)
```typescript
// services/interviewService.js
const defaultCards = [
  { 
    question: "¿Qué es React Native?", 
    answer: "Framework para apps móviles con React",
    category: "React Native",
    difficulty: "Beginner"
  },
  // ... más preguntas hardcodeadas
];
```

### **2. Generación desde Job Description** (OpenAI)
```typescript
// Usuario pega descripción de trabajo
const jobDescription = `
Senior Full Stack Developer
- React, Node.js, AWS
- 5+ years experience
- GraphQL, TypeScript
`;

// IA genera preguntas específicas
const questions = await openAI.createChatCompletion({
  model: "gpt-3.5-turbo",
  messages: [{
    role: "system",
    content: "Genera preguntas de entrevista técnica basadas en esta descripción..."
  }]
});
```

### **3. Preguntas por Tecnología** (Templates)
```typescript
const reactQuestions = [
  "¿Qué son los React Hooks?",
  "Explica el Virtual DOM",
  "¿Cómo manejas estado global?"
];
```

**Problemas actuales:**
- ❌ Preguntas limitadas y estáticas  
- ❌ No hay personalización por nivel
- ❌ Depende 100% de internet para IA
- ❌ No hay banco de preguntas robusto

---

## 🚀 MEJORAS IMPLEMENTANDO AHORA

### **1. SQLite Database Implementation**