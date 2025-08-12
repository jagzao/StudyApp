# 📱 GUÍA COMPLETA: Crear APK de Study AI

## 🎯 MÉTODO RECOMENDADO: EAS Build

### Paso 1: Crear cuenta en Expo
1. Ve a https://expo.dev/
2. Crea una cuenta gratuita
3. Confirma tu email

### Paso 2: Login en EAS CLI
```bash
eas login
# Ingresa tu email y contraseña de Expo
```

### Paso 3: Configurar proyecto
```bash
eas build:configure
# Sigue las instrucciones en pantalla
```

### Paso 4: Crear APK
```bash
# Para APK de preview (recomendado para testing)
eas build --platform android --profile preview

# O para APK de development (incluye dev tools)
eas build --profile development --platform android
```

### Paso 5: Descargar APK
- EAS te dará un link de descarga
- O ve a https://expo.dev/accounts/[tu-usuario]/projects/study-ai-interview/builds

---

## 🚀 MÉTODO ALTERNATIVO: Expo Application Services (Web)

Si prefieres usar la interfaz web:

1. **Subir código a Expo:**
   ```bash
   npx expo publish
   ```

2. **Ir a Expo Dashboard:**
   - https://expo.dev/
   - Inicia sesión
   - Encuentra tu proyecto "study-ai-interview"

3. **Crear Build:**
   - Click en "Build"
   - Selecciona "Android"
   - Selecciona "APK" 
   - Click "Start Build"

4. **Descargar:**
   - Espera 5-15 minutos
   - Descarga el APK

---

## 📋 MÉTODO SIMPLE: Expo Go (Para testing rápido)

**Más fácil pero requiere Expo Go instalado:**

1. **Instala Expo Go en tu celular:**
   - Android: Play Store → "Expo Go"
   - iOS: App Store → "Expo Go"

2. **Ejecuta la app:**
   ```bash
   npx expo start --port 3004
   ```

3. **Escanea QR:**
   - Abre Expo Go en tu celular
   - Escanea el QR que aparece en tu terminal
   - ¡La app se carga directamente!

---

## ⚠️ PERMISOS IMPORTANTES

Tu app necesita estos permisos (ya configurados en app.json):

```json
"permissions": [
  "android.permission.RECORD_AUDIO",     // Para Whisper
  "android.permission.INTERNET",         // Para API calls
  "android.permission.ACCESS_NETWORK_STATE"
]
```

---

## 🎮 FUNCIONALIDADES QUE FUNCIONARÁN EN APK:

✅ **Sistema de gamificación completo**
✅ **Skill trees y niveles**
✅ **Sistema de XP y logros**
✅ **Almacenamiento local (AsyncStorage)**
✅ **Reconocimiento de voz (Whisper)**
✅ **Síntesis de voz**
✅ **Job Description IA**
✅ **Interfaz futurista completa**

---

## 🛠️ TROUBLESHOOTING

**Error "expo command not found":**
```bash
npm install -g @expo/cli
```

**Error de permisos:**
```bash
# En tu celular, ve a:
# Configuración → Apps → Study AI → Permisos
# Habilita: Micrófono, Almacenamiento
```

**APK muy grande:**
- El APK será ~50-80 MB (normal para React Native)
- Incluye todo el runtime de JS

---

## 🎯 PASOS SIGUIENTES:

1. **Ejecuta:** `eas login`
2. **Ejecuta:** `eas build:configure`
3. **Ejecuta:** `eas build --platform android --profile preview`
4. **Espera:** 10-20 minutos
5. **Descarga:** El APK desde el link proporcionado
6. **Instala:** En tu Android (habilita "Fuentes desconocidas")

¡Tu Study AI estará listo para llevarlo a cualquier parte! 🚀📱