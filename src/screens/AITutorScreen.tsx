import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { aiTutorService } from '../services/aiTutorService';
import { COLORS } from '../constants/colors';

interface TutorPersonality {
  name: string;
  style: 'encouraging' | 'direct' | 'humorous' | 'academic' | 'friendly';
  expertise: string[];
  greeting: string;
  encouragementPhrases: string[];
  explanationStyle: string;
}

interface ChatMessage {
  role: 'user' | 'tutor';
  content: string;
  timestamp: Date;
}

interface StudyRecommendation {
  type: 'focus_area' | 'review' | 'new_topic' | 'practice_mode';
  title: string;
  description: string;
  reasoning: string;
  estimatedTime: number;
  priority: 'high' | 'medium' | 'low';
  flashcardsCount?: number;
  category?: string;
}

export default function AITutorScreen() {
  const [currentTutor, setCurrentTutor] = useState<TutorPersonality | null>(null);
  const [availableTutors, setAvailableTutors] = useState<TutorPersonality[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [hasAPIKey, setHasAPIKey] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeTutor();
  }, []);

  const initializeTutor = async () => {
    try {
      // Load current tutor and available personalities
      const tutor = aiTutorService.getCurrentTutor();
      const tutors = aiTutorService.getTutorPersonalities();
      const history = aiTutorService.getConversationHistory() as ChatMessage[];
      const apiKeyAvailable = aiTutorService.hasAPIKey();
      
      setCurrentTutor(tutor);
      setAvailableTutors(tutors);
      setChatHistory(history);
      setHasAPIKey(apiKeyAvailable);
      
      // Load study recommendations
      const recs = await aiTutorService.getStudyRecommendations();
      setRecommendations(recs);
      
      // If no chat history, show greeting
      if (history.length === 0 && tutor) {
        setChatHistory([{
          role: 'tutor',
          content: tutor.greeting,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize AI Tutor:', error);
    }
  };

  const changeTutor = async (tutorName: string) => {
    try {
      await aiTutorService.changeTutor(tutorName);
      await initializeTutor();
    } catch (error) {
      console.error('Failed to change tutor:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || isLoading) return;

    const userMessage = messageInput.trim();
    setMessageInput('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      // Get response from AI Tutor
      const response = await aiTutorService.chatWithTutor(userMessage);
      
      // Add tutor response to chat
      const tutorResponse: ChatMessage = {
        role: 'tutor',
        content: response,
        timestamp: new Date(),
      };
      
      setChatHistory(prev => [...prev, tutorResponse]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to get tutor response:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'tutor',
        content: 'Lo siento, tuve un problema técnico. ¿Puedes repetir tu pregunta?',
        timestamp: new Date(),
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    Alert.alert(
      'Limpiar Chat',
      '¿Estás seguro de que quieres eliminar toda la conversación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            await aiTutorService.clearConversationHistory();
            setChatHistory(currentTutor ? [{
              role: 'tutor',
              content: currentTutor.greeting,
              timestamp: new Date(),
            }] : []);
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return COLORS.neonRed;
      case 'medium': return COLORS.neonBlue;
      case 'low': return COLORS.gray;
      default: return COLORS.gray;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'focus_area': return '🎯';
      case 'review': return '📚';
      case 'new_topic': return '🚀';
      case 'practice_mode': return '💪';
      default: return '💡';
    }
  };

  const renderTutorSelector = () => (
    <View style={styles.tutorSelector}>
      <Text style={styles.sectionTitle}>🤖 Elige tu Tutor</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {availableTutors.map((tutor) => (
          <TouchableOpacity
            key={tutor.name}
            style={[
              styles.tutorCard,
              currentTutor?.name === tutor.name && styles.selectedTutor
            ]}
            onPress={() => changeTutor(tutor.name)}
          >
            <Text style={styles.tutorName}>{tutor.name}</Text>
            <Text style={styles.tutorStyle}>{tutor.style}</Text>
            <Text style={styles.tutorExpertise}>
              {tutor.expertise.slice(0, 2).join(', ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderRecommendations = () => {
    if (recommendations.length === 0) return null;

    return (
      <View style={styles.recommendationsSection}>
        <Text style={styles.sectionTitle}>💡 Recomendaciones de Estudio</Text>
        
        {recommendations.slice(0, 3).map((rec, index) => (
          <View key={index} style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationIcon}>{getTypeIcon(rec.type)}</Text>
              <View style={styles.recommendationInfo}>
                <Text style={styles.recommendationTitle}>{rec.title}</Text>
                <Text style={[
                  styles.priorityBadge,
                  { color: getPriorityColor(rec.priority) }
                ]}>
                  {rec.priority.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.estimatedTime}>{rec.estimatedTime}m</Text>
            </View>
            
            <Text style={styles.recommendationDescription}>{rec.description}</Text>
            
            <Text style={styles.recommendationReasoning}>
              💭 {rec.reasoning}
            </Text>
            
            {rec.flashcardsCount && (
              <Text style={styles.flashcardsCount}>
                📚 {rec.flashcardsCount} preguntas sugeridas
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderChatMessage = (message: ChatMessage, index: number) => (
    <View
      key={index}
      style={[
        styles.messageContainer,
        message.role === 'user' ? styles.userMessage : styles.tutorMessage
      ]}
    >
      <Text style={styles.messageText}>{message.content}</Text>
      <Text style={styles.messageTime}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const renderChat = () => (
    <View style={styles.chatSection}>
      <View style={styles.chatHeader}>
        <Text style={styles.sectionTitle}>
          💬 Chat con {currentTutor?.name}
        </Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
          <Text style={styles.clearButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      
      {!hasAPIKey && (
        <View style={styles.noApiKeyBanner}>
          <Text style={styles.noApiKeyText}>
            ⚠️ Para funcionalidades avanzadas de IA, configura tu API key de OpenAI en configuración
          </Text>
        </View>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatMessages}
        contentContainerStyle={styles.chatMessagesContent}
        showsVerticalScrollIndicator={false}
      >
        {chatHistory.map(renderChatMessage)}
        
        {isLoading && (
          <View style={styles.loadingMessage}>
            <Text style={styles.tutorLoadingText}>🤖 {currentTutor?.name} está escribiendo...</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.chatInput}>
        <TextInput
          style={styles.textInput}
          value={messageInput}
          onChangeText={setMessageInput}
          placeholder="Escribe tu pregunta..."
          placeholderTextColor={COLORS.gray}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageInput.trim() || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!messageInput.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>📤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!currentTutor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Inicializando AI Tutor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {renderTutorSelector()}
        {renderRecommendations()}
      </ScrollView>
      
      {renderChat()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tutorSelector: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  tutorCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTutor: {
    borderColor: COLORS.neonBlue,
    backgroundColor: COLORS.neonBlue + '20',
  },
  tutorName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tutorStyle: {
    color: COLORS.neonBlue,
    fontSize: 12,
    marginBottom: 4,
  },
  tutorExpertise: {
    color: COLORS.gray,
    fontSize: 10,
    textAlign: 'center',
  },
  recommendationsSection: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  recommendationCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: '600',
  },
  estimatedTime: {
    color: COLORS.gray,
    fontSize: 12,
  },
  recommendationDescription: {
    color: COLORS.gray,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  recommendationReasoning: {
    color: COLORS.neonBlue,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  flashcardsCount: {
    color: COLORS.gray,
    fontSize: 11,
  },
  chatSection: {
    flex: 1,
    minHeight: 300,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
  },
  noApiKeyBanner: {
    backgroundColor: COLORS.neonRed + '20',
    borderColor: COLORS.neonRed,
    borderWidth: 1,
    margin: 15,
    padding: 10,
    borderRadius: 8,
  },
  noApiKeyText: {
    color: COLORS.neonRed,
    fontSize: 12,
    textAlign: 'center',
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 15,
  },
  chatMessagesContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.neonBlue,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  tutorMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.darkGray,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  messageText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    color: COLORS.gray,
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  loadingMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.darkGray,
    borderRadius: 18,
    padding: 12,
    marginBottom: 15,
  },
  tutorLoadingText: {
    color: COLORS.gray,
    fontSize: 14,
    fontStyle: 'italic',
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.darkGray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
  },
});