import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceSettings {
  enabled: boolean;
  language: string;
  rate: number;
  pitch: number;
  voice?: string;
}

class TextToSpeechService {
  private settings: VoiceSettings = {
    enabled: true,
    language: 'es-ES',
    rate: 0.8,
    pitch: 1.0
  };

  private isInitialized = false;
  private availableVoices: Speech.Voice[] = [];

  async initialize(): Promise<void> {
    try {
      // Load user preferences
      await this.loadSettings();
      
      // Get available voices
      this.availableVoices = await Speech.getAvailableVoicesAsync();
      
      this.isInitialized = true;
      console.log('🔊 Text-to-Speech Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Text-to-Speech:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const savedSettings = await AsyncStorage.getItem('@tts_settings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('Failed to load TTS settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('@tts_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save TTS settings:', error);
    }
  }

  // ==================== MAIN SPEAKING FUNCTIONS ====================

  async speakQuestion(question: string): Promise<void> {
    if (!this.settings.enabled || !question.trim()) return;

    const textToSpeak = `Pregunta: ${question}`;
    await this.speak(textToSpeak);
  }

  async speakAnswer(answer: string): Promise<void> {
    if (!this.settings.enabled || !answer.trim()) return;

    const textToSpeak = `Respuesta: ${answer}`;
    await this.speak(textToSpeak);
  }

  async speakInstruction(instruction: string): Promise<void> {
    if (!this.settings.enabled || !instruction.trim()) return;

    await this.speak(instruction, { rate: this.settings.rate * 1.1 }); // Slightly faster for instructions
  }

  async speakInterviewQuestion(question: string, category: string): Promise<void> {
    if (!this.settings.enabled) return;

    const textToSpeak = `Pregunta de ${category}: ${question}`;
    await this.speak(textToSpeak);
  }

  private async speak(text: string, options?: Partial<Speech.SpeechOptions>): Promise<void> {
    try {
      // Stop any current speech
      await this.stopSpeaking();

      const speakOptions: Speech.SpeechOptions = {
        language: this.settings.language,
        pitch: this.settings.pitch,
        rate: this.settings.rate,
        voice: this.settings.voice,
        ...options
      };

      await Speech.speak(text, speakOptions);
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  async pauseSpeaking(): Promise<void> {
    try {
      await Speech.pause();
    } catch (error) {
      console.error('Error pausing speech:', error);
    }
  }

  async resumeSpeaking(): Promise<void> {
    try {
      await Speech.resume();
    } catch (error) {
      console.error('Error resuming speech:', error);
    }
  }

  // ==================== SETTINGS MANAGEMENT ====================

  async updateSettings(newSettings: Partial<VoiceSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  async toggleEnabled(): Promise<boolean> {
    this.settings.enabled = !this.settings.enabled;
    await this.saveSettings();
    return this.settings.enabled;
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  getAvailableVoices(): Speech.Voice[] {
    return [...this.availableVoices];
  }

  // ==================== SPECIALIZED SPEAKING FUNCTIONS ====================

  async speakWelcome(): Promise<void> {
    const welcomeText = '¡Bienvenido a Study AI! Estoy listo para ayudarte con tu sesión de estudio.';
    await this.speakInstruction(welcomeText);
  }

  async speakCorrectAnswer(): Promise<void> {
    const phrases = [
      '¡Excelente! Respuesta correcta.',
      '¡Muy bien! Esa es la respuesta correcta.',
      '¡Correcto! Buen trabajo.',
      '¡Perfecto! Has acertado.',
    ];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    await this.speakInstruction(randomPhrase);
  }

  async speakIncorrectAnswer(): Promise<void> {
    const phrases = [
      'No es correcto, pero sigue intentando.',
      'Esa no es la respuesta correcta, veamos la explicación.',
      'Incorrecto, pero no te preocupes, sigamos aprendiendo.',
      'No es la respuesta que buscamos, revisemos juntos.',
    ];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    await this.speakInstruction(randomPhrase);
  }

  async speakInterviewStart(questionsCount: number): Promise<void> {
    const text = `Iniciando entrevista. Te haré ${questionsCount} preguntas. Responde de forma natural y tómate tu tiempo.`;
    await this.speakInstruction(text);
  }

  async speakInterviewEnd(): Promise<void> {
    const text = '¡Excelente trabajo! Has completado la entrevista. Revisemos tus respuestas.';
    await this.speakInstruction(text);
  }

  async speakProgress(current: number, total: number): Promise<void> {
    const text = `Pregunta ${current} de ${total}`;
    await this.speakInstruction(text);
  }

  // ==================== UTILITY FUNCTIONS ====================

  async testVoice(): Promise<void> {
    const testText = 'Esta es una prueba de voz para Study AI. ¿Puedes escucharme bien?';
    await this.speak(testText);
  }

  async isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
  }

  // Get supported languages for the platform
  getSupportedLanguages(): string[] {
    const languages = ['es-ES', 'es-MX', 'en-US', 'en-GB'];
    
    if (Platform.OS === 'ios') {
      return [...languages, 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'];
    }
    
    return languages;
  }

  // Get quality score for voice output
  getVoiceQuality(): 'high' | 'medium' | 'low' {
    if (this.availableVoices.length > 10) return 'high';
    if (this.availableVoices.length > 3) return 'medium';
    return 'low';
  }
}

// Singleton instance
export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;