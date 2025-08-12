# 🔧 GUÍA PARA SOLUCIONAR ERROR import.meta EN WEB

## 🚨 **Problema Identificado**

El error `Cannot use 'import.meta' outside a module` está relacionado con:

1. **Versiones muy nuevas** de React 19 y React Native 0.79
2. **Configuración de módulos** en Metro para web
3. **Uso de alias "@"** que puede no resolver correctamente

---

## ✅ **SOLUCIONES IMPLEMENTADAS**

### **1. Metro Configuration**
- ✅ Creado `metro.config.js` con configuración optimizada para web
- ✅ Habilitado soporte para CSS en Metro
- ✅ Configurado alias para imports absolutos

### **2. Babel Configuration** 
- ✅ Simplificado `babel.config.js` sin plugins problemáticos
- ✅ Mantenido module-resolver para alias

### **3. App Simple de Test**
- ✅ Creado `App.tsx` simple sin imports problemáticos
- ✅ Funciona para verificar que Expo Web funciona básicamente

---

## 🔄 **ALTERNATIVAS PARA RESOLVER**

### **Opción 1: Downgrade de React (Recomendado)**

```bash
# Instalar versiones más estables
npm install react@18.2.0 react-dom@18.2.0
npm install react-native@0.76.2
```

### **Opción 2: Eliminar Alias Temporalmente**

1. **Editar imports en archivos TypeScript**:
   ```typescript
   // Cambiar de:
   import { useFlashcards } from '@/hooks/useFlashcards';
   
   // A:
   import { useFlashcards } from './src/hooks/useFlashcards';
   ```

2. **Actualizar tsconfig.json**:
   ```json
   {
     "extends": "expo/tsconfig.base",
     "compilerOptions": {
       "paths": {} // Remover paths temporalmente
     }
   }
   ```

### **Opción 3: Usar Imports Relativos**

```typescript
// App.tsx usando imports relativos
import { useFlashcards } from './src/hooks/useFlashcards';
import { COLORS } from './src/constants/colors';
import FlashcardScreen from './src/components/FlashcardScreen';
```

---

## 🎯 **PASOS PARA APLICAR LA SOLUCIÓN**

### **Paso 1: Restaurar App Completo**
```bash
# Restaurar la app completa
mv App.tsx App.simple.tsx
mv App.complex.tsx App.tsx
```

### **Paso 2: Eliminar alias temporalmente**

Editar todos los imports en `src/` para usar rutas relativas:

```bash
# En App.tsx cambiar:
import { useFlashcards } from '@/hooks/useFlashcards';
# Por:
import { useFlashcards } from './src/hooks/useFlashcards';
```

### **Paso 3: Verificar funcionamiento**
```bash
# Limpiar cache y reiniciar
npx expo start --clear --web
```

---

## 📝 **ESTADO ACTUAL**

### ✅ **Funcionando**
- App simple en web ✅
- TypeScript compila sin errores ✅
- Configuración de Metro lista ✅
- Build para móvil funcional ✅

### ⚠️ **Pendiente**
- Resolver import.meta para app completa
- Probar versiones estables de React
- Verificar que todos los imports funcionen

---

## 🚀 **SIGUIENTE PASO**

**Opción A (Rápida)**: Usar imports relativos
```typescript
// En lugar de '@/hooks/useFlashcards'
import { useFlashcards } from './src/hooks/useFlashcards';
```

**Opción B (Estable)**: Downgrade a React 18
```bash
npm install react@18.2.0 react-dom@18.2.0
```

---

## 💡 **EXPLICACIÓN TÉCNICA**

El problema surge porque:

1. **React 19** introdujo cambios en el sistema de módulos
2. **Metro bundler** aún no tiene soporte completo para estas versiones
3. **import.meta** es una característica de ES modules que requiere configuración específica
4. **Expo SDK 53** puede no ser completamente compatible con React 19

---

**Recomendación**: Usar **Opción A** (imports relativos) para una solución rápida, luego migrar a **Opción B** (React 18) para estabilidad a largo plazo.