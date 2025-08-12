import React, { useState, memo, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Flashcard } from '../types';
import { COLORS } from '../constants/colors';
import { useFlashcards } from '../hooks/useFlashcards';
import { useOptimizedRendering, useOptimizedAnimation } from '../hooks/useOptimizedRendering';
import { textToSpeechService } from '../services/textToSpeechService';
import { runAfterInteractions } from '../utils/performanceOptimization';

const { width, height } = Dimensions.get('window');

interface FlashcardScreenProps {
  currentCard: Flashcard | null;
  currentIndex: number;
  totalCards: number;
  showAnswer: boolean;
  userAnswer: string;
  showUserAnswer: boolean;
  answerMode: 'flashcard' | 'interview';
  isListening: boolean;
  isProcessing: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

// Memoized header component for better performance
const FlashcardHeader = memo(({ currentIndex, totalCards }: { currentIndex: number; totalCards: number }) => (
  <View style={styles.header}>
    <Text style={styles.progressText}>
      {currentIndex + 1} / {totalCards}
    </Text>
  </View>
));

// Memoized card content component
const CardContent = memo(({ 
  card, 
  showAnswer, 
  performanceProfile 
}: { 
  card: Flashcard; 
  showAnswer: boolean;
  performanceProfile: string;
}) => {
  const animationConfig = useOptimizedAnimation();
  const [fadeAnim] = useState(new Animated.Value(1));
  
  const handleCardFlip = useCallback(() => {
    if (performanceProfile === 'low') {
      // Skip animation for low-performance devices
      return;
    }
    
    Animated.timing(fadeAnim, {
      toValue: showAnswer ? 1 : 0.3,
      duration: animationConfig.duration,
      useNativeDriver: true,
    }).start();
  }, [showAnswer, fadeAnim, animationConfig, performanceProfile]);
  
  React.useEffect(() => {
    handleCardFlip();
  }, [handleCardFlip]);
  
  const cardStyle = useMemo(() => [
    styles.card,
    performanceProfile !== 'low' && { opacity: fadeAnim }
  ], [fadeAnim, performanceProfile]);
  
  return (
    <Animated.View style={cardStyle}>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryText}>
          {card.category} • {card.difficulty}
        </Text>
      </View>
      
      <ScrollView style={styles.questionContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.questionText}>{card.question}</Text>
        
        {showAnswer && (
          <View style={styles.answerContainer}>
            <Text style={styles.answerLabel}>Respuesta:</Text>
            <Text style={styles.answerText}>{card.answer}</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
});

// Memoized control buttons component
const ControlButtons = memo(({ 
  showAnswer, 
  isListening, 
  isProcessing, 
  onAnswer, 
  onStartListening, 
  onStopListening,
  performanceProfile 
}: {
  showAnswer: boolean;
  isListening: boolean;
  isProcessing: boolean;
  onAnswer: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  performanceProfile: string;
}) => {
  const handleVoiceCommand = useCallback(() => {
    if (performanceProfile === 'low') {
      // Add small delay for low-performance devices
      runAfterInteractions(() => {
        if (isListening) {
          onStopListening();
        } else {
          onStartListening();
        }
      });
    } else {
      if (isListening) {
        onStopListening();
      } else {
        onStartListening();
      }
    }
  }, [isListening, onStartListening, onStopListening, performanceProfile]);
  
  return (
    <View style={styles.controls}>
      {/* Voice Command Button */}
      <TouchableOpacity
        style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
        onPress={handleVoiceCommand}
        activeOpacity={0.7}
      >
        <Text style={styles.voiceButtonText}>
          {isListening || isProcessing ? '🧠 PROCESANDO...' : '🎙️ COMANDO DE VOZ'}
        </Text>
      </TouchableOpacity>
      
      {/* Answer Button */}
      <TouchableOpacity
        style={styles.answerButton}
        onPress={onAnswer}
        activeOpacity={0.7}
      >
        <Text style={styles.answerButtonText}>
          {showAnswer ? 'OCULTAR RESPUESTA' : 'RESPUESTA'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

// Memoized stats component
const StatsSection = memo(({ stats }: { stats: { correct: number; streak: number; total: number } }) => (
  <View style={styles.stats}>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{stats.correct}</Text>
      <Text style={styles.statLabel}>CORRECTAS</Text>
    </View>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{stats.streak}</Text>
      <Text style={styles.statLabel}>RACHA</Text>
    </View>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{stats.total}</Text>
      <Text style={styles.statLabel}>TOTAL</Text>
    </View>
  </View>
));

const OptimizedFlashcardScreen: React.FC<FlashcardScreenProps> = ({
  currentCard,
  currentIndex,
  totalCards,
  showAnswer,
  userAnswer,
  showUserAnswer,
  answerMode,
  isListening,
  isProcessing,
  onStartListening,
  onStopListening,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  const { performanceProfile, shouldReduceAnimations } = useOptimizedRendering();
  const { 
    toggleAnswer, 
    nextCard, 
    previousCard, 
    addFlashcard, 
    submitAnswer,
    getStudyStats 
  } = useFlashcards();
  
  // Memoized stats to prevent unnecessary re-renders
  const [stats, setStats] = useState({ correct: 0, streak: 0, total: totalCards });
  
  React.useEffect(() => {
    const loadStats = async () => {
      const studyStats = await getStudyStats();
      setStats(studyStats);
    };
    
    runAfterInteractions(loadStats);
  }, [getStudyStats, currentIndex]);
  
  // Memoized callbacks to prevent unnecessary re-renders
  const handleAnswer = useCallback(() => {
    if (performanceProfile === 'low') {
      runAfterInteractions(() => {
        toggleAnswer();
      });
    } else {
      toggleAnswer();
    }
  }, [toggleAnswer, performanceProfile]);
  
  const handleCorrect = useCallback(() => {
    submitAnswer(true, Date.now());
    if (currentIndex < totalCards - 1) {
      nextCard();
    }
  }, [submitAnswer, currentIndex, totalCards, nextCard]);
  
  const handleIncorrect = useCallback(() => {
    submitAnswer(false, Date.now());
    if (currentIndex < totalCards - 1) {
      nextCard();
    }
  }, [submitAnswer, currentIndex, totalCards, nextCard]);
  
  const handleAddFlashcard = useCallback(async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    try {
      await addFlashcard({
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
        category: newCategory.trim() || 'General',
        difficulty: 'Intermediate',
        tags: [],
      });
      
      setNewQuestion('');
      setNewAnswer('');
      setNewCategory('');
      setModalVisible(false);
      
      Alert.alert('¡Éxito!', 'Tarjeta agregada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la tarjeta');
    }
  }, [newQuestion, newAnswer, newCategory, addFlashcard]);
  
  const handleReadQuestion = useCallback(() => {
    if (currentCard) {
      runAfterInteractions(() => {
        textToSpeechService.speakText(currentCard.question);
      });
    }
  }, [currentCard]);
  
  // Memoized modal content for better performance
  const modalContent = useMemo(() => (
    <Modal
      animationType={shouldReduceAnimations ? 'none' : 'slide'}
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Nueva Tarjeta</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Pregunta"
            placeholderTextColor={COLORS.gray}
            value={newQuestion}
            onChangeText={setNewQuestion}
            multiline
          />
          
          <TextInput
            style={styles.input}
            placeholder="Respuesta"
            placeholderTextColor={COLORS.gray}
            value={newAnswer}
            onChangeText={setNewAnswer}
            multiline
          />
          
          <TextInput
            style={styles.input}
            placeholder="Categoría (opcional)"
            placeholderTextColor={COLORS.gray}
            value={newCategory}
            onChangeText={setNewCategory}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddFlashcard}
            >
              <Text style={styles.modalSaveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [modalVisible, newQuestion, newAnswer, newCategory, handleAddFlashcard, shouldReduceAnimations]);
  
  if (!currentCard) {
    return (
      <View style={styles.container}>
        <Text style={styles.noCardsText}>No hay tarjetas disponibles</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlashcardHeader currentIndex={currentIndex} totalCards={totalCards} />
      
      <CardContent 
        card={currentCard} 
        showAnswer={showAnswer} 
        performanceProfile={performanceProfile}
      />
      
      <ControlButtons
        showAnswer={showAnswer}
        isListening={isListening}
        isProcessing={isProcessing}
        onAnswer={handleAnswer}
        onStartListening={onStartListening}
        onStopListening={onStopListening}
        performanceProfile={performanceProfile}
      />
      
      {/* Navigation and Action Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={previousCard}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>⬅️ ANTERIOR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.readButton}
          onPress={handleReadQuestion}
          activeOpacity={0.7}
        >
          <Text style={styles.readButtonText}>🔊</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={nextCard}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonText}>SIGUIENTE ➡️</Text>
        </TouchableOpacity>
      </View>
      
      {/* Answer Feedback Buttons */}
      {showAnswer && (
        <View style={styles.feedbackContainer}>
          <TouchableOpacity
            style={styles.incorrectButton}
            onPress={handleIncorrect}
            activeOpacity={0.7}
          >
            <Text style={styles.incorrectButtonText}>✗ INCORRECTO</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.correctButton}
            onPress={handleCorrect}
            activeOpacity={0.7}
          >
            <Text style={styles.correctButtonText}>✓ CORRECTO</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <StatsSection stats={stats} />
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ NUEVA TARJETA</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => {
            // Handle config button press
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.configButtonText}>⚙️ CONFIG WHISPER</Text>
        </TouchableOpacity>
      </View>
      
      {modalContent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    minHeight: height * 0.4,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  categoryInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  questionContainer: {
    flex: 1,
  },
  questionText: {
    color: COLORS.white,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  answerContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
  },
  answerLabel: {
    color: COLORS.neonRed,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  answerText: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 26,
  },
  controls: {
    marginBottom: 20,
  },
  voiceButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.neonRed,
  },
  voiceButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  answerButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  answerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 0.4,
    alignItems: 'center',
  },
  navButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  readButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readButtonText: {
    fontSize: 20,
  },
  feedbackContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  incorrectButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
  },
  incorrectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  correctButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
  },
  correctButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.neonRed,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  addButton: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  configButton: {
    backgroundColor: COLORS.warning,
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  configButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.gray,
    minHeight: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalCancelButton: {
    backgroundColor: COLORS.gray,
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSaveButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  modalSaveText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noCardsText: {
    color: COLORS.white,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default memo(OptimizedFlashcardScreen);