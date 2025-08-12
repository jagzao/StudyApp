import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useAppStore } from '../stores/appStore';
import whisperService from '../../services/whisperService';
import responseEvaluationService from '../../services/responseEvaluationService';
import { useFlashcards } from './useFlashcards';
import { usePlayer } from './usePlayer';

export const useVoice = () => {
  const {
    isListening,
    isRecording,
    isProcessing,
    apiKey,
    setIsListening,
    setIsRecording,
    setIsProcessing,
  } = useAppStore();

  const { currentCard, answerMode, setAnswer, nextCard, previousCard } = useFlashcards();
  const { markCorrect, markIncorrect } = usePlayer();

  // Configure services when API key changes
  useEffect(() => {
    if (apiKey) {
      whisperService.setApiKey(apiKey);
      responseEvaluationService.setApiKey(apiKey);
    }
  }, [apiKey]);

  const requestAudioPermissions = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permisos', 'Se necesitan permisos de audio para el reconocimiento de voz');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      const hasPermissions = await requestAudioPermissions();
      if (!hasPermissions) return;

      setIsListening(true);
      setIsRecording(true);
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      // Store recording reference (you might want to add this to the store)
      // For now, we'll simulate the recording duration
      setTimeout(() => {
        stopListening(recording);
      }, 5000); // 5 seconds max recording
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsListening(false);
      setIsRecording(false);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  }, [setIsListening, setIsRecording, requestAudioPermissions]);

  const stopListening = useCallback(async (recording?: Audio.Recording) => {
    try {
      if (recording) {
        setIsProcessing(true);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        if (uri && apiKey) {
          console.log('Procesando audio con Whisper...', uri);
          const transcription = await whisperService.transcribeAudio(uri);
          await processVoiceCommand(transcription);
        } else {
          // Simulate command for demo purposes
          const simulatedCommand = getSimulatedCommand();
          await processVoiceCommand(simulatedCommand);
        }
      }
      
      setIsRecording(false);
      setIsListening(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsListening(false);
      setIsRecording(false);
      setIsProcessing(false);
      Alert.alert('Error', 'Error procesando el audio');
    }
  }, [apiKey, setIsListening, setIsRecording, setIsProcessing]);

  const getSimulatedCommand = useCallback(() => {
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
  }, []);

  const processVoiceCommand = useCallback(async (command: string) => {
    const lowerCommand = command.toLowerCase();
    
    // Navigation commands first
    if (lowerCommand.includes('siguiente') || lowerCommand.includes('next')) {
      nextCard();
      return;
    } else if (lowerCommand.includes('anterior') || lowerCommand.includes('previous')) {
      previousCard();
      return;
    } else if (lowerCommand.includes('leer') || lowerCommand.includes('read')) {
      if (currentCard) {
        speakText(currentCard.question);
      }
      return;
    } else if (lowerCommand.includes('repetir') || lowerCommand.includes('repeat')) {
      // Repeat current text based on context
      return;
    } else if (lowerCommand.includes('respuesta') || lowerCommand.includes('answer')) {
      if (currentCard) {
        speakText(currentCard.answer);
      }
      return;
    }

    // Manual evaluation
    if (lowerCommand.includes('correcto') || lowerCommand.includes('correct')) {
      markCorrect();
      return;
    } else if (lowerCommand.includes('incorrecto') || lowerCommand.includes('wrong')) {
      markIncorrect();
      return;
    }
    
    // Long response - evaluate automatically
    if (lowerCommand.length > 20 && currentCard && apiKey) {
      setAnswer(command, true);
      
      try {
        setIsProcessing(true);
        const evaluation = await responseEvaluationService.evaluateResponse(
          currentCard.question,
          currentCard.answer,
          command
        );
        
        // Show evaluation result
        const resultMessage = `${evaluation.isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}\n\nPuntuación: ${evaluation.score}/100\n\n${evaluation.feedback}${evaluation.improvements ? `\n\nMejoras: ${evaluation.improvements}` : ''}`;
        
        Alert.alert('Evaluación IA', resultMessage, [
          {
            text: 'Ver Respuesta Modelo',
            onPress: () => {
              if (currentCard) {
                speakText(currentCard.answer);
              }
            }
          },
          {
            text: evaluation.isCorrect ? 'Marcar Correcta' : 'Marcar Incorrecta',
            onPress: () => evaluation.isCorrect ? markCorrect() : markIncorrect(),
            style: evaluation.isCorrect ? 'default' : 'destructive'
          },
          {
            text: 'Siguiente',
            onPress: nextCard
          }
        ]);
        
      } catch (error) {
        console.error('Error evaluating response:', error);
        Alert.alert(
          'Respuesta registrada', 
          'Tu respuesta ha sido guardada. Di "mostrar respuesta" para ver la respuesta modelo o evalúa manualmente con "correcto" o "incorrecto".'
        );
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // Command not recognized
    Alert.alert(
      'Comando no reconocido', 
      `"${command}"\n\nComandos disponibles: siguiente, anterior, respuesta, correcto, incorrecto, leer, repetir`
    );
  }, [
    currentCard, 
    apiKey, 
    nextCard, 
    previousCard, 
    setAnswer, 
    markCorrect, 
    markIncorrect, 
    setIsProcessing
  ]);

  const speakText = useCallback((text: string) => {
    if (text) {
      Speech.speak(text, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
  }, []);

  return {
    // State
    isListening,
    isRecording,
    isProcessing,
    hasApiKey: !!apiKey,
    
    // Actions
    startListening,
    stopListening,
    processVoiceCommand,
    speakText,
    stopSpeaking,
    requestAudioPermissions,
    
    // Utils
    getSimulatedCommand,
  };
};