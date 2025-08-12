import whisperService from './whisperService';

class InterviewService {
  constructor() {
    this.openaiApiKey = whisperService.apiKey;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    
    // Perfil base de Juan extraído del CV
    this.candidateProfile = {
      experience: "10+ years",
      seniority: "Senior Fullstack Developer",
      skills: {
        frontend: ["React", "Angular", "Vue", "TypeScript", "JavaScript", "Redux", "Next.js"],
        backend: ["C#", "ASP.NET Core", ".NET 6/7/8", "Web APIs", "Microservices", "Azure Functions", "SignalR"],
        database: ["SQL Server", "PostgreSQL", "SQLite", "Entity Framework", "Dapper"],
        cloud: ["Azure DevOps", "Azure Storage", "Key Vault", "CI/CD"],
        architecture: ["CQRS", "SOLID", "Dependency Injection", "Event-Driven Architecture", "Clean Architecture"],
        patterns: ["MVC", "MVVM", "Factory", "Singleton", "Repository", "Observer"],
        testing: ["xUnit", "NUnit", "Moq", "Jest", "Selenium"],
        security: ["OAuth2", "OpenID Connect", "JWT", "Active Directory"]
      },
      recentProjects: [
        "ContpaqiNube with .NET 8, CQRS, Azure Functions",
        "Chevron OPS TOOLBELT with React, .NET Core, Azure",
        "Bankingly security enhancements with 2FA"
      ]
    };
  }

  async generateQuestionsFromJobDescription(jobDescription) {
    try {
      if (!this.openaiApiKey || this.openaiApiKey === 'TU_API_KEY_AQUI') {
        // Fallback a preguntas predefinidas
        return this.getFallbackQuestions();
      }

      const prompt = this.createPrompt(jobDescription);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto entrevistador técnico. Genera preguntas específicas y desafiantes para un desarrollador senior basadas en el job description y perfil del candidato.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Error de OpenAI: ${response.statusText}`);
      }

      const result = await response.json();
      const questionsText = result.choices[0].message.content;
      
      return this.parseQuestionsFromText(questionsText);
      
    } catch (error) {
      console.error('Error generando preguntas:', error);
      return this.getFallbackQuestions();
    }
  }

  createPrompt(jobDescription) {
    return `
PERFIL DEL CANDIDATO:
- Juan Zambrano - Senior Fullstack Developer con 10+ años de experiencia
- Stack principal: .NET Core, React/Angular/Vue, SQL Server, Azure
- Experiencia reciente: ContpaqiNube (.NET 8, CQRS), Chevron (React, Azure), Bankingly (2FA, Security)
- Arquitecturas: Clean Architecture, CQRS, Microservices, Event-Driven
- Patrones: MVC, MVVM, Repository, Factory, Singleton
- Testing: xUnit, NUnit, Moq, Jest
- Cloud: Azure (Functions, Storage, DevOps, Key Vault)
- Security: OAuth2, JWT, Active Directory

JOB DESCRIPTION:
${jobDescription}

INSTRUCCIONES:
Genera 10-15 preguntas técnicas específicas para esta posición que:
1. Evalúen competencias técnicas relevantes al job description
2. Sean apropiadas para un desarrollador SENIOR (no básicas)
3. Incluyan preguntas de arquitectura, design patterns, y best practices
4. Tengan respuestas detalladas que demuestren expertise
5. Cubran tanto aspectos técnicos como de liderazgo/mentoring

Formato requerido:
Q: [Pregunta técnica específica]
A: [Respuesta detallada que un senior debería dar]

Q: [Segunda pregunta]
A: [Segunda respuesta]
...

IMPORTANTE: Las preguntas deben ser desafiantes y específicas al stack technology mencionado en el job description.
`;
  }

  parseQuestionsFromText(text) {
    const questions = [];
    const sections = text.split(/Q:|Q\d+:/).filter(section => section.trim());
    
    sections.forEach(section => {
      const parts = section.split(/A:|A\d+:/).map(part => part.trim());
      if (parts.length >= 2) {
        const question = parts[0].trim();
        const answer = parts[1].trim();
        
        if (question && answer) {
          questions.push({
            id: Date.now() + Math.random(),
            question: question,
            answer: answer,
            category: 'AI Generated',
            difficulty: 'Senior'
          });
        }
      }
    });

    return questions.length > 0 ? questions : this.getFallbackQuestions();
  }

  getFallbackQuestions() {
    return [
      {
        id: 1,
        question: "Explica cómo implementarías CQRS en una aplicación .NET Core. ¿Cuáles son los trade-offs?",
        answer: "CQRS separa comandos (escritura) de queries (lectura). Implementaría usando MediatR con CommandHandlers para operaciones de escritura y QueryHandlers para lectura. Commands modifican estado y pueden usar EventSourcing. Queries optimizadas para lectura, posiblemente con read models desnormalizados. Trade-offs: mayor complejidad vs mejor escalabilidad, separación de responsabilidades y optimización independiente de lectura/escritura.",
        category: "Architecture",
        difficulty: "Senior"
      },
      {
        id: 2,
        question: "¿Cómo manejas la autenticación y autorización en microservices con .NET Core?",
        answer: "Uso JWT tokens con Claims-based authorization. Auth service centralizado que emite tokens, otros servicios validan usando middleware JwtBearer. Para comunicación entre services: service-to-service authentication con client credentials flow. Implemento custom authorization policies, uso scopes para granular permissions. Considero API Gateway para centralized auth, y refresh tokens para security. Azure AD o IdentityServer4 para gestión de identidades.",
        category: "Security",
        difficulty: "Senior"
      },
      {
        id: 3,
        question: "Describe tu approach para manejar performance en aplicaciones React con grandes datasets.",
        answer: "Implemento virtualización con react-window para listas grandes, uso React.memo para evitar re-renders innecesarios, aplicó useMemo/useCallback para expensive calculations. Code splitting con lazy loading y Suspense. State management eficiente con Zustand o Redux Toolkit. Paginación server-side, debouncing en búsquedas, optimistic updates. Monitoring con React DevTools Profiler, Web Vitals metrics, bundle analysis con webpack-bundle-analyzer.",
        category: "Frontend Performance",
        difficulty: "Senior"
      },
      {
        id: 4,
        question: "¿Cómo diseñas y implementas una arquitectura de microservices escalable en Azure?",
        answer: "Diseño domain-driven con bounded contexts. Azure Service Fabric o AKS para orchestration. API Gateway (Azure API Management) para routing y rate limiting. Event-driven communication con Service Bus o Event Grid. Database per service pattern, Azure SQL/CosmosDB según needs. Monitoring con Application Insights, Distributed tracing. CI/CD con Azure DevOps, containerización con Docker. Circuit breaker pattern, retry policies, health checks. Auto-scaling basado en metrics.",
        category: "Cloud Architecture",
        difficulty: "Senior"
      },
      {
        id: 5,
        question: "Explica cómo implementas Clean Architecture en .NET Core y sus beneficios.",
        answer: "Organizo en capas: Domain (entities, value objects), Application (use cases, interfaces), Infrastructure (repositories, external services), Presentation (controllers, UI). Dependency Inversion: Application depende de abstracciones, Infrastructure implementa interfaces. Uso MediatR para use cases, FluentValidation para validation, AutoMapper para mapping. Beneficios: testabilidad, independence de frameworks, separation of concerns, maintainability. Domain logic aislado, fácil unit testing, flexible para cambios de tecnología.",
        category: "Software Architecture",
        difficulty: "Senior"
      },
      {
        id: 6,
        question: "¿Cómo optimizas queries de Entity Framework en aplicaciones enterprise?",
        answer: "Uso Include() para eager loading específico, evito N+1 queries. Split queries para collections múltiples. Proyecciones con Select() para campos específicos. Compiled queries para queries repetitivas. AsNoTracking() para read-only scenarios. Database indexing estratégico. Query filters para soft deletes. Paginación con Skip/Take. Monitoring con MiniProfiler, analizo execution plans. Considero Dapper para complex queries de alta performance. Connection pooling y proper disposal patterns.",
        category: "Database Optimization",
        difficulty: "Senior"
      },
      {
        id: 7,
        question: "Describe tu estrategia para implementar CI/CD en una aplicación fullstack con Azure DevOps.",
        answer: "Pipeline multi-stage: Build (compile, test, analyze), Package (Docker images), Deploy (dev/staging/prod). Feature branches con PR policies, code review required. Unit tests con coverage gates, integration tests en test environment. Infrastructure as Code con ARM templates o Terraform. Blue-green deployments para zero downtime. Automated rollback strategies. Security scanning (SAST/DAST), dependency vulnerability checks. Release gates con manual approvals para production. Monitoring post-deployment con health checks.",
        category: "DevOps",
        difficulty: "Senior"
      },
      {
        id: 8,
        question: "¿Cómo manejas state management en aplicaciones React complejas?",
        answer: "Para apps pequeñas: Context API + useReducer. Apps medianas: Zustand por simplicity. Apps enterprise: Redux Toolkit con RTK Query para server state. Separó client state (UI) de server state (cache). Uso React Query/TanStack Query para server state management, caching, optimistic updates. Normalizo data structures, evito prop drilling. Custom hooks para logic encapsulation. Persist state con localStorage/sessionStorage cuando needed. Performance: selector patterns, memoization.",
        category: "Frontend State Management",
        difficulty: "Senior"
      },
      {
        id: 9,
        question: "Explica cómo implementas observabilidad en microservices distribuidos.",
        answer: "Three pillars: Logs, Metrics, Traces. Structured logging con Serilog, correlation IDs para request tracking. Distributed tracing con OpenTelemetry/Jaeger. Metrics con Prometheus + Grafana o Azure Monitor. Health checks endpoints (/health), readiness/liveness probes. APM tools (Application Insights, New Relic). Log aggregation con ELK stack. Alerting basado en SLOs/SLIs. Dashboard unified view. Error tracking con tools like Sentry. Performance monitoring, latency percentiles.",
        category: "Observability",
        difficulty: "Senior"
      },
      {
        id: 10,
        question: "¿Cuál es tu approach para code reviews y mentoring de developers junior?",
        answer: "Code reviews: Focus en architecture, performance, security, maintainability antes que style. Uso automated tools (linters, formatters) para consistency. Comments constructivos con suggestions y explanations. Check for SOLID principles, proper error handling, test coverage. Mentoring: Pair programming sessions, gradual responsibility increase. Explain 'why' behind decisions, share resources. Set clear expectations and growth paths. Regular 1:1s para feedback. Encourage questions, create safe learning environment. Knowledge sharing sessions, code kata exercises.",
        category: "Leadership & Mentoring",
        difficulty: "Senior"
      }
    ];
  }

  // Obtener preguntas específicas por tecnología
  getQuestionsByTechnology(technology) {
    const techQuestions = {
      '.NET': this.getDotNetQuestions(),
      'React': this.getReactQuestions(),
      'Azure': this.getAzureQuestions(),
      'Microservices': this.getMicroservicesQuestions(),
      'Architecture': this.getArchitectureQuestions()
    };

    return techQuestions[technology] || this.getFallbackQuestions();
  }

  getDotNetQuestions() {
    return [
      {
        id: 'dotnet1',
        question: "¿Cómo implementas Dependency Injection en .NET Core y cuáles son los diferentes lifetimes?",
        answer: "En .NET Core uso el built-in DI container. Tres lifetimes principales: Singleton (una instancia para toda la app), Scoped (una por request HTTP), Transient (nueva instancia cada vez). Registro services en Program.cs con AddSingleton<T>(), AddScoped<T>(), AddTransient<T>(). Para scenarios complejos uso factories o third-party containers como Autofac. Evito captive dependencies (scoped/transient en singleton).",
        category: ".NET Core",
        difficulty: "Senior"
      }
    ];
  }

  getReactQuestions() {
    return [
      {
        id: 'react1',
        question: "Explica el concepto de Reconciliation en React y cómo optimizarlo.",
        answer: "Reconciliation es el algoritmo que React usa para determinar qué cambios hacer en el DOM. Compara Virtual DOM trees (previous vs current) usando diffing algorithm. Optimizaciones: usar keys estables en listas, React.memo para componentes, useMemo/useCallback para expensive operations, PureComponent en class components. React Fiber permite interruptible rendering para mejor UX.",
        category: "React Advanced",
        difficulty: "Senior"
      }
    ];
  }

  getAzureQuestions() {
    return [
      {
        id: 'azure1',
        question: "¿Cómo diseñas una solución serverless en Azure para alta disponibilidad?",
        answer: "Uso Azure Functions con App Service Plan o Consumption Plan según requirements. Implemento circuit breaker con Polly, retry policies, dead letter queues. Multi-region deployment con Traffic Manager. Azure Storage redundancy (GRS/RA-GRS). Service Bus premium tier para guaranteed message delivery. Application Insights para monitoring. Durable Functions para complex workflows. Event Grid para event-driven architecture.",
        category: "Azure",
        difficulty: "Senior"
      }
    ];
  }

  getMicroservicesQuestions() {
    return [
      {
        id: 'micro1',
        question: "¿Cómo manejas data consistency en microservices?",
        answer: "Uso Saga pattern para distributed transactions: Choreography (event-driven) u Orchestration (centralized coordinator). Eventually consistent approach con compensating actions. Event sourcing para audit trail. Outbox pattern para reliable event publishing. Database per service, evito distributed transactions. Implement idempotency for retry scenarios. Use correlation IDs for tracking. Consider CQRS for read/write separation.",
        category: "Microservices",
        difficulty: "Senior"
      }
    ];
  }

  getArchitectureQuestions() {
    return [
      {
        id: 'arch1',
        question: "Describe un scenario donde aplicarías Event-Driven Architecture.",
        answer: "Ideal para systems with high scalability needs, loose coupling requirements. Ejemplo: e-commerce platform donde order placement trigger events para inventory, payment, shipping, notifications. Benefits: decoupling, scalability, resilience. Challenges: eventual consistency, debugging complexity, event versioning. Use message brokers (RabbitMQ, Azure Service Bus), implement event schemas, handle failures with dead letter queues.",
        category: "Architecture",
        difficulty: "Senior"
      }
    ];
  }
}

export default new InterviewService();