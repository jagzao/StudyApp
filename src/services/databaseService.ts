import * as SQLite from 'expo-sqlite';
import { Flashcard, PlayerData, GameStats, Achievement } from '../types';

// ==================== DATABASE INITIALIZATION ====================

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private readonly currentVersion = 1;
  private readonly dbName = 'studyai.db';

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.checkAndRunMigrations();
      await this.seedInitialData();
      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async checkAndRunMigrations(): Promise<void> {
    if (!this.db) return;

    // Create version table if it doesn't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check current version
    const result = await this.db.getFirstAsync(
      'SELECT version FROM db_version ORDER BY version DESC LIMIT 1'
    ) as { version: number } | null;
    
    const currentDbVersion = result?.version || 0;

    if (currentDbVersion < this.currentVersion) {
      console.log(`🔄 Updating database from version ${currentDbVersion} to ${this.currentVersion}`);
      await this.runMigrations(currentDbVersion);
      
      // Update version
      await this.db.runAsync(
        'INSERT OR REPLACE INTO db_version (version) VALUES (?)',
        [this.currentVersion]
      );
    }
  }

  private async runMigrations(fromVersion: number): Promise<void> {
    // Migration from version 0 to 1
    if (fromVersion < 1) {
      await this.createTables();
    }

    // Future migrations will go here
    // if (fromVersion < 2) { ... }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Flashcards table
      `
      CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT,
        difficulty TEXT DEFAULT 'Beginner',
        tags TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        source TEXT DEFAULT 'user', -- 'user', 'ai', 'predefined'
        times_seen INTEGER DEFAULT 0,
        times_correct INTEGER DEFAULT 0,
        last_seen DATETIME,
        difficulty_score REAL DEFAULT 0.5 -- 0-1 scale
      )
      `,

      // Categories table
      `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
      `,

      // Player stats table
      `
      CREATE TABLE IF NOT EXISTS player_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        current_level_xp INTEGER DEFAULT 0,
        xp_to_next_level INTEGER DEFAULT 1000,
        total_xp INTEGER DEFAULT 0,
        title TEXT DEFAULT 'Novice Developer',
        streak INTEGER DEFAULT 0,
        max_streak INTEGER DEFAULT 0,
        questions_answered INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        voice_commands_used INTEGER DEFAULT 0,
        total_study_time INTEGER DEFAULT 0, -- in seconds
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
      `,

      // Study sessions table
      `
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        questions_answered INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        session_type TEXT DEFAULT 'flashcard', -- 'flashcard', 'interview', 'pitch'
        duration INTEGER DEFAULT 0, -- in seconds
        xp_gained INTEGER DEFAULT 0,
        categories_studied TEXT -- JSON array
      )
      `,

      // Achievements table
      `
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        unlocked BOOLEAN DEFAULT 0,
        unlocked_at DATETIME,
        progress INTEGER DEFAULT 0,
        max_progress INTEGER DEFAULT 1,
        category TEXT DEFAULT 'general'
      )
      `,

      // Question bank table (curated questions)
      `
      CREATE TABLE IF NOT EXISTS question_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        technology TEXT, -- React, JavaScript, Python, etc.
        question_type TEXT DEFAULT 'technical', -- 'technical', 'behavioral', 'system_design'
        source TEXT DEFAULT 'curated',
        quality_score REAL DEFAULT 0.8,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
      `,

      // API usage tracking
      `
      CREATE TABLE IF NOT EXISTS api_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service TEXT NOT NULL, -- 'openai', 'whisper', 'evaluation'
        endpoint TEXT,
        tokens_used INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT 1,
        error_message TEXT
      )
      `
    ];

    for (const tableSQL of tables) {
      await this.db.execAsync(tableSQL);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_flashcards_category ON flashcards(category)',
      'CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty ON flashcards(difficulty)',
      'CREATE INDEX IF NOT EXISTS idx_flashcards_active ON flashcards(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category)',
      'CREATE INDEX IF NOT EXISTS idx_question_bank_technology ON question_bank(technology)',
      'CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(start_time)',
    ];

    for (const indexSQL of indexes) {
      await this.db.execAsync(indexSQL);
    }
  }

  // ==================== FLASHCARDS OPERATIONS ====================

  async getFlashcards(filters?: {
    category?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }): Promise<Flashcard[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = `
      SELECT id, question, answer, category, difficulty, tags, 
             created_at, updated_at, times_seen, times_correct, 
             difficulty_score
      FROM flashcards 
      WHERE is_active = 1
    `;
    const params: any[] = [];

    if (filters?.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters?.difficulty) {
      query += ' AND difficulty = ?';
      params.push(filters.difficulty);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const result = await this.db.getAllAsync(query, params) as any[];
    
    return result.map(row => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      difficulty: row.difficulty,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  async getFlashcard(id: number): Promise<Flashcard | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      `SELECT id, question, answer, category, difficulty, tags, 
              created_at, updated_at, times_seen, times_correct, 
              difficulty_score
       FROM flashcards 
       WHERE id = ? AND is_active = 1`,
      [id]
    ) as any;

    if (!result) return null;

    return {
      id: result.id,
      question: result.question,
      answer: result.answer,
      category: result.category,
      difficulty: result.difficulty,
      tags: result.tags ? JSON.parse(result.tags) : [],
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
    };
  }

  async addFlashcard(flashcard: Omit<Flashcard, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if flashcard already exists
    const existingFlashcard = await this.db.getFirstAsync(
      'SELECT id FROM flashcards WHERE question = ? AND category = ? AND is_active = 1',
      [flashcard.question, flashcard.category || 'General']
    );

    if (existingFlashcard) {
      console.log(`⚠️ Flashcard duplicada omitida: ${flashcard.question.substring(0, 50)}...`);
      return (existingFlashcard as any).id;
    }

    const result = await this.db.runAsync(
      `INSERT INTO flashcards (question, answer, category, difficulty, tags, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        flashcard.question,
        flashcard.answer,
        flashcard.category || 'General',
        flashcard.difficulty || 'Beginner',
        JSON.stringify(flashcard.tags || []),
        'user'
      ]
    );

    console.log(`✅ Nueva flashcard agregada: ${flashcard.question.substring(0, 50)}...`);
    return result.lastInsertRowId;
  }

  async updateFlashcard(id: number, updates: Partial<Flashcard>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.question !== undefined) {
      fields.push('question = ?');
      values.push(updates.question);
    }
    if (updates.answer !== undefined) {
      fields.push('answer = ?');
      values.push(updates.answer);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.difficulty !== undefined) {
      fields.push('difficulty = ?');
      values.push(updates.difficulty);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.db.runAsync(
      `UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteFlashcard(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE flashcards SET is_active = 0 WHERE id = ?',
      [id]
    );
  }


  async addQuestionsToBank(questions: Array<{
    question: string;
    answer: string;
    category: string;
    difficulty: string;
    technology?: string;
    questionType?: string;
    source?: string;
  }>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const insertQuery = `
      INSERT OR IGNORE INTO question_bank 
      (question, answer, category, difficulty, technology, question_type, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    let addedCount = 0;
    let duplicateCount = 0;

    for (const q of questions) {
      // Check if question already exists
      const existingQuestion = await this.db.getFirstAsync(
        'SELECT id FROM question_bank WHERE question = ? AND category = ?',
        [q.question, q.category]
      );

      if (existingQuestion) {
        duplicateCount++;
        console.log(`⚠️ Pregunta duplicada encontrada: ${q.question.substring(0, 50)}...`);
        continue;
      }

      const result = await this.db.runAsync(insertQuery, [
        q.question,
        q.answer,
        q.category,
        q.difficulty,
        q.technology || null,
        q.questionType || 'technical',
        q.source || 'ai'
      ]);

      if (result.lastInsertRowId) {
        addedCount++;
      }
    }

    console.log(`✅ Agregadas ${addedCount} preguntas nuevas, ${duplicateCount} duplicadas omitidas`);
  }

  // ==================== ANALYTICS & STATS ====================

  async recordQuestionAttempt(flashcardId: number, correct: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`
      UPDATE flashcards 
      SET times_seen = times_seen + 1,
          times_correct = times_correct + ${correct ? 1 : 0},
          last_seen = CURRENT_TIMESTAMP,
          difficulty_score = CASE 
            WHEN times_seen = 0 THEN ${correct ? 0.7 : 0.3}
            ELSE (times_correct * 1.0 / times_seen)
          END
      WHERE id = ?
    `, [flashcardId]);
  }

  async getStudyAnalytics(days: number = 30): Promise<{
    totalQuestions: number;
    accuracy: number;
    streakHistory: Array<{ date: string; streak: number }>;
    categoryBreakdown: Array<{ category: string; count: number; accuracy: number }>;
    difficultyProgression: Array<{ difficulty: string; count: number; accuracy: number }>;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const analytics: {
      totalQuestions: number;
      accuracy: number;
      streakHistory: Array<{ date: string; streak: number }>;
      categoryBreakdown: Array<{ category: string; count: number; accuracy: number }>;
      difficultyProgression: Array<{ difficulty: string; count: number; accuracy: number }>;
    } = {
      totalQuestions: 0,
      accuracy: 0,
      streakHistory: [],
      categoryBreakdown: [],
      difficultyProgression: [],
    };

    // Total questions and accuracy
    const totalStats = await this.db.getFirstAsync(`
      SELECT COUNT(*) as total, AVG(times_correct * 1.0 / NULLIF(times_seen, 0)) as accuracy
      FROM flashcards 
      WHERE times_seen > 0 AND last_seen >= datetime('now', '-${days} days')
    `) as any;

    analytics.totalQuestions = totalStats?.total || 0;
    analytics.accuracy = (totalStats?.accuracy || 0) * 100;

    // Category breakdown
    const categoryStats = await this.db.getAllAsync(`
      SELECT category, 
             COUNT(*) as count,
             AVG(times_correct * 1.0 / NULLIF(times_seen, 0)) * 100 as accuracy
      FROM flashcards 
      WHERE times_seen > 0 AND last_seen >= datetime('now', '-${days} days')
      GROUP BY category
      ORDER BY count DESC
    `) as any[];

    analytics.categoryBreakdown = categoryStats.map(row => ({
      category: row.category,
      count: row.count,
      accuracy: row.accuracy || 0
    }));

    return analytics;
  }

  // ==================== INITIAL DATA SEEDING ====================

  private async seedInitialData(): Promise<void> {
    if (!this.db) return;

    // Check if data already exists
    const existingCards = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM flashcards'
    ) as any;

    if (existingCards.count > 0) return;

    // Seed categories
    const categories = [
      { name: 'JavaScript', description: 'Core JavaScript concepts', icon: '🟨', color: '#F7DF1E' },
      { name: 'React', description: 'React framework and ecosystem', icon: '⚛️', color: '#61DAFB' },
      { name: 'React Native', description: 'Mobile development with React Native', icon: '📱', color: '#61DAFB' },
      { name: 'TypeScript', description: 'TypeScript language features', icon: '🔷', color: '#3178C6' },
      { name: 'Node.js', description: 'Server-side JavaScript', icon: '🟢', color: '#339933' },
      { name: 'Database', description: 'SQL and NoSQL databases', icon: '🗄️', color: '#336791' },
      { name: 'System Design', description: 'Architecture and scalability', icon: '🏗️', color: '#FF6B6B' },
      { name: 'Algorithms', description: 'Data structures and algorithms', icon: '🧮', color: '#4ECDC4' },
    ];

    for (const category of categories) {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO categories (name, description, icon, color) VALUES (?, ?, ?, ?)',
        [category.name, category.description, category.icon, category.color]
      );
    }

    // Seed comprehensive question bank
    const questionBank = [
      // JavaScript Fundamentals
      {
        question: "¿Qué es el hoisting en JavaScript?",
        answer: "Hoisting es el comportamiento de JavaScript donde las declaraciones de variables y funciones se 'elevan' al inicio de su scope. Las variables declaradas con var se inicializan con undefined, mientras que let y const permanecen en una 'temporal dead zone' hasta su declaración.",
        category: "JavaScript",
        difficulty: "Intermediate",
        technology: "JavaScript",
        questionType: "technical"
      },
      {
        question: "Explica la diferencia entre '==' y '===' en JavaScript",
        answer: "'==' realiza coerción de tipos antes de comparar, mientras que '===' compara tanto valor como tipo sin coerción. Ejemplo: '5' == 5 es true, pero '5' === 5 es false.",
        category: "JavaScript",
        difficulty: "Beginner",
        technology: "JavaScript",
        questionType: "technical"
      },
      {
        question: "¿Qué son las closures en JavaScript?",
        answer: "Una closure es la combinación de una función y el ambiente léxico donde fue declarada. Permite que una función acceda a variables de su scope exterior incluso después de que la función exterior haya terminado su ejecución.",
        category: "JavaScript",
        difficulty: "Advanced",
        technology: "JavaScript",
        questionType: "technical"
      },

      // React
      {
        question: "¿Qué son los React Hooks y por qué son útiles?",
        answer: "Los Hooks son funciones que permiten usar estado y otras características de React en componentes funcionales. Permiten reutilizar lógica con estado entre componentes, hacer el código más legible y evitar los problemas de los componentes de clase.",
        category: "React",
        difficulty: "Intermediate",
        technology: "React",
        questionType: "technical"
      },
      {
        question: "Explica el Virtual DOM y sus beneficios",
        answer: "El Virtual DOM es una representación en memoria del DOM real. React lo usa para optimizar las actualizaciones: compara el Virtual DOM anterior con el nuevo (diffing), calcula los cambios mínimos necesarios y actualiza solo las partes que cambiaron en el DOM real.",
        category: "React",
        difficulty: "Intermediate",
        technology: "React",
        questionType: "technical"
      },

      // TypeScript
      {
        question: "¿Cuáles son los beneficios principales de TypeScript?",
        answer: "1. Type safety en tiempo de compilación, 2. Mejor IntelliSense y autocompletado, 3. Refactoring más seguro, 4. Documentación automática del código, 5. Detección temprana de errores, 6. Mejor mantenibilidad en proyectos grandes.",
        category: "TypeScript",
        difficulty: "Beginner",
        technology: "TypeScript",
        questionType: "technical"
      },

      // System Design
      {
        question: "¿Cómo diseñarías un sistema de chat en tiempo real?",
        answer: "1. WebSockets para comunicación bidireccional, 2. Message queue (Redis/RabbitMQ) para escalabilidad, 3. Base de datos para persistencia (MongoDB para mensajes, PostgreSQL para usuarios), 4. Load balancer, 5. CDN para media files, 6. Microservicios para diferentes funcionalidades.",
        category: "System Design",
        difficulty: "Advanced",
        technology: "Architecture",
        questionType: "system_design"
      },

      // Node.js and Backend
      {
        question: "¿Cómo optimizarías una aplicación Node.js que maneja miles de requests concurrentes?",
        answer: "1. Usar clustering para aprovechar múltiples cores, 2. Implementar connection pooling para bases de datos, 3. Usar caching (Redis), 4. Optimizar queries de BD, 5. Implementar rate limiting, 6. Usar load balancers, 7. Monitorear memory leaks con herramientas como clinic.js.",
        category: "Node.js",
        difficulty: "Advanced",
        technology: "Node.js",
        questionType: "technical"
      },
      {
        question: "Explica el Event Loop de Node.js y cómo evitar bloquearlo",
        answer: "El Event Loop es single-threaded y maneja callbacks, promises y async operations. Para evitar bloquearlo: 1. No usar operaciones síncronas pesadas, 2. Usar Worker Threads para CPU-intensive tasks, 3. Optimizar algoritmos O(n²), 4. Usar streaming para archivos grandes, 5. Implementar backpressure en streams.",
        category: "Node.js", 
        difficulty: "Advanced",
        technology: "Node.js",
        questionType: "technical"
      },

      // System Design - Senior Level
      {
        question: "Diseña un sistema de notificaciones push que maneje 100M de usuarios",
        answer: "1. Message Queue (Apache Kafka) para alta throughput, 2. Microservicios: User Service, Notification Service, Delivery Service, 3. Database sharding por user_id, 4. CDN para template caching, 5. WebSocket connections con load balancing, 6. Retry mechanism con exponential backoff, 7. Analytics service para tracking, 8. Rate limiting por usuario.",
        category: "System Design",
        difficulty: "Advanced", 
        technology: "Architecture",
        questionType: "system_design"
      },
      {
        question: "¿Cómo implementarías un sistema de cache distribuido con consistencia eventual?",
        answer: "1. Redis Cluster con sharding automático, 2. Consistent hashing para distribución, 3. Write-through strategy para writes críticos, 4. TTL inteligente basado en patterns de acceso, 5. Cache invalidation pub/sub, 6. Monitoring con métricas de hit/miss ratio, 7. Fallback a BD si cache falla, 8. Anti-patterns: evitar cache stampede.",
        category: "System Design",
        difficulty: "Advanced",
        technology: "Caching",
        questionType: "system_design"
      },

      // Leadership & Senior Behavioral
      {
        question: "Como Senior, ¿cómo manejarías un conflicto técnico en el equipo sobre arquitectura?",
        answer: "1. Organizar tech review meeting con stakeholders, 2. Cada parte presenta pros/cons con datos, 3. Evaluar trade-offs: performance, maintainability, cost, timeline, 4. Crear POCs si es necesario, 5. Tomar decisión basada en business requirements, 6. Documentar la decisión y rationale, 7. Asegurar buy-in del equipo y seguimiento.",
        category: "Leadership",
        difficulty: "Advanced",
        technology: "Soft Skills",
        questionType: "behavioral"
      },
      {
        question: "Describe cómo harías code review a un junior developer",
        answer: "1. Enfoque constructivo y educativo, 2. Revisar: funcionalidad, edge cases, performance, security, 3. Sugerir mejores prácticas con ejemplos, 4. Explicar el 'por qué' detrás de cada sugerencia, 5. Destacar lo que está bien hecho, 6. Pair programming para conceptos complejos, 7. Documentar patterns comunes del equipo.",
        category: "Leadership",
        difficulty: "Advanced", 
        technology: "Mentoring",
        questionType: "behavioral"
      },

      // Advanced React
      {
        question: "¿Cómo optimizarías el rendering de una lista de 10,000 elementos en React?",
        answer: "1. React.memo() para evitar re-renders innecesarios, 2. Virtualización con react-window o react-virtualized, 3. useMemo() para cálculos costosos, 4. useCallback() para funciones estables, 5. Lazy loading con Intersection Observer, 6. Pagination o infinite scroll, 7. Optimistic updates para mejor UX.",
        category: "React",
        difficulty: "Advanced",
        technology: "React", 
        questionType: "technical"
      },

      // Security - Senior Level
      {
        question: "¿Cómo implementarías autenticación y autorización segura en una aplicación enterprise?",
        answer: "1. OAuth 2.0 + OpenID Connect con JWT, 2. Multi-factor authentication, 3. Role-based access control (RBAC), 4. Token rotation automática, 5. Rate limiting en endpoints auth, 6. Audit logging de accesos, 7. HTTPS everywhere con HSTS, 8. Content Security Policy headers, 9. Input validation y sanitization, 10. Regular security audits.",
        category: "Security",
        difficulty: "Advanced",
        technology: "Security",
        questionType: "technical"
      },

      // Behavioral - General
      {
        question: "Cuéntame sobre un proyecto desafiante que hayas completado",
        answer: "Usa el método STAR: Situación (contexto del proyecto), Tarea (tu responsabilidad), Acción (pasos específicos que tomaste), Resultado (impacto cuantificable). Enfócate en desafíos técnicos específicos y cómo los resolviste.",
        category: "Behavioral",
        difficulty: "Intermediate",
        technology: "Soft Skills",
        questionType: "behavioral"
      }
    ];

    for (const q of questionBank) {
      await this.db.runAsync(`
        INSERT INTO question_bank 
        (question, answer, category, difficulty, technology, question_type, source, quality_score)
        VALUES (?, ?, ?, ?, ?, ?, 'curated', 0.9)
      `, [q.question, q.answer, q.category, q.difficulty, q.technology, q.questionType]);
    }

    // Convert question bank to flashcards for immediate use
    for (const q of questionBank) {
      await this.db.runAsync(`
        INSERT INTO flashcards 
        (question, answer, category, difficulty, tags, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [q.question, q.answer, q.category, q.difficulty, JSON.stringify([q.technology])]);
    }

    // Initialize player stats
    await this.db.runAsync(`
      INSERT INTO player_stats (level, xp, title) 
      VALUES (1, 0, 'Novice Developer')
    `);

    console.log('✅ Initial data seeded successfully');
  }

  // ==================== QUESTION BANK METHODS ====================

  async getQuestionsFromBank(criteria: {
    category?: string;
    difficulty?: string;
    technology?: string;
    questionType?: string;
    limit?: number;
  }): Promise<Flashcard[]> {
    if (!this.db) return [];

    try {
      const { category, difficulty, technology, questionType, limit = 10 } = criteria;
      
      let query = 'SELECT * FROM question_bank WHERE is_active = 1';
      const params: any[] = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (difficulty) {
        query += ' AND difficulty = ?';
        params.push(difficulty);
      }

      if (technology) {
        query += ' AND technology = ?';
        params.push(technology);
      }

      if (questionType) {
        query += ' AND question_type = ?';
        params.push(questionType);
      }

      query += ' ORDER BY quality_score DESC, RANDOM() LIMIT ?';
      params.push(limit);

      const rows = await this.db.getAllAsync(query, params) as any[];

      return rows.map(row => ({
        id: row.id,
        question: row.question,
        answer: row.answer,
        category: row.category,
        difficulty: row.difficulty as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
        tags: [row.technology],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error getting questions from bank:', error);
      return [];
    }
  }

  async addQuestionToBank(questionData: {
    question: string;
    answer: string;
    category: string;
    difficulty: string;
    technology: string;
    questionType?: string;
    qualityScore?: number;
  }): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const {
      question,
      answer,
      category,
      difficulty,
      technology,
      questionType = 'technical',
      qualityScore = 0.8
    } = questionData;

    const result = await this.db.runAsync(
      `INSERT INTO question_bank 
       (question, answer, category, difficulty, technology, question_type, quality_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [question, answer, category, difficulty, technology, questionType, qualityScore]
    );

    return result.lastInsertRowId as number;
  }

  // ==================== UTILITY METHODS ====================

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // For development/debugging
  async resetDatabase(): Promise<void> {
    if (!this.db) return;

    const tables = [
      'flashcards', 'categories', 'player_stats', 
      'study_sessions', 'achievements', 'question_bank', 'api_usage'
    ];

    for (const table of tables) {
      await this.db.execAsync(`DROP TABLE IF EXISTS ${table}`);
    }

    await this.createTables();
    await this.seedInitialData();
    console.log('🔄 Database reset completed');
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
export default databaseService;