import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { questionGenerationService } from '../services/questionGenerationService';
import { databaseService } from '../services/databaseService.platform';
import { configService } from '../services/configService';
import { textToSpeechService } from '../services/textToSpeechService';
import { Flashcard } from '../types';

export default function InterviewPrepScreen() {
  const [activeCategory, setActiveCategory] = useState<string>('technical');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Flashcard[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewQuestions, setInterviewQuestions] = useState<Flashcard[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);

  const categories = [
    {
      id: 'technical',
      name: 'Técnicas',
      icon: '💻',
      description: 'Algoritmos, estructuras de datos, programación',
      difficulty: 'Intermediate' as const,
      count: 8
    },
    {
      id: 'behavioral',
      name: 'Comportamiento',
      icon: '🧠',
      description: 'Experiencias, liderazgo, trabajo en equipo',
      difficulty: 'Intermediate' as const,
      count: 6
    },
    {
      id: 'system-design',
      name: 'System Design',
      icon: '🏗️',
      description: 'Arquitectura, escalabilidad, diseño de sistemas',
      difficulty: 'Advanced' as const,
      count: 5
    },
    {
      id: 'frontend',
      name: 'Frontend',
      icon: '🎨',
      description: 'React, CSS, JavaScript, UX/UI',
      difficulty: 'Intermediate' as const,
      count: 7
    },
    {
      id: 'backend',
      name: 'Backend',
      icon: '⚙️',
      description: 'APIs, bases de datos, servidores',
      difficulty: 'Intermediate' as const,
      count: 7
    },
    {
      id: 'devops',
      name: 'DevOps',
      icon: '🚀',
      description: 'CI/CD, Docker, cloud, deployment',
      difficulty: 'Advanced' as const,
      count: 5
    }
  ];

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const hasKey = await configService.hasOpenAIApiKey();
    setHasApiKey(hasKey);
  };

  const generateQuestionsForCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    try {
      setIsGenerating(true);
      
      const questions = await questionGenerationService.generateContextualQuestions({
        category: category.name,
        difficulty: category.difficulty,
        technology: categoryId,
        count: category.count,
        userLevel: category.difficulty === 'Advanced' ? 3 : 2,
        recentTopics: []
      });

      setGeneratedQuestions(questions);

      // Add to database
      if (questions.length > 0) {
        for (const question of questions) {
          await databaseService.addFlashcard({
            question: question.question,
            answer: question.answer,
            category: `Interview ${category.name}`,
            difficulty: category.difficulty,
            tags: ['interview', categoryId]
          });
        }

        Alert.alert(
          '¡Preguntas Generadas!',
          `Se generaron ${questions.length} preguntas de ${category.name.toLowerCase()} para entrevistas.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      Alert.alert('Error', 'No se pudieron generar las preguntas. Verifica tu conexión y API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startLiveInterview = async () => {
    if (!hasApiKey) {
      Alert.alert('Error', 'Configura tu API key de OpenAI para iniciar la entrevista.');
      return;
    }

    try {
      setIsGenerating(true);
      
      // Get mix of questions from different categories for realistic interview
      const interviewQuestions: Flashcard[] = [];
      
      // Get questions from database first
      for (const category of categories.slice(0, 4)) { // First 4 categories
        const questions = await databaseService.getQuestionsFromBank({
          category: category.name,
          difficulty: category.difficulty,
          limit: 2 // 2 questions per category
        });
        interviewQuestions.push(...questions);
      }
      
      if (interviewQuestions.length < 8) {
        Alert.alert('Error', 'No hay suficientes preguntas en la base de datos. Genera algunas primero.');
        return;
      }

      // Shuffle questions for realistic interview flow
      const shuffledQuestions = interviewQuestions.sort(() => Math.random() - 0.5).slice(0, 8);
      
      setInterviewQuestions(shuffledQuestions);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setInterviewMode(true);
      
      Alert.alert(
        '🎯 Entrevista Iniciada',
        `Comenzamos con ${shuffledQuestions.length} preguntas. Responde naturalmente como en una entrevista real.`,
        [{ text: 'Empezar', onPress: () => {} }]
      );
    } catch (error) {
      console.error('Error starting interview:', error);
      Alert.alert('Error', 'No se pudo iniciar la entrevista.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < interviewQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Interview completed
      setInterviewMode(false);
      Alert.alert(
        '🎉 ¡Entrevista Completada!',
        `Has respondido ${interviewQuestions.length} preguntas. ¡Buen trabajo!`,
        [
          { text: 'Ver Resultados', onPress: () => console.log('Show results') },
          { text: 'Volver al Menú', onPress: () => {} }
        ]
      );
    }
  };

  const handleSkipQuestion = () => {
    setUserAnswers([...userAnswers, 'Pregunta omitida']);
    handleNextQuestion();
  };

  const generateComprehensivePack = async () => {
    try {
      setIsGenerating(true);
      const allQuestions: Flashcard[] = [];

      // Generate questions for all categories
      for (const category of categories) {
        const questions = await questionGenerationService.generateContextualQuestions({
          category: category.name,
          difficulty: category.difficulty,
          technology: category.id,
          count: Math.ceil(category.count / 2), // Half the normal amount for comprehensive pack
          userLevel: category.difficulty === 'Advanced' ? 3 : 2,
          recentTopics: []
        });
        allQuestions.push(...questions);
      }

      setGeneratedQuestions(allQuestions);

      // Add to database
      if (allQuestions.length > 0) {
        for (const question of allQuestions) {
          await databaseService.addFlashcard({
            question: question.question,
            answer: question.answer,
            category: 'Interview Complete Pack',
            difficulty: question.difficulty || 'Intermediate',
            tags: ['interview', 'complete-pack']
          });
        }

        Alert.alert(
          '¡Pack Completo Generado!',
          `Se generaron ${allQuestions.length} preguntas cubriendo todas las áreas de entrevistas.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating comprehensive pack:', error);
      Alert.alert('Error', 'No se pudo generar el pack completo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderCategoryCard = (category: typeof categories[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryCard,
        activeCategory === category.id && styles.categoryCardActive
      ]}
      onPress={() => setActiveCategory(category.id)}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <View style={styles.categoryContent}>
        <Text style={styles.categoryName}>{category.name}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
        <View style={styles.categoryMeta}>
          <Text style={styles.categoryCount}>{category.count} preguntas</Text>
          <Text style={[
            styles.categoryDifficulty,
            category.difficulty === 'Advanced' && styles.categoryDifficultyAdvanced
          ]}>
            {category.difficulty}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGeneratedQuestions = () => {
    if (generatedQuestions.length === 0) return null;

    return (
      <View style={styles.generatedSection}>
        <Text style={styles.generatedTitle}>
          ✨ Preguntas Generadas ({generatedQuestions.length})
        </Text>
        {generatedQuestions.slice(0, 3).map((question, index) => (
          <View key={index} style={styles.questionPreview}>
            <Text style={styles.questionText} numberOfLines={2}>
              {question.question}
            </Text>
            <Text style={styles.questionCategory}>
              {question.category} • {question.difficulty}
            </Text>
          </View>
        ))}
        {generatedQuestions.length > 3 && (
          <Text style={styles.moreQuestionsText}>
            +{generatedQuestions.length - 3} preguntas más agregadas
          </Text>
        )}
      </View>
    );
  };

  const renderInterviewMode = () => {
    if (!interviewMode || interviewQuestions.length === 0) return null;

    const currentQuestion = interviewQuestions[currentQuestionIndex];
    
    return (
      <View style={styles.container}>
        {/* Interview Header */}
        <View style={styles.interviewHeader}>
          <Text style={styles.interviewTitle}>🎯 Entrevista en Vivo</Text>
          <Text style={styles.interviewProgress}>
            Pregunta {currentQuestionIndex + 1} de {interviewQuestions.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestionIndex + 1) / interviewQuestions.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Current Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionCategory}>{currentQuestion.category}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
          <TouchableOpacity 
            style={styles.readQuestionButton}
            onPress={() => textToSpeechService.speakInterviewQuestion(currentQuestion.question, currentQuestion.category || '')}
          >
            <Text style={styles.readQuestionButtonText}>🔊 Leer Pregunta</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Recording */}
        <View style={styles.voiceSection}>
          <TouchableOpacity
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            onPress={() => setIsListening(!isListening)}
          >
            <Text style={styles.voiceIcon}>{isListening ? '⏹️' : '🎤'}</Text>
            <Text style={styles.voiceText}>
              {isListening ? 'Detener Grabación' : 'Grabar Respuesta'}
            </Text>
          </TouchableOpacity>

          {isListening && (
            <Text style={styles.listeningText}>
              🔴 Grabando... Habla naturalmente
            </Text>
          )}
        </View>

        {/* Interview Controls */}
        <View style={styles.interviewControls}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipQuestion}
          >
            <Text style={styles.skipButtonText}>Saltar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNextQuestion}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestionIndex === interviewQuestions.length - 1 ? 'Finalizar' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exit Interview */}
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => {
            Alert.alert(
              'Salir de la Entrevista',
              '¿Estás seguro? Se perderá el progreso actual.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', onPress: () => setInterviewMode(false) }
              ]
            );
          }}
        >
          <Text style={styles.exitButtonText}>❌ Salir de la Entrevista</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const activecat = categories.find(c => c.id === activeCategory);

  // Show interview mode if active
  if (interviewMode) {
    return renderInterviewMode();
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Interview Prep</Text>
          <Text style={styles.subtitle}>
            Prepárate para entrevistas técnicas con preguntas específicas por área
          </Text>
        </View>

        {/* API Key Warning */}
        {!hasApiKey && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Configura tu API key de OpenAI para generar preguntas personalizadas
            </Text>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>📚 Categorías de Entrevista</Text>
          {categories.map(renderCategoryCard)}
        </View>

        {/* Selected Category Actions */}
        {activecat && (
          <View style={styles.actionsSection}>
            <Text style={styles.selectedCategoryTitle}>
              {activecat.icon} {activecat.name}
            </Text>
            <Text style={styles.selectedCategoryDescription}>
              {activecat.description}
            </Text>

            <TouchableOpacity
              style={[
                styles.generateButton,
                isGenerating && styles.generateButtonDisabled
              ]}
              onPress={() => generateQuestionsForCategory(activeCategory)}
              disabled={isGenerating || !hasApiKey}
            >
              {isGenerating ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.generateButtonText}>
                  {hasApiKey 
                    ? `🎯 Generar ${activecat.count} Preguntas de ${activecat.name}`
                    : '⚠️ Configura API Key'
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Live Interview */}
        <View style={styles.comprehensiveSection}>
          <Text style={styles.comprehensiveTitle}>🎯 Entrevista en Vivo</Text>
          <Text style={styles.comprehensiveDescription}>
            Experimenta una entrevista real con preguntas mezcladas de diferentes categorías
          </Text>

          <TouchableOpacity
            style={[
              styles.liveInterviewButton,
              isGenerating && styles.generateButtonDisabled
            ]}
            onPress={startLiveInterview}
            disabled={isGenerating || !hasApiKey}
          >
            {isGenerating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.liveInterviewButtonText}>
                {hasApiKey 
                  ? '🎤 Iniciar Entrevista (8-10 preguntas)'
                  : '⚠️ Configura API Key'
                }
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.comprehensiveButton,
              isGenerating && styles.generateButtonDisabled
            ]}
            onPress={generateComprehensivePack}
            disabled={isGenerating || !hasApiKey}
          >
            {isGenerating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.comprehensiveButtonText}>
                {hasApiKey 
                  ? '📚 Generar Más Preguntas'
                  : '⚠️ Configura API Key'
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Generated Questions Preview */}
        {renderGeneratedQuestions()}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Tips para la Entrevista</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Practica explicando tu proceso de pensamiento en voz alta</Text>
            <Text style={styles.tipItem}>• Usa el método STAR para preguntas comportamentales</Text>
            <Text style={styles.tipItem}>• Haz preguntas sobre el equipo y la cultura de la empresa</Text>
            <Text style={styles.tipItem}>• Prepara ejemplos específicos de proyectos pasados</Text>
            <Text style={styles.tipItem}>• Practica coding en whiteboard o editor simple</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningBanner: {
    backgroundColor: COLORS.warning,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    color: COLORS.background,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  categoriesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  categoryCardActive: {
    borderColor: COLORS.neonRed,
    backgroundColor: COLORS.background,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  categoryDifficulty: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  categoryDifficultyAdvanced: {
    color: COLORS.warning,
  },
  actionsSection: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  selectedCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  selectedCategoryDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  comprehensiveSection: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  comprehensiveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  comprehensiveDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: 16,
  },
  comprehensiveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  comprehensiveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  generatedSection: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  generatedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  questionPreview: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  moreQuestionsText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  tipsSection: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    marginBottom: 40,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  // Interview Mode Styles
  interviewHeader: {
    padding: 20,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
  },
  interviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  interviewProgress: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 10,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.neonRed,
    borderRadius: 2,
  },
  questionCard: {
    margin: 20,
    padding: 24,
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
  },
  questionCategory: {
    fontSize: 12,
    color: COLORS.neonRed,
    fontWeight: '600',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 18,
    color: COLORS.white,
    lineHeight: 26,
    fontWeight: '500',
  },
  voiceSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neonBlue,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.neonRed,
  },
  voiceIcon: {
    fontSize: 24,
  },
  voiceText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listeningText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.neonRed,
    textAlign: 'center',
  },
  interviewControls: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.gray,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  exitButton: {
    margin: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.neonRed,
    borderRadius: 8,
    alignItems: 'center',
  },
  exitButtonText: {
    color: COLORS.neonRed,
    fontSize: 14,
    fontWeight: '500',
  },
  liveInterviewButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  liveInterviewButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  readQuestionButton: {
    backgroundColor: COLORS.neonBlue,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  readQuestionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});