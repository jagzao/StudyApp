import React, { useState } from 'react';
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
import { textToSpeechService } from '../services/textToSpeechService';

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

const FlashcardScreen: React.FC<FlashcardScreenProps> = ({
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
  const [fadeAnim] = useState(new Animated.Value(1));
  const [waveAnim1] = useState(new Animated.Value(1));
  const [waveAnim2] = useState(new Animated.Value(1));
  const [waveAnim3] = useState(new Animated.Value(1));

  const {
    nextCard,
    previousCard,
    toggleAnswer,
    addCard,
    switchMode,
    progress,
    hasNext,
    hasPrevious,
  } = useFlashcards();

  // Wave animations for listening
  React.useEffect(() => {
    if (isListening) {
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
  }, [isListening, waveAnim1, waveAnim2, waveAnim3]);

  const handleAddCard = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      Alert.alert('Error', 'Por favor completa ambos campos');
      return;
    }

    await addCard({
      question: newQuestion,
      answer: newAnswer,
      category: 'General',
      difficulty: 'Beginner',
    });

    setNewQuestion('');
    setNewAnswer('');
    setModalVisible(false);
    Alert.alert('¡Éxito!', 'Flashcard agregada correctamente');
  };

  const handleNext = () => {
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
      })
    ]).start();
    
    nextCard();
  };

  const handlePrevious = () => {
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
      })
    ]).start();
    
    previousCard();
  };

  if (!currentCard) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay flashcards disponibles</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ NUEVA TARJETA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {totalCards}
        </Text>
      </View>

      {/* Mode selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, answerMode === 'flashcard' && styles.modeButtonActive]}
          onPress={() => switchMode('flashcard')}
        >
          <Text style={[styles.modeText, answerMode === 'flashcard' && styles.modeTextActive]}>
            FLASHCARD
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, answerMode === 'interview' && styles.modeButtonActive]}
          onPress={() => switchMode('interview')}
        >
          <Text style={[styles.modeText, answerMode === 'interview' && styles.modeTextActive]}>
            ENTREVISTA
          </Text>
        </TouchableOpacity>
      </View>

      {/* Flashcard */}
      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
        <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryText}>{currentCard.category}</Text>
              <Text style={styles.difficultyText}>{currentCard.difficulty}</Text>
            </View>
            
            <View style={styles.questionSection}>
              <Text style={styles.questionText}>{currentCard.question}</Text>
              <TouchableOpacity 
                style={styles.speakButton}
                onPress={() => textToSpeechService.speakQuestion(currentCard.question)}
              >
                <Text style={styles.speakButtonText}>🔊 Leer Pregunta</Text>
              </TouchableOpacity>
            </View>
            
            {showAnswer && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{currentCard.answer}</Text>
                <TouchableOpacity 
                  style={styles.speakButton}
                  onPress={() => textToSpeechService.speakAnswer(currentCard.answer)}
                >
                  <Text style={styles.speakButtonText}>🔊 Leer Respuesta</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {showUserAnswer && userAnswer && (
              <View style={styles.userAnswerContainer}>
                <Text style={styles.userAnswerLabel}>Tu respuesta:</Text>
                <Text style={styles.userAnswerText}>{userAnswer}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, !hasPrevious && styles.controlButtonDisabled]}
          onPress={handlePrevious}
          disabled={!hasPrevious}
        >
          <Text style={styles.controlButtonText}>‹ ANTERIOR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.showAnswerButton}
          onPress={toggleAnswer}
        >
          <Text style={styles.showAnswerButtonText}>
            {showAnswer ? 'OCULTAR' : 'MOSTRAR'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !hasNext && styles.controlButtonDisabled]}
          onPress={handleNext}
          disabled={!hasNext}
        >
          <Text style={styles.controlButtonText}>SIGUIENTE ›</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Answer Button */}
      {answerMode === 'interview' && !showAnswer && (
        <View style={styles.voiceAnswerContainer}>
          <TouchableOpacity
            style={[styles.voiceAnswerButton, isListening && styles.voiceAnswerButtonActive]}
            onPress={isListening ? onStopListening : onStartListening}
            disabled={isProcessing}
          >
            <Text style={styles.voiceAnswerIcon}>🎤</Text>
            <Text style={styles.voiceAnswerText}>
              {isListening ? 'Detener Grabación' : 'Responder por Voz'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.evaluateButton}
            onPress={() => toggleAnswer()}
          >
            <Text style={styles.evaluateButtonText}>✓ Evaluar Respuesta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Voice button */}
      <TouchableOpacity
        style={styles.voiceButton}
        onPress={isListening ? onStopListening : onStartListening}
        disabled={isProcessing}
      >
        {isListening && (
          <>
            <Animated.View style={[styles.waveRing, { transform: [{ scale: waveAnim1 }] }]} />
            <Animated.View style={[styles.waveRing, { transform: [{ scale: waveAnim2 }] }]} />
            <Animated.View style={[styles.waveRing, { transform: [{ scale: waveAnim3 }] }]} />
          </>
        )}
        <Text style={styles.voiceButtonText}>🎤</Text>
        {isProcessing && <Text style={styles.processingText}>Procesando...</Text>}
      </TouchableOpacity>

      {/* Add button */}
      <TouchableOpacity
        style={styles.addNewButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addNewButtonText}>+ NUEVA TARJETA</Text>
      </TouchableOpacity>

      {/* Add Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Flashcard</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Pregunta"
              placeholderTextColor={COLORS.placeholder}
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
            />
            
            <TextInput
              style={styles.input}
              placeholder="Respuesta"
              placeholderTextColor={COLORS.placeholder}
              value={newAnswer}
              onChangeText={setNewAnswer}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCard}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100, // Space for HUD
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.neonRed,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.white,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: COLORS.neonRed,
  },
  modeText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  modeTextActive: {
    color: COLORS.white,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardScrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 25,
    minHeight: height * 0.4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryText: {
    color: COLORS.neonRed,
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  questionSection: {
    marginBottom: 20,
  },
  questionText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 25,
    marginBottom: 12,
  },
  answerContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
  },
  answerText: {
    color: COLORS.success,
    fontSize: 16,
    lineHeight: 22,
  },
  userAnswerContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  userAnswerLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 5,
  },
  userAnswerText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  showAnswerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.neonRed,
    borderRadius: 8,
  },
  showAnswerButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  voiceButton: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.neonRed,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  waveRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    opacity: 0.3,
  },
  voiceButtonText: {
    fontSize: 24,
  },
  processingText: {
    color: COLORS.white,
    fontSize: 10,
    marginTop: 5,
  },
  addNewButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 80,
    paddingVertical: 15,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 5,
  },
  addNewButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  addButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    padding: 25,
    width: width * 0.9,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 15,
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.neonRed,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  voiceAnswerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // More space to avoid overlapping with bottom buttons
    gap: 10,
  },
  voiceAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neonBlue,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  voiceAnswerButtonActive: {
    backgroundColor: COLORS.neonRed,
  },
  voiceAnswerIcon: {
    fontSize: 20,
  },
  voiceAnswerText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  evaluateButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  evaluateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  speakButton: {
    backgroundColor: COLORS.neonBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  speakButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FlashcardScreen;