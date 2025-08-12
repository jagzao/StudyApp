import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  TextInput,
  ScrollView,
  Modal,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import whisperService from './services/whisperService';
import interviewService from './services/interviewService';
import gamificationService from './services/gamificationService';
import responseEvaluationService from './services/responseEvaluationService';
import GameHUD from './components/GameHUD';
import GameMenu from './components/GameMenu';
import SkillTreeMap from './components/SkillTreeMap';
import PitchTeleprompter from './components/PitchTeleprompter';

const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#0A0A0A',    // Negro profundo
  secondary: '#1A1A1A',     // Gris oscuro  
  neonRed: '#FF1E1E',       // Rojo neón
  white: '#FFFFFF',         // Blanco puro
  gray: '#666666',          // Gris medio
  success: '#00FF88',       // Verde neón
  warning: '#FFB800',       // Amarillo neón
  
  // Compatibilidad con código existente
  primary: '#FF1E1E',
  dark: '#0A0A0A',
  darkGray: '#1A1A1A',
  lightGray: '#666666',
  accent: '#FF1E1E',
};

const STORAGE_KEY = '@study_cards';

export default function App() {
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    streak: 0
  });
  const [fadeAnim] = useState(new Animated.Value(1));
  const [waveAnim1] = useState(new Animated.Value(1));
  const [waveAnim2] = useState(new Animated.Value(1));
  const [waveAnim3] = useState(new Animated.Value(1));
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobDescModalVisible, setJobDescModalVisible] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [answerMode, setAnswerMode] = useState('flashcard'); // 'flashcard' or 'interview'
  const [userAnswer, setUserAnswer] = useState('');
  const [showUserAnswer, setShowUserAnswer] = useState(false);
  
  // Estados de gamificación
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home', 'camino', 'achievements', etc.
  const [playerData, setPlayerData] = useState(null);
  const [levelProgress, setLevelProgress] = useState({});
  const [achievements, setAchievements] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [showXPGain, setShowXPGain] = useState(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadFlashcards();
    loadStats();
    loadApiKey();
    requestAudioPermissions();
    loadGameData();
  }, []);

  useEffect(() => {
    if (isListening) {
      // Start wave animations when listening
      const wave1 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      );
      
      const wave2 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim2, {
            toValue: 1.4,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim2, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          })
        ])
      );
      
      const wave3 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim3, {
            toValue: 1.6,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim3, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      );
      
      wave1.start();
      wave2.start();
      wave3.start();
      
      return () => {
        wave1.stop();
        wave2.stop();
        wave3.stop();
      };
    }
  }, [isListening]);

  const loadGameData = async () => {
    try {
      const [player, progress, gameAchievements] = await Promise.all([
        gamificationService.getPlayerData(),
        gamificationService.getLevelProgress(),
        gamificationService.getAchievements()
      ]);
      
      setPlayerData(player);
      setLevelProgress(progress);
      setAchievements(gameAchievements);
      
      if (player) {
        setStreak(player.streak || 0);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
    }
  };

  const loadApiKey = async () => {
    try {
      const stored = await AsyncStorage.getItem('@openai_api_key');
      if (stored) {
        setApiKey(stored);
        whisperService.setApiKey(stored);
        responseEvaluationService.setApiKey(stored);
      } else {
        // No hay API key guardada, solicitar al usuario
        setApiKeyModalVisible(true);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
      setApiKeyModalVisible(true);
    }
  };

  const saveApiKey = async (key) => {
    try {
      await AsyncStorage.setItem('@openai_api_key', key);
      setApiKey(key);
      whisperService.setApiKey(key);
      responseEvaluationService.setApiKey(key);
      setApiKeyModalVisible(false);
      Alert.alert('¡Éxito!', 'API Key configurada correctamente');
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('Error', 'No se pudo guardar la API key');
    }
  };

  const requestAudioPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permisos', 'Se necesitan permisos de audio para el reconocimiento de voz');
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
    }
  };

  const loadFlashcards = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const cards = JSON.parse(stored);
        setFlashcards(cards);
      } else {
        // Datos de ejemplo
        const defaultCards = [
          { id: 1, question: "¿Qué es React Native?", answer: "Un framework para crear aplicaciones móviles usando React" },
          { id: 2, question: "¿Qué es JavaScript?", answer: "Un lenguaje de programación interpretado" },
          { id: 3, question: "¿Qué es una función?", answer: "Un bloque de código reutilizable que realiza una tarea específica" }
        ];
        setFlashcards(defaultCards);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCards));
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
    }
  };

  const loadStats = async () => {
    try {
      const stored = await AsyncStorage.getItem('@study_stats');
      if (stored) {
        setStats(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveStats = async (newStats) => {
    try {
      await AsyncStorage.setItem('@study_stats', JSON.stringify(newStats));
      setStats(newStats);
    } catch (error) {
      console.error('Error saving stats:', error);
    }
  };

  const saveFlashcards = async (cards) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (error) {
      console.error('Error saving flashcards:', error);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setIsListening(true);
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      
      // Simular reconocimiento de voz después de 3 segundos
      setTimeout(() => {
        stopRecording();
      }, 3000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        setIsProcessing(true);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        console.log('Procesando audio con Whisper...', uri);
        
        // Usar OpenAI Whisper para transcribir el audio
        const transcription = await whisperService.transcribeAudio(uri);
        processVoiceCommand(transcription);
      }
      setRecording(null);
      setIsRecording(false);
      setIsListening(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setIsListening(false);
      setIsProcessing(false);
    }
  };

  const getSimulatedCommand = () => {
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
  };

  const processVoiceCommand = async (command) => {
    const lowerCommand = command.toLowerCase();
    
    // Comandos de navegación básicos primero
    if (lowerCommand.includes('siguiente') || lowerCommand.includes('next')) {
      nextCard();
      return;
    } else if (lowerCommand.includes('anterior') || lowerCommand.includes('previous')) {
      previousCard();
      return;
    } else if (lowerCommand.includes('leer') || lowerCommand.includes('read')) {
      speakText(flashcards[currentIndex]?.question);
      return;
    } else if (lowerCommand.includes('repetir') || lowerCommand.includes('repeat')) {
      const textToSpeak = showAnswer ? 
        flashcards[currentIndex]?.answer : 
        flashcards[currentIndex]?.question;
      speakText(textToSpeak);
      return;
    } else if (lowerCommand.includes('respuesta') || lowerCommand.includes('answer')) {
      setShowAnswer(true);
      speakText(flashcards[currentIndex]?.answer);
      return;
    } else if (lowerCommand.includes('mi respuesta') || lowerCommand.includes('my answer')) {
      if (userAnswer) {
        speakText(`Tu respuesta fue: ${userAnswer}`);
      } else {
        speakText('No has registrado una respuesta aún');
      }
      return;
    }

    // Evaluación manual directa
    if (lowerCommand.includes('correcto') || lowerCommand.includes('correct')) {
      markCorrect();
      return;
    } else if (lowerCommand.includes('incorrecto') || lowerCommand.includes('wrong')) {
      markIncorrect();
      return;
    }
    
    // Respuesta larga - evaluar automáticamente
    if (lowerCommand.length > 20 && flashcards[currentIndex]) {
      setUserAnswer(command);
      setShowUserAnswer(true);
      
      try {
        setIsProcessing(true);
        const evaluation = await responseEvaluationService.evaluateResponse(
          flashcards[currentIndex].question,
          flashcards[currentIndex].answer,
          command
        );
        
        // Mostrar resultado de evaluación
        const resultMessage = `${evaluation.isCorrect ? '✅ CORRECTO' : '❌ INCORRECTO'}\n\nPuntuación: ${evaluation.score}/100\n\n${evaluation.feedback}${evaluation.improvements ? `\n\nMejoras: ${evaluation.improvements}` : ''}`;
        
        Alert.alert('Evaluación IA', resultMessage, [
          {
            text: 'Ver Respuesta Modelo',
            onPress: () => {
              setShowAnswer(true);
              speakText(flashcards[currentIndex]?.answer);
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
        console.error('Error evaluando respuesta:', error);
        Alert.alert('Respuesta registrada', 'Tu respuesta ha sido guardada. Di "mostrar respuesta" para ver la respuesta modelo o evalúa manualmente con "correcto" o "incorrecto".');
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    // Comando no reconocido
    Alert.alert('Comando no reconocido', `"${command}"\n\nComandos disponibles: siguiente, anterior, respuesta, correcto, incorrecto, leer, repetir`);
  };

  const speakText = (text) => {
    if (text) {
      Speech.speak(text, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.9
      });
    }
  };

  const nextCard = () => {
    if (flashcards.length > 0) {
      animateTransition(() => {
        setCurrentIndex((prev) => (prev + 1) % flashcards.length);
        setShowAnswer(false);
        setUserAnswer('');
        setShowUserAnswer(false);
      });
    }
  };

  const previousCard = () => {
    if (flashcards.length > 0) {
      animateTransition(() => {
        setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
        setShowAnswer(false);
        setUserAnswer('');
        setShowUserAnswer(false);
      });
    }
  };

  const animateTransition = (callback) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const markCorrect = async () => {
    const newStreak = streak + 1;
    const newStats = {
      ...stats,
      total: stats.total + 1,
      correct: stats.correct + 1,
      streak: newStreak
    };
    
    saveStats(newStats);
    setStreak(newStreak);
    
    // Gamificación: Award XP
    const xpGained = 50 + (newStreak * 5); // Bonus por streak
    const result = await gamificationService.awardXP(xpGained, 'Correct Answer');
    
    if (result) {
      setShowXPGain(xpGained);
      setPlayerData(await gamificationService.getPlayerData());
      
      // Update stats in gamification system
      await gamificationService.updateStats({
        questionsAnswered: newStats.total,
        correctAnswers: newStats.correct,
        streak: newStreak,
        maxStreak: Math.max(playerData?.maxStreak || 0, newStreak)
      });
      
      // Check achievements
      const newAchievements = await gamificationService.checkAchievements({
        questionsAnswered: newStats.total,
        correctAnswers: newStats.correct,
        streak: newStreak,
        voiceCommandsUsed: playerData?.voiceCommandsUsed || 0
      });
      
      if (newAchievements.length > 0) {
        // Show achievement notification
        Alert.alert('🏆 Achievement Unlocked!', 
          newAchievements.map(id => id.replace('-', ' ').toUpperCase()).join('\n')
        );
      }
    }
    
    nextCard();
  };

  const markIncorrect = async () => {
    const newStats = {
      ...stats,
      total: stats.total + 1,
      incorrect: stats.incorrect + 1,
      streak: 0
    };
    
    saveStats(newStats);
    setStreak(0);
    
    // Update gamification stats
    await gamificationService.updateStats({
      questionsAnswered: newStats.total,
      correctAnswers: newStats.correct,
      streak: 0
    });
    
    setPlayerData(await gamificationService.getPlayerData());
    nextCard();
  };

  const addNewCard = async () => {
    if (newQuestion.trim() && newAnswer.trim()) {
      const newCard = {
        id: Date.now(),
        question: newQuestion.trim(),
        answer: newAnswer.trim()
      };
      const updatedCards = [...flashcards, newCard];
      setFlashcards(updatedCards);
      await saveFlashcards(updatedCards);
      setNewQuestion('');
      setNewAnswer('');
      setModalVisible(false);
      Alert.alert('¡Éxito!', 'Nueva tarjeta agregada');
    } else {
      Alert.alert('Error', 'Por favor completa ambos campos');
    }
  };

  const generateQuestionsFromJob = async () => {
    if (!jobDescription.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción del trabajo');
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const generatedQuestions = await interviewService.generateQuestionsFromJobDescription(jobDescription);
      
      if (generatedQuestions.length > 0) {
        setFlashcards(generatedQuestions);
        await saveFlashcards(generatedQuestions);
        setCurrentIndex(0);
        setShowAnswer(false);
        setAnswerMode('interview');
        setJobDescModalVisible(false);
        Alert.alert('¡Éxito!', `${generatedQuestions.length} preguntas generadas para tu entrevista`);
      } else {
        Alert.alert('Error', 'No se pudieron generar preguntas. Intenta con una descripción más detallada.');
      }
    } catch (error) {
      console.error('Error generando preguntas:', error);
      Alert.alert('Error', 'Error generando preguntas. Usando preguntas predefinidas.');
      const fallbackQuestions = interviewService.getFallbackQuestions();
      setFlashcards(fallbackQuestions);
      await saveFlashcards(fallbackQuestions);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const loadSeniorQuestions = async () => {
    const seniorQuestions = interviewService.getFallbackQuestions();
    setFlashcards(seniorQuestions);
    await saveFlashcards(seniorQuestions);
    setCurrentIndex(0);
    setShowAnswer(false);
    setAnswerMode('interview');
    Alert.alert('¡Listo!', 'Preguntas para desarrollador senior cargadas');
  };

  const handleNavigation = (screen) => {
    setCurrentScreen(screen);
  };

  const handleLevelSelect = async (treeId, level) => {
    // Cargar preguntas específicas del nivel
    const levelQuestions = interviewService.getQuestionsByTechnology(level.name);
    setFlashcards(levelQuestions);
    setCurrentIndex(0);
    setShowAnswer(false);
    setAnswerMode('interview');
    setCurrentScreen('home');
    Alert.alert('Nivel Cargado', `Iniciando: ${level.name}`);
  };

  const handleMenuToggle = () => {
    setMenuVisible(!menuVisible);
  };

  const handleXPAnimationComplete = () => {
    setShowXPGain(null);
  };

  const currentCard = flashcards[currentIndex];

  const renderScreen = () => {
    switch (currentScreen) {
      case 'camino':
        return (
          <SkillTreeMap 
            onLevelSelect={handleLevelSelect}
            playerData={playerData}
          />
        );
      case 'pitch':
        return (
          <PitchTeleprompter 
            onClose={() => setCurrentScreen('home')}
          />
        );
      case 'home':
      default:
        return renderHomeScreen();
    }
  };

  const renderHomeScreen = () => (
    <>
      {/* Card Display */}
      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
        {currentCard && (
          <View style={styles.card}>
            <Text style={styles.cardNumber}>
              {currentIndex + 1} / {flashcards.length}
            </Text>
            
            <ScrollView 
              style={styles.cardScrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cardScrollContainer}
            >
              <Text style={styles.questionText}>
                {currentCard.question}
              </Text>
              
              {answerMode === 'interview' && currentCard.category && (
                <View style={styles.categoryContainer}>
                  <Text style={styles.categoryText}>
                    📂 {currentCard.category} | 🎯 {currentCard.difficulty}
                  </Text>
                </View>
              )}
              
              {showUserAnswer && userAnswer && (
                <View style={styles.userAnswerContainer}>
                  <Text style={styles.userAnswerLabel}>TU RESPUESTA:</Text>
                  <Text style={styles.userAnswerText}>
                    {userAnswer}
                  </Text>
                </View>
              )}
              
              {showAnswer && (
                <View style={styles.answerContainer}>
                  <Text style={styles.answerLabel}>
                    {answerMode === 'interview' ? 'RESPUESTA MODELO:' : 'RESPUESTA:'}
                  </Text>
                  <Text style={styles.answerText}>
                    {currentCard.answer}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Floating Voice Control Button */}
      <View style={styles.floatingVoiceContainer}>
        <TouchableOpacity
          style={[
            styles.floatingVoiceButton,
            isListening && styles.floatingVoiceButtonActive,
            isProcessing && styles.floatingVoiceButtonProcessing
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {isListening && (
            <>
              <Animated.View style={[
                styles.voiceWave, 
                styles.voiceWave1,
                { transform: [{ scale: waveAnim1 }] }
              ]} />
              <Animated.View style={[
                styles.voiceWave, 
                styles.voiceWave2,
                { transform: [{ scale: waveAnim2 }] }
              ]} />
              <Animated.View style={[
                styles.voiceWave, 
                styles.voiceWave3,
                { transform: [{ scale: waveAnim3 }] }
              ]} />
            </>
          )}
          <Text style={styles.floatingVoiceIcon}>
            {isProcessing ? '🧠' : isListening ? '🎤' : '🎙️'}
          </Text>
        </TouchableOpacity>
        
        {!isListening && !isProcessing && (
          <View style={styles.voiceHintContainer}>
            <Text style={styles.voiceHint}>
              {answerMode === 'interview' ? 
                'Responde (evaluación IA)' :
                'Responde o comando'
              }
            </Text>
          </View>
        )}
      </View>

      {/* Enhanced Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.futuristicControlButton} 
          onPress={previousCard}
          activeOpacity={0.8}
        >
          <View style={styles.buttonGlow} />
          <Text style={styles.futuristicControlText}>⬅️ ANTERIOR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.futuristicAnswerButton, showAnswer && styles.futuristicAnswerButtonActive]} 
          onPress={() => {
            setShowAnswer(!showAnswer);
            if (!showAnswer) speakText(currentCard?.answer);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.answerButtonGlow} />
          <Text style={styles.futuristicAnswerText}>
            {showAnswer ? '👁️ OCULTAR' : '💡 RESPUESTA'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.futuristicControlButton} 
          onPress={nextCard}
          activeOpacity={0.8}
        >
          <View style={styles.buttonGlow} />
          <Text style={styles.futuristicControlText}>SIGUIENTE ➡️</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced Answer Evaluation Buttons */}
      {showAnswer && (
        <View style={styles.evaluationButtonsContainer}>
          <TouchableOpacity 
            style={styles.futuristicCorrectButton} 
            onPress={markCorrect}
            activeOpacity={0.8}
          >
            <View style={styles.correctButtonGlow} />
            <Text style={styles.futuristicCorrectText}>✓ CORRECTO</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.futuristicIncorrectButton} 
            onPress={markIncorrect}
            activeOpacity={0.8}
          >
            <View style={styles.incorrectButtonGlow} />
            <Text style={styles.futuristicIncorrectText}>✗ INCORRECTO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ NUEVA TARJETA</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Game HUD */}
      <GameHUD 
        playerData={playerData}
        onMenuPress={handleMenuToggle}
        streak={streak}
        showXPGain={showXPGain}
        onXPAnimationComplete={handleXPAnimationComplete}
      />
      
      {/* Screen Content */}
      {renderScreen()}
      
      {/* Game Menu */}
      <GameMenu 
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleNavigation}
        playerData={playerData}
        achievements={achievements}
        onJobInterview={() => setJobDescModalVisible(true)}
        onSeniorPrep={loadSeniorQuestions}
        onConfigWhisper={() => setApiKeyModalVisible(true)}
      />

      {/* Add Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>NUEVA TARJETA</Text>
            
            <Text style={styles.inputLabel}>PREGUNTA:</Text>
            <TextInput
              style={styles.textInput}
              value={newQuestion}
              onChangeText={setNewQuestion}
              placeholder="Escribe la pregunta..."
              placeholderTextColor={COLORS.lightGray}
              multiline
            />
            
            <Text style={styles.inputLabel}>RESPUESTA:</Text>
            <TextInput
              style={styles.textInput}
              value={newAnswer}
              onChangeText={setNewAnswer}
              placeholder="Escribe la respuesta..."
              placeholderTextColor={COLORS.lightGray}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={addNewCard}
              >
                <Text style={styles.modalButtonText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* API Key Configuration Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={apiKeyModalVisible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>CONFIGURAR WHISPER</Text>
            <Text style={styles.apiKeyDescription}>
              {apiKey ? '🔑 API Key configurada ✅ Puedes cambiarla aquí:' : '🔑 REQUERIDO: Para usar reconocimiento de voz, evaluación IA y el teleprompter inteligente, necesitas una API key de OpenAI.'}
            </Text>
            {!apiKey && (
              <Text style={styles.apiKeySteps}>
                1. Ve a https://platform.openai.com/api-keys{'\n'}
                2. Crea una cuenta (requiere verificación de teléfono){'\n'}
                3. Genera una nueva API key{'\n'}
                4. Pégala aquí abajo:{'\n'}
                {'\n'}💡 La app funciona SIN API key pero con funcionalidad limitada.
              </Text>
            )}
            
            <Text style={styles.inputLabel}>API KEY de OpenAI:</Text>
            <TextInput
              style={styles.textInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-..."
              placeholderTextColor={COLORS.lightGray}
              secureTextEntry={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={() => saveApiKey(apiKey)}
                disabled={!apiKey.trim()}
              >
                <Text style={styles.modalButtonText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => setApiKeyModalVisible(false)}
            >
              <Text style={styles.skipButtonText}>USAR SIN WHISPER (simulado)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Job Description Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={jobDescModalVisible}
        onRequestClose={() => setJobDescModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PREPARACIÓN ENTREVISTA</Text>
            <Text style={styles.apiKeyDescription}>
              Pega aquí la descripción del trabajo para generar preguntas específicas de entrevista.
            </Text>
            
            <Text style={styles.inputLabel}>JOB DESCRIPTION:</Text>
            <TextInput
              style={styles.jobDescInput}
              value={jobDescription}
              onChangeText={setJobDescription}
              placeholder="Pega la descripción completa del trabajo aquí..."
              placeholderTextColor={COLORS.lightGray}
              multiline
              numberOfLines={8}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setJobDescModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, isGeneratingQuestions && styles.disabledButton]}
                onPress={generateQuestionsFromJob}
                disabled={isGeneratingQuestions}
              >
                <Text style={styles.modalButtonText}>
                  {isGeneratingQuestions ? '🧠 GENERANDO...' : '🎯 GENERAR'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helpText}>
              💡 Tip: Incluye tecnologías específicas, responsabilidades y nivel de seniority para mejores preguntas.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 5,
    letterSpacing: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 2,
    letterSpacing: 1,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: 25,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
    overflow: 'hidden',
    maxHeight: height * 0.6,
  },
  cardNumber: {
    fontSize: 14,
    color: COLORS.warning,
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 20,
  },
  answerContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  answerLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  answerText: {
    fontSize: 18,
    color: COLORS.white,
    lineHeight: 24,
  },
  voiceContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  voiceButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.primary,
  },
  voiceButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voiceHint: {
    fontSize: 12,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  controlButton: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  controlButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  answerButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  answerButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  answerButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 15,
  },
  correctButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  incorrectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  answerActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  addButton: {
    flex: 2,
    backgroundColor: COLORS.secondary,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  configButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  configButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: COLORS.darkGray,
    width: width * 0.9,
    borderRadius: 15,
    padding: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: COLORS.lightGray,
    color: COLORS.white,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25,
  },
  modalCancelButton: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  voiceButtonProcessing: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.secondary,
  },
  apiKeyDescription: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  apiKeySteps: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginBottom: 20,
    lineHeight: 18,
  },
  skipButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  skipButtonText: {
    color: COLORS.lightGray,
    fontSize: 12,
    textAlign: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  userAnswerContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  userAnswerLabel: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  userAnswerText: {
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  interviewButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    marginRight: 5,
  },
  interviewButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  seniorButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginLeft: 5,
  },
  seniorButtonText: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  jobDescInput: {
    backgroundColor: COLORS.lightGray,
    color: COLORS.white,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    fontSize: 14,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  disabledButton: {
    opacity: 0.6,
  },
  helpText: {
    fontSize: 11,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 16,
  },
  // Nuevos estilos para scroll y diseño futurista
  cardScrollContent: {
    maxHeight: height * 0.45,
  },
  cardScrollContainer: {
    paddingBottom: 10,
  },
  categoryContainer: {
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  // Floating Voice Button
  floatingVoiceContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingVoiceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.neonRed,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 20,
    position: 'relative',
  },
  floatingVoiceButtonActive: {
    backgroundColor: COLORS.success,
    shadowColor: COLORS.success,
    transform: [{ scale: 1.1 }],
  },
  floatingVoiceButtonProcessing: {
    backgroundColor: COLORS.warning,
    shadowColor: COLORS.warning,
  },
  floatingVoiceIcon: {
    fontSize: 28,
    zIndex: 2,
  },
  voiceWave: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.white,
    opacity: 0.6,
  },
  voiceWave1: {
    width: 80,
    height: 80,
    animationDuration: '1s',
  },
  voiceWave2: {
    width: 100,
    height: 100,
    animationDuration: '1.5s',
  },
  voiceWave3: {
    width: 120,
    height: 120,
    animationDuration: '2s',
  },
  voiceHintContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  // Futuristic Button Styles
  futuristicControlButton: {
    backgroundColor: COLORS.darkGray,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  futuristicControlText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 2,
  },
  buttonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: COLORS.neonRed,
    opacity: 0.2,
    borderRadius: 14,
  },
  futuristicAnswerButton: {
    backgroundColor: COLORS.neonRed,
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.neonRed,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 12,
  },
  futuristicAnswerButtonActive: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.background,
    shadowColor: COLORS.warning,
  },
  futuristicAnswerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 2,
  },
  answerButtonGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: COLORS.white,
    opacity: 0.3,
    borderRadius: 15,
  },
  evaluationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    marginBottom: 15,
    marginTop: 10,
  },
  futuristicCorrectButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.white,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
    flex: 1,
    marginRight: 10,
  },
  futuristicCorrectText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    zIndex: 2,
  },
  correctButtonGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: COLORS.white,
    opacity: 0.3,
    borderRadius: 18,
  },
  futuristicIncorrectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.white,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
    flex: 1,
    marginLeft: 10,
  },
  futuristicIncorrectText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    zIndex: 2,
  },
  incorrectButtonGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: COLORS.white,
    opacity: 0.3,
    borderRadius: 18,
  },
});