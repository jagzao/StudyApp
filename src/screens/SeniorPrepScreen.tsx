import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { questionGenerationService } from '../services/questionGenerationService';
import { databaseService } from '../services/databaseService.platform';
import { configService } from '../services/configService';
import { Flashcard } from '../types';

export default function SeniorPrepScreen() {
  const [activeTab, setActiveTab] = useState<'generate' | 'jobdesc' | 'custom'>('generate');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Flashcard[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>([]);

  const seniorTechnologies = [
    'React', 'TypeScript', 'Node.js', 'GraphQL', 'Docker', 'Kubernetes',
    'AWS', 'Azure', 'MongoDB', 'PostgreSQL', 'Redis', 'Microservices',
    'System Design', 'Performance Optimization', 'Security', 'CI/CD',
    'Leadership', 'Architecture', 'Scalability', 'Testing Strategies'
  ];

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const hasKey = await configService.hasOpenAIApiKey();
    setHasApiKey(hasKey);
  };

  const generateSeniorQuestions = async () => {
    try {
      setIsGenerating(true);
      
      // Generate questions for senior fullstack developers
      const questions = await questionGenerationService.generateContextualQuestions({
        category: 'Senior Development',
        difficulty: 'Advanced',
        technology: 'Fullstack',
        count: 10,
        userLevel: 3,
        recentTopics: []
      });

      setGeneratedQuestions(questions);
      
      // Add to database
      if (questions.length > 0) {
        for (const question of questions) {
          await databaseService.addFlashcard({
            question: question.question,
            answer: question.answer,
            category: 'Senior Prep',
            difficulty: 'Advanced',
            tags: ['senior', 'fullstack']
          });
        }
        
        Alert.alert(
          '¡Preguntas Generadas!',
          `Se generaron ${questions.length} preguntas de nivel senior y se agregaron a tu base de datos.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating senior questions:', error);
      Alert.alert('Error', 'No se pudieron generar las preguntas. Verifica tu conexión y API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startJobDescriptionInterview = async () => {
    if (!jobDescription.trim()) {
      Alert.alert('Error', 'Por favor ingresa una descripción del trabajo');
      return;
    }

    try {
      setIsGenerating(true);
      
      // First, generate or get questions based on job description
      let questions = await questionGenerationService.importQuestionsFromJobDescription(
        jobDescription
      );

      // If we don't get enough questions from the service, get from database
      if (questions.length < 5) {
        const dbQuestions = await databaseService.getQuestionsFromBank({
          difficulty: 'Advanced',
          limit: 8
        });
        questions = [...questions, ...dbQuestions].slice(0, 8);
      }

      if (questions.length === 0) {
        Alert.alert('Error', 'No se pudieron obtener preguntas para la entrevista. Intenta generar algunas primero.');
        return;
      }

      // Add to database if not already there
      for (const question of questions.slice(0, 5)) {
        await databaseService.addFlashcard({
          question: question.question,
          answer: question.answer,
          category: 'Job Specific',
          difficulty: question.difficulty || 'Advanced',
          tags: ['job-prep', 'custom']
        });
      }

      setGeneratedQuestions(questions);

      Alert.alert(
        '🎯 Iniciar Entrevista Personalizada',
        `¡Perfecto! Basándome en la descripción del trabajo, he preparado ${questions.length} preguntas específicas para esta posición. ¿Quieres comenzar la entrevista ahora?`,
        [
          { text: 'Ver Preguntas', style: 'cancel' },
          { 
            text: 'Iniciar Entrevista', 
            onPress: () => {
              // TODO: Navigate to interview mode with these specific questions
              Alert.alert('Entrevista Iniciada', 'La entrevista personalizada comenzará ahora...');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error starting job description interview:', error);
      Alert.alert('Error', 'No se pudo iniciar la entrevista personalizada.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCustomQuestions = async () => {
    if (selectedTechnologies.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una tecnología');
      return;
    }

    try {
      setIsGenerating(true);
      const allQuestions: Flashcard[] = [];

      // Generate questions for each selected technology
      for (const tech of selectedTechnologies) {
        const questions = await questionGenerationService.generateContextualQuestions({
          category: customCategory || 'Custom Senior Prep',
          difficulty: 'Advanced',
          technology: tech,
          count: 3,
          userLevel: 3,
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
            category: customCategory || 'Custom Senior Prep',
            difficulty: 'Advanced',
            tags: selectedTechnologies
          });
        }

        Alert.alert(
          '¡Preguntas Personalizadas!',
          `Se generaron ${allQuestions.length} preguntas para las tecnologías seleccionadas.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error generating custom questions:', error);
      Alert.alert('Error', 'No se pudieron generar las preguntas personalizadas.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTechnology = (tech: string) => {
    setSelectedTechnologies(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const renderGenerateTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>🚀 Preguntas Senior Fullstack</Text>
      <Text style={styles.sectionDescription}>
        Genera preguntas avanzadas que cubren arquitectura, liderazgo, optimización de performance y diseño de sistemas.
      </Text>

      <View style={styles.featureList}>
        <Text style={styles.featureItem}>• Arquitectura de aplicaciones escalables</Text>
        <Text style={styles.featureItem}>• Patrones de diseño y microservicios</Text>
        <Text style={styles.featureItem}>• Optimización de performance y seguridad</Text>
        <Text style={styles.featureItem}>• Liderazgo técnico y mentoría</Text>
        <Text style={styles.featureItem}>• Casos de uso complejos del mundo real</Text>
      </View>

      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
        onPress={generateSeniorQuestions}
        disabled={isGenerating || !hasApiKey}
      >
        {isGenerating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.generateButtonText}>
            {hasApiKey ? '🎯 Generar Preguntas Senior' : '⚠️ Configura API Key'}
          </Text>
        )}
      </TouchableOpacity>

      {!hasApiKey && (
        <Text style={styles.warningText}>
          Necesitas configurar tu API key de OpenAI para generar preguntas personalizadas.
        </Text>
      )}
    </View>
  );

  const renderJobDescTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>📋 Desde Job Description</Text>
      <Text style={styles.sectionDescription}>
        Pega la descripción del trabajo y genera preguntas específicas para esa posición.
      </Text>

      <Text style={styles.inputLabel}>Descripción del Trabajo:</Text>
      <TextInput
        style={styles.textArea}
        value={jobDescription}
        onChangeText={setJobDescription}
        placeholder="Pega aquí la descripción del trabajo..."
        placeholderTextColor={COLORS.gray}
        multiline={true}
        numberOfLines={8}
      />

      <TouchableOpacity
        style={[styles.interviewButton, isGenerating && styles.generateButtonDisabled]}
        onPress={startJobDescriptionInterview}
        disabled={isGenerating || !hasApiKey}
      >
        {isGenerating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.interviewButtonText}>
            {hasApiKey ? '🎤 Iniciar Entrevista Personalizada' : '⚠️ Configura API Key'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCustomTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>⚙️ Preguntas Personalizadas</Text>
      <Text style={styles.sectionDescription}>
        Selecciona tecnologías específicas para generar preguntas enfocadas.
      </Text>

      <Text style={styles.inputLabel}>Categoría Personalizada (opcional):</Text>
      <TextInput
        style={styles.textInput}
        value={customCategory}
        onChangeText={setCustomCategory}
        placeholder="Ej: Backend Senior, Frontend Lead, DevOps..."
        placeholderTextColor={COLORS.gray}
      />

      <Text style={styles.inputLabel}>Selecciona Tecnologías:</Text>
      <View style={styles.technologiesGrid}>
        {seniorTechnologies.map(tech => (
          <TouchableOpacity
            key={tech}
            style={[
              styles.technologyChip,
              selectedTechnologies.includes(tech) && styles.technologyChipSelected
            ]}
            onPress={() => toggleTechnology(tech)}
          >
            <Text
              style={[
                styles.technologyChipText,
                selectedTechnologies.includes(tech) && styles.technologyChipTextSelected
              ]}
            >
              {tech}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
        onPress={generateCustomQuestions}
        disabled={isGenerating || !hasApiKey || selectedTechnologies.length === 0}
      >
        {isGenerating ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.generateButtonText}>
            {hasApiKey ? `🎯 Generar (${selectedTechnologies.length} techs)` : '⚠️ Configura API Key'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderGeneratedQuestions = () => {
    if (generatedQuestions.length === 0) return null;

    return (
      <View style={styles.generatedSection}>
        <Text style={styles.generatedTitle}>✨ Preguntas Generadas ({generatedQuestions.length})</Text>
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
            +{generatedQuestions.length - 3} preguntas más agregadas a tu base de datos
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Senior Prep</Text>
          <Text style={styles.subtitle}>
            Genera preguntas personalizadas para entrevistas de nivel senior
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'generate' && styles.activeTab]}
            onPress={() => setActiveTab('generate')}
          >
            <Text style={[styles.tabText, activeTab === 'generate' && styles.activeTabText]}>
              Senior
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'jobdesc' && styles.activeTab]}
            onPress={() => setActiveTab('jobdesc')}
          >
            <Text style={[styles.tabText, activeTab === 'jobdesc' && styles.activeTabText]}>
              Job Desc
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
            onPress={() => setActiveTab('custom')}
          >
            <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'generate' && renderGenerateTab()}
        {activeTab === 'jobdesc' && renderJobDescTab()}
        {activeTab === 'custom' && renderCustomTab()}

        {/* Generated Questions Preview */}
        {renderGeneratedQuestions()}
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.neonRed,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 20,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  textArea: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  technologiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  technologyChip: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  technologyChipSelected: {
    backgroundColor: COLORS.neonRed,
    borderColor: COLORS.neonRed,
  },
  technologyChipText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  technologyChipTextSelected: {
    color: COLORS.white,
  },
  generateButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  generatedSection: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
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
  questionText: {
    fontSize: 14,
    color: COLORS.white,
    lineHeight: 18,
    marginBottom: 4,
  },
  questionCategory: {
    fontSize: 12,
    color: COLORS.gray,
  },
  moreQuestionsText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  interviewButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  interviewButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});