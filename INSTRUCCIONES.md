# 🎯 StudyApp con OpenAI Whisper

## 🚀 Cómo usar la aplicación

### Iniciar la app:
```bash
npx expo start --port 3000
```

### Si el QR no carga:
1. Abre la app Expo Go en tu teléfono
2. Ve a la pestaña "Projects"
3. Escanea el QR desde ahí
4. O usa la URL: `exp://192.168.x.x:3000` (reemplaza con tu IP local)

### Alternativa - Usar en navegador web:
1. Presiona `w` en la consola de Expo
2. Se abrirá en tu navegador web

## 🎙️ Funcionalidades de voz

### Comandos que puedes decir:
- **"siguiente"** - Ir a la siguiente tarjeta
- **"anterior"** - Ir a la tarjeta anterior
- **"mostrar respuesta"** - Mostrar y leer la respuesta
- **"correcto"** - Marcar como correcto y continuar
- **"incorrecto"** - Marcar como incorrecto y continuar
- **"leer pregunta"** - Volver a leer la pregunta
- **"repetir"** - Repetir el último texto leído

### Cómo usar el reconocimiento de voz:
1. Presiona el botón "🎙️ COMANDO DE VOZ"
2. Habla claramente en español
3. Espera a que aparezca "🧠 PROCESANDO..."
4. El comando se ejecutará automáticamente

## ⚙️ Configuración

### Tu API Key ya está configurada:
- ✅ OpenAI Whisper habilitado
- ✅ Reconocimiento de voz real
- ✅ Costo: $0.006 por minuto

### Para cambiar la API Key:
1. Presiona "⚙️ CONFIG WHISPER"
2. Ingresa una nueva API key
3. Presiona "GUARDAR"

## 🎨 Interfaz

### Colores futuristas:
- 🔴 Rojo (#DC143C) - Botones principales
- 🟡 Dorado (#FFD700) - Acentos y títulos
- ⚫ Negro (#000000) - Fondo
- 🔘 Grises - Elementos secundarios

### Estadísticas en tiempo real:
- **CORRECTAS** - Respuestas acertadas
- **RACHA** - Consecutivas correctas
- **TOTAL** - Número de tarjetas

## 📱 Controles

### Botones táctiles:
- **⬅️ ANTERIOR** - Tarjeta anterior
- **RESPUESTA** - Mostrar/ocultar respuesta
- **SIGUIENTE ➡️** - Siguiente tarjeta
- **✓ CORRECTO** - Marcar como correcto
- **✗ INCORRECTO** - Marcar como incorrecto
- **+ NUEVA TARJETA** - Agregar tarjeta
- **⚙️ CONFIG WHISPER** - Configurar API

## 🔧 Solución de problemas

### Si el reconocimiento de voz no funciona:
1. Verifica que tienes créditos en OpenAI
2. Revisa la conexión a internet
3. La app automáticamente usará comandos simulados como respaldo

### Si la app no carga:
1. Cierra Expo: Ctrl+C en la terminal
2. Limpia caché: `npx expo start --clear --port 3000`
3. Reinstala dependencias: `npm install --legacy-peer-deps`

### Para usar en Android/iOS:
1. Instala "Expo Go" desde Play Store/App Store
2. Escanea el QR código
3. Los permisos de micrófono se solicitarán automáticamente

## 💰 Costos de OpenAI

- **Whisper**: $0.006 por minuto de audio
- **Ejemplo**: 100 minutos de uso = $0.60 USD
- **Recomendado**: Agregar $5-10 USD a tu cuenta

## 🎯 Uso recomendado

1. **Estudiar sin manos**: Usa solo comandos de voz
2. **Repasar rápido**: Di "siguiente" para avanzar rápidamente
3. **Enfocarte en difíciles**: Di "incorrecto" para revisarlas más tarde
4. **Crear contenido**: Agrega nuevas tarjetas regularmente

¡Disfruta estudiando con IA! 🤖✨