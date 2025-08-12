import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

// API KEY de OpenAI configurada
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

class WhisperService {
  constructor() {
    this.apiKey = OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/audio/transcriptions';
  }

  async transcribeAudio(audioUri) {
    try {
      if (!this.apiKey || this.apiKey === 'TU_API_KEY_AQUI') {
        throw new Error('API Key de OpenAI no configurada');
      }

      // Leer el archivo de audio
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      if (!audioInfo.exists) {
        throw new Error('Archivo de audio no encontrado');
      }

      // Crear FormData para la petición
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'es'); // Español
      formData.append('response_format', 'json');

      console.log('Enviando audio a Whisper API...');

      // Hacer la petición a OpenAI Whisper
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error de OpenAI:', errorData);
        throw new Error(`Error de OpenAI: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Transcripción recibida:', result.text);
      
      return result.text.toLowerCase().trim();

    } catch (error) {
      console.error('Error en transcripción:', error);
      
      // Mostrar error al usuario
      Alert.alert(
        'Error de reconocimiento de voz',
        error.message.includes('API Key') 
          ? 'Configure su API Key de OpenAI en services/whisperService.js'
          : `Error: ${error.message}`,
        [{ text: 'OK' }]
      );
      
      // Fallback a comandos simulados en caso de error
      return this.getRandomFallbackCommand();
    }
  }

  // Comandos de fallback si Whisper falla
  getRandomFallbackCommand() {
    const commands = [
      'siguiente',
      'anterior', 
      'mostrar respuesta',
      'correcto',
      'incorrecto',
      'leer pregunta',
      'repetir'
    ];
    return commands[Math.floor(Math.random() * commands.length)];
  }

  // Verificar si la API key está configurada
  isConfigured() {
    return this.apiKey && this.apiKey !== 'TU_API_KEY_AQUI';
  }

  // Configurar la API key programáticamente
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }
}

export default new WhisperService();