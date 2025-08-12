import { authService } from './authService';
import { databaseService } from './databaseService.platform';
import { configService } from './configService';
import { Flashcard } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorPersonality {
  name: string;
  style: 'encouraging' | 'direct' | 'humorous' | 'academic' | 'friendly';
  expertise: string[];
  greeting: string;
  encouragementPhrases: string[];
  explanationStyle: string;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  topics: Array<{
    id: string;
    title: string;
    difficulty: string;
    prerequisites: string[];
    estimatedHours: number;
    completed: boolean;
  }>;
  progress: number;
  estimatedDuration: string;
}

interface PersonalizedExplanation {
  explanation: string;
  examples: string[];
  commonMistakes: string[];
  practiceQuestions: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  adaptedToUser: boolean;
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

class AITutorService {
  private currentTutor: TutorPersonality | null = null;
  private apiKey: string | null = null;
  private conversationHistory: Array<{
    role: 'user' | 'tutor';
    content: string;
    timestamp: Date;
  }> = [];

  private tutorPersonalities: TutorPersonality[] = [
    {
      name: 'Alex',
      style: 'encouraging',
      expertise: ['JavaScript', 'React', 'Node.js'],
      greeting: '¡Hola! Soy Alex, tu tutor de programación. Estoy aquí para ayudarte a dominar el desarrollo web paso a paso. 🚀',
      encouragementPhrases: [
        '¡Excelente progreso!',
        'Vas por buen camino',
        'Este concepto puede ser complejo, pero lo estás manejando bien',
        '¡Sigue así! Cada error es una oportunidad de aprender',
      ],
      explanationStyle: 'Explicaciones paso a paso con analogías del mundo real y ejemplos prácticos'
    },
    {
      name: 'Dr. Sarah',
      style: 'academic',
      expertise: ['System Design', 'Algorithms', 'Computer Science'],
      greeting: 'Buenos días. Soy la Dr. Sarah, especializada en ciencias de la computación. Exploraremos conceptos fundamentales con rigor académico.',
      encouragementPhrases: [
        'Análisis preciso',
        'Comprensión conceptual sólida',
        'Reflexión crítica interesante',
        'Enfoque metodológico correcto',
      ],
      explanationStyle: 'Explicaciones teóricas fundamentadas con referencias y análisis profundo'
    },
    {
      name: 'Miguel',
      style: 'friendly',
      expertise: ['React Native', 'Mobile Development', 'TypeScript'],
      greeting: '¡Hey! Soy Miguel, desarrollador móvil. Te voy a enseñar React Native como si fuéramos compañeros de equipo. 📱',
      encouragementPhrases: [
        '¡Esa es la actitud!',
        'Como diría mi abuela: "Poco a poco se llega lejos"',
        'Perfect! Así se hace en el mundo real',
        'Esa pregunta me la hice yo también cuando empecé',
      ],
      explanationStyle: 'Explicaciones conversacionales con experiencias reales y tips prácticos'
    }
  ];

  async initialize(openAIKey?: string): Promise<void> {
    try {
      // Get API key from config service
      this.apiKey = await configService.getOpenAIApiKey();

      // Load user's preferred tutor
      await this.loadUserTutorPreference();
      
      // Load conversation history
      await this.loadConversationHistory();

      console.log('🤖 AI Tutor Service initialized with API key:', this.apiKey ? 'Yes' : 'No');
    } catch (error) {
      console.error('❌ Failed to initialize AI Tutor:', error);
    }
  }

  // ==================== TUTOR PERSONALITY MANAGEMENT ====================

  private async loadUserTutorPreference(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@preferred_tutor');
      if (saved) {
        const tutorName = JSON.parse(saved);
        this.currentTutor = this.tutorPersonalities.find(t => t.name === tutorName) || this.tutorPersonalities[0];
      } else {
        // Default to encouraging tutor for new users
        this.currentTutor = this.tutorPersonalities[0];
      }
    } catch (error) {
      this.currentTutor = this.tutorPersonalities[0];
    }
  }

  async changeTutor(tutorName: string): Promise<void> {
    const tutor = this.tutorPersonalities.find(t => t.name === tutorName);
    if (tutor) {
      this.currentTutor = tutor;
      await AsyncStorage.setItem('@preferred_tutor', JSON.stringify(tutorName));
      
      // Reset conversation with new tutor
      this.conversationHistory = [];
      await this.saveConversationHistory();
    }
  }

  getTutorPersonalities(): TutorPersonality[] {
    return [...this.tutorPersonalities];
  }

  getCurrentTutor(): TutorPersonality | null {
    return this.currentTutor;
  }

  // ==================== PERSONALIZED EXPLANATIONS ====================

  async generatePersonalizedExplanation(
    question: string, 
    userAnswer: string, 
    correctAnswer: string
  ): Promise<PersonalizedExplanation> {
    try {
      const userProfile = authService.getCurrentProfile();
      const analytics = await databaseService.getStudyAnalytics(30);
      
      // Create context about the user
      const userContext = this.buildUserContext(userProfile, analytics);
      
      if (this.apiKey) {
        // Use OpenAI for personalized explanation
        return await this.generateAIExplanation(question, userAnswer, correctAnswer, userContext);
      } else {
        // Fallback to template-based explanation
        return this.generateTemplateExplanation(question, userAnswer, correctAnswer);
      }
    } catch (error) {
      console.error('Failed to generate explanation:', error);
      return this.generateTemplateExplanation(question, userAnswer, correctAnswer);
    }
  }

  private buildUserContext(userProfile: any, analytics: any): string {
    const level = userProfile?.level || 1;
    const accuracy = analytics.accuracy || 0;
    const weakAreas = analytics.categoryBreakdown
      .filter((cat: any) => cat.accuracy < 60)
      .map((cat: any) => cat.category);

    return `Usuario nivel ${level}, precisión promedio ${accuracy.toFixed(1)}%, areas débiles: ${weakAreas.join(', ')}`;
  }

  private async generateAIExplanation(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    userContext: string
  ): Promise<PersonalizedExplanation> {
    const prompt = this.buildExplanationPrompt(question, userAnswer, correctAnswer, userContext);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Eres ${this.currentTutor?.name}, un tutor de programación con estilo ${this.currentTutor?.style}. ${this.currentTutor?.explanationStyle}. Responde en español.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';

      return this.parseAIExplanation(aiResponse);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateTemplateExplanation(question, userAnswer, correctAnswer);
    }
  }

  private buildExplanationPrompt(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    userContext: string
  ): string {
    return `
    Contexto del usuario: ${userContext}
    
    Pregunta: ${question}
    Respuesta del usuario: ${userAnswer}
    Respuesta correcta: ${correctAnswer}
    
    Por favor proporciona:
    1. Una explicación personalizada (adaptada al nivel del usuario)
    2. 2-3 ejemplos prácticos
    3. Errores comunes relacionados
    4. 2 preguntas de práctica similares
    5. Temas relacionados para explorar
    
    Formato tu respuesta como JSON:
    {
      "explanation": "explicación detallada",
      "examples": ["ejemplo1", "ejemplo2"],
      "commonMistakes": ["error1", "error2"],
      "practiceQuestions": ["pregunta1", "pregunta2"],
      "relatedTopics": ["tema1", "tema2"],
      "difficulty": "beginner|intermediate|advanced"
    }
    `;
  }

  private parseAIExplanation(aiResponse: string): PersonalizedExplanation {
    try {
      const parsed = JSON.parse(aiResponse);
      return {
        explanation: parsed.explanation || 'Explicación no disponible',
        examples: parsed.examples || [],
        commonMistakes: parsed.commonMistakes || [],
        practiceQuestions: parsed.practiceQuestions || [],
        relatedTopics: parsed.relatedTopics || [],
        difficulty: parsed.difficulty || 'intermediate',
        adaptedToUser: true,
      };
    } catch (error) {
      // If JSON parsing fails, try to extract explanation from text
      return {
        explanation: aiResponse || 'Error al generar explicación',
        examples: [],
        commonMistakes: [],
        practiceQuestions: [],
        relatedTopics: [],
        difficulty: 'intermediate',
        adaptedToUser: true,
      };
    }
  }

  private generateTemplateExplanation(
    question: string,
    userAnswer: string,
    correctAnswer: string
  ): PersonalizedExplanation {
    return {
      explanation: `La respuesta correcta es: ${correctAnswer}. Tu respuesta "${userAnswer}" ${userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) ? 'está en la dirección correcta, pero' : 'no es exacta porque'} necesita más precisión en los detalles técnicos.`,
      examples: [
        'Ejemplo básico de implementación',
        'Caso de uso común en proyectos reales'
      ],
      commonMistakes: [
        'Confundir conceptos similares',
        'No considerar casos edge'
      ],
      practiceQuestions: [
        '¿Puedes dar otro ejemplo de este concepto?',
        '¿En qué situaciones usarías esto?'
      ],
      relatedTopics: [
        'Conceptos fundamentales',
        'Buenas prácticas'
      ],
      difficulty: 'intermediate',
      adaptedToUser: false,
    };
  }

  // ==================== STUDY PATH GENERATION ====================

  async generateStudyPath(
    targetRole: string = 'Full Stack Developer',
    currentLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    timeCommitment: number = 30 // minutes per day
  ): Promise<LearningPath> {
    try {
      const userProfile = authService.getCurrentProfile();
      const analytics = await databaseService.getStudyAnalytics(60);
      
      if (this.apiKey) {
        return await this.generateAIStudyPath(targetRole, currentLevel, timeCommitment, analytics);
      } else {
        return this.generateTemplateStudyPath(targetRole, currentLevel);
      }
    } catch (error) {
      console.error('Failed to generate study path:', error);
      return this.generateTemplateStudyPath(targetRole, currentLevel);
    }
  }

  private async generateAIStudyPath(
    targetRole: string,
    currentLevel: string,
    timeCommitment: number,
    analytics: any
  ): Promise<LearningPath> {
    const prompt = `
    Crea un plan de estudio personalizado para convertirse en ${targetRole}.
    Nivel actual: ${currentLevel}
    Tiempo disponible: ${timeCommitment} minutos diarios
    Áreas actuales de conocimiento: ${analytics.categoryBreakdown.map((c: any) => `${c.category} (${c.accuracy}%)`).join(', ')}
    
    Responde con un JSON con estructura de learning path con temas ordenados por prioridad y dependencias.
    `;

    try {
      const response = await this.makeOpenAIRequest(prompt, 1200);
      return this.parseStudyPath(response);
    } catch (error) {
      return this.generateTemplateStudyPath(targetRole, currentLevel);
    }
  }

  private generateTemplateStudyPath(targetRole: string, currentLevel: string): LearningPath {
    const topics = [
      {
        id: 'js-fundamentals',
        title: 'JavaScript Fundamentals',
        difficulty: 'beginner',
        prerequisites: [],
        estimatedHours: 20,
        completed: false,
      },
      {
        id: 'react-basics',
        title: 'React Fundamentals',
        difficulty: 'intermediate',
        prerequisites: ['js-fundamentals'],
        estimatedHours: 25,
        completed: false,
      },
      {
        id: 'typescript',
        title: 'TypeScript',
        difficulty: 'intermediate',
        prerequisites: ['js-fundamentals'],
        estimatedHours: 15,
        completed: false,
      },
      {
        id: 'node-backend',
        title: 'Node.js & APIs',
        difficulty: 'intermediate',
        prerequisites: ['js-fundamentals'],
        estimatedHours: 30,
        completed: false,
      },
      {
        id: 'databases',
        title: 'Databases & SQL',
        difficulty: 'intermediate',
        prerequisites: [],
        estimatedHours: 20,
        completed: false,
      },
      {
        id: 'system-design',
        title: 'System Design',
        difficulty: 'advanced',
        prerequisites: ['node-backend', 'databases'],
        estimatedHours: 40,
        completed: false,
      },
    ];

    return {
      id: 'fullstack-path',
      title: `Ruta hacia ${targetRole}`,
      description: `Plan de estudio estructurado para convertirte en ${targetRole}, adaptado a tu nivel ${currentLevel}`,
      topics,
      progress: 0,
      estimatedDuration: '3-4 meses',
    };
  }

  private parseStudyPath(aiResponse: string): LearningPath {
    try {
      return JSON.parse(aiResponse);
    } catch (error) {
      return this.generateTemplateStudyPath('Full Stack Developer', 'intermediate');
    }
  }

  // ==================== SMART RECOMMENDATIONS ====================

  async getStudyRecommendations(): Promise<StudyRecommendation[]> {
    try {
      const analytics = await databaseService.getStudyAnalytics(30);
      const userProfile = authService.getCurrentProfile();
      const recommendations: StudyRecommendation[] = [];

      // Analyze weak areas
      const weakAreas = analytics.categoryBreakdown
        .filter((cat: any) => cat.accuracy < 60 && cat.count > 2)
        .sort((a: any, b: any) => a.accuracy - b.accuracy);

      if (weakAreas.length > 0) {
        const weakestArea = weakAreas[0];
        recommendations.push({
          type: 'focus_area',
          title: `Refuerza ${weakestArea.category}`,
          description: `Tu precisión en ${weakestArea.category} es ${weakestArea.accuracy.toFixed(1)}%. Te recomiendo practicar más.`,
          reasoning: 'Área identificada como debilidad basada en performance reciente',
          estimatedTime: 25,
          priority: 'high',
          flashcardsCount: 10,
          category: weakestArea.category,
        });
      }

      // Analyze streak and motivation
      const streak = userProfile?.streak || 0;
      if (streak < 3) {
        recommendations.push({
          type: 'practice_mode',
          title: 'Construye tu racha diaria',
          description: 'Estudia 15 minutos diarios para desarrollar el hábito',
          reasoning: 'La consistencia es clave para el aprendizaje efectivo',
          estimatedTime: 15,
          priority: 'medium',
          flashcardsCount: 5,
        });
      }

      // Review suggestions
      const totalQuestions = analytics.totalQuestions;
      if (totalQuestions > 50) {
        recommendations.push({
          type: 'review',
          title: 'Sesión de repaso',
          description: 'Revisa conceptos que has estudiado para consolidar conocimiento',
          reasoning: 'El repaso espaciado mejora la retención a largo plazo',
          estimatedTime: 20,
          priority: 'medium',
          flashcardsCount: 15,
        });
      }

      // New topic suggestion
      const masteredCategories = analytics.categoryBreakdown
        .filter((cat: any) => cat.accuracy > 85 && cat.count > 5)
        .map((cat: any) => cat.category);

      if (masteredCategories.length > 0) {
        recommendations.push({
          type: 'new_topic',
          title: 'Explora temas avanzados',
          description: 'Has dominado los básicos, es hora de desafiarte con temas más avanzados',
          reasoning: 'Progresión natural basada en tu dominio actual',
          estimatedTime: 30,
          priority: 'low',
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  // ==================== CONVERSATION & CHAT ====================

  private async loadConversationHistory(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('@tutor_conversation');
      if (saved) {
        this.conversationHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  private async saveConversationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('@tutor_conversation', JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  async chatWithTutor(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    try {
      let tutorResponse: string;

      if (this.apiKey) {
        tutorResponse = await this.generateAIChatResponse(userMessage);
      } else {
        tutorResponse = this.generateTemplateChatResponse(userMessage);
      }

      // Add tutor response to history
      this.conversationHistory.push({
        role: 'tutor',
        content: tutorResponse,
        timestamp: new Date(),
      });

      // Keep only last 20 messages
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      await this.saveConversationHistory();
      
      return tutorResponse;
    } catch (error) {
      console.error('Failed to generate tutor response:', error);
      return 'Lo siento, tuve un problema técnico. ¿Puedes repetir tu pregunta?';
    }
  }

  private async generateAIChatResponse(userMessage: string): Promise<string> {
    const context = this.conversationHistory.slice(-6).map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    const systemPrompt = `
    Eres ${this.currentTutor?.name}, un tutor de programación ${this.currentTutor?.style}.
    ${this.currentTutor?.explanationStyle}
    Mantén respuestas concisas pero útiles. Usa emojis ocasionalmente.
    Siempre responde en español.
    `;

    return await this.makeOpenAIRequest(`${context}\nuser: ${userMessage}`, 300, systemPrompt);
  }

  private generateTemplateChatResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hola') || lowerMessage.includes('hello')) {
      const greetings = [
        this.currentTutor?.greeting || '¡Hola! ¿En qué puedo ayudarte hoy?',
        '¡Hey! 👋 ¿Listo para aprender algo nuevo?',
        '¡Hola! Me alegra verte por aquí. ¿Qué vamos a estudiar hoy?'
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    if (lowerMessage.includes('javascript') || lowerMessage.includes('js')) {
      const jsResponses = [
        'JavaScript es increíble! 🚀 Es el lenguaje que hace que la web cobre vida. ¿Hay algo específico de JS que te gustaría aprender?',
        'Ah, JavaScript! El lenguaje que nunca deja de sorprender. ¿Te interesa saber sobre variables, funciones, o tal vez algo más avanzado como closures?',
        'JS es mi favorito para enseñar 😊 Desde lo básico hasta lo más avanzado, hay tanto que explorar. ¿Por dónde empezamos?'
      ];
      return jsResponses[Math.floor(Math.random() * jsResponses.length)];
    }
    
    if (lowerMessage.includes('react')) {
      const reactResponses = [
        'React cambió mi forma de ver el desarrollo frontend! ⚛️ ¿Te interesa aprender sobre componentes, hooks, o el manejo de estado?',
        'React es como construir con LEGO pero para interfaces! 🧱 ¿Qué parte de React te resulta más desafiante?',
        'Me encanta React porque hace que las interfaces sean tan dinámicas. ¿Estás empezando o ya tienes algo de experiencia?'
      ];
      return reactResponses[Math.floor(Math.random() * reactResponses.length)];
    }
    
    if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      const helpResponses = [
        'Claro, estoy aquí para ayudarte! 💪 Puedo explicarte conceptos, revisar código, o ayudarte a planear tu estudio. ¿Qué necesitas?',
        '¡Por supuesto! Soy como tu compañero de estudio virtual. ¿Tienes dudas sobre algún tema en particular?',
        'Perfecto, ese es mi trabajo! 🎯 Dime qué te está costando trabajo y vemos cómo resolverlo juntos.'
      ];
      return helpResponses[Math.floor(Math.random() * helpResponses.length)];
    }
    
    if (lowerMessage.includes('gracias') || lowerMessage.includes('thanks')) {
      const thanksResponses = [
        '¡De nada! 😊 Me encanta ayudar. ¿Hay algo más que quieras aprender?',
        '¡Para eso estoy! 🤗 Recuerda, la práctica hace al maestro. ¿Continuamos?',
        'Un placer ayudarte! 🌟 No dudes en preguntar cuando tengas dudas.'
      ];
      return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('problema')) {
      const errorResponses = [
        'Los errores son parte del proceso! 🐛 Cada bug que resuelves te hace mejor programador. ¿Me muestras qué está pasando?',
        'Ah, el debugging! Una de mis partes favoritas de programar 🔍 ¿Qué síntomas estás viendo?',
        'No te preocupes, todos hemos estado ahí. Los errores nos enseñan más que cuando todo sale perfecto. ¿Qué te dice la consola?'
      ];
      return errorResponses[Math.floor(Math.random() * errorResponses.length)];
    }

    // Respuestas generales más variadas
    const generalResponses = [
      'Esa es una buena pregunta! 🤔 Me gustaría entender mejor tu situación. ¿Puedes contarme más detalles?',
      'Interesante tema! 💡 Para darte la mejor ayuda, ¿me dices en qué contexto surge esta duda?',
      'Me gusta como piensas! 🧠 Para orientarte mejor, ¿estás trabajando en algún proyecto específico?',
      'Perfecto! Ese tipo de curiosidad es lo que hace grandes desarrolladores. ¿Hay algún ejemplo específico que te gustaría que revisemos?',
      'Excelente pregunta! 🎯 Vamos a explorarlo juntos. ¿Te parece si empezamos con los conceptos básicos?'
    ];
    
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  }

  // ==================== UTILITY METHODS ====================

  private async makeOpenAIRequest(prompt: string, maxTokens: number, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.choices?.[0]?.message?.content || '';
  }

  getConversationHistory(): Array<{role: string; content: string; timestamp: Date}> {
    return [...this.conversationHistory];
  }

  async clearConversationHistory(): Promise<void> {
    this.conversationHistory = [];
    await this.saveConversationHistory();
  }

  hasAPIKey(): boolean {
    return this.apiKey !== null;
  }
}

// Singleton instance
export const aiTutorService = new AITutorService();
export default aiTutorService;