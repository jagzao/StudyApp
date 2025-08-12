class ResponseEvaluationService {
  constructor() {
    this.apiKey = null;
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  async evaluateResponse(question, correctAnswer, userResponse) {
    if (!this.apiKey) {
      throw new Error('API key no configurada');
    }

    try {
      const prompt = `
Como experto en entrevistas técnicas, evalúa si la respuesta del usuario es correcta o no.

PREGUNTA: ${question}

RESPUESTA CORRECTA: ${correctAnswer}

RESPUESTA DEL USUARIO: ${userResponse}

Evalúa la respuesta considerando:
1. Precisión conceptual
2. Completitud de la información
3. Uso correcto de terminología técnica
4. Ejemplos o casos de uso mencionados

Responde ÚNICAMENTE con un JSON en este formato:
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Breve explicación de por qué es correcta/incorrecta",
  "improvements": "Sugerencias para mejorar (si aplica)"
}
`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto evaluador de respuestas técnicas. Responde siempre en formato JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`Error en la evaluación: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      try {
        const evaluation = JSON.parse(content);
        return evaluation;
      } catch (parseError) {
        console.error('Error parsing JSON response:', content);
        // Fallback: analizar la respuesta con reglas simples
        return this.fallbackEvaluation(question, correctAnswer, userResponse);
      }

    } catch (error) {
      console.error('Error evaluando respuesta:', error);
      // Fallback en caso de error
      return this.fallbackEvaluation(question, correctAnswer, userResponse);
    }
  }

  fallbackEvaluation(question, correctAnswer, userResponse) {
    // Evaluación simple basada en palabras clave
    const correctWords = correctAnswer.toLowerCase().split(' ').filter(word => word.length > 3);
    const userWords = userResponse.toLowerCase().split(' ').filter(word => word.length > 3);
    
    const matchingWords = correctWords.filter(word => 
      userWords.some(userWord => userWord.includes(word) || word.includes(userWord))
    );
    
    const score = Math.round((matchingWords.length / correctWords.length) * 100);
    const isCorrect = score >= 60; // 60% de coincidencia mínima
    
    return {
      isCorrect,
      score,
      feedback: isCorrect 
        ? `Respuesta correcta. Mencionaste conceptos clave como: ${matchingWords.join(', ')}`
        : `Respuesta incompleta. Te faltó mencionar: ${correctWords.filter(w => !matchingWords.includes(w)).slice(0, 3).join(', ')}`,
      improvements: !isCorrect 
        ? 'Intenta incluir más detalles técnicos y conceptos específicos en tu respuesta.'
        : null
    };
  }

  // Evaluación específica para respuestas técnicas comunes
  evaluateTechnicalKeywords(userResponse, expectedKeywords) {
    const response = userResponse.toLowerCase();
    const foundKeywords = expectedKeywords.filter(keyword => 
      response.includes(keyword.toLowerCase())
    );
    
    return {
      foundKeywords,
      score: (foundKeywords.length / expectedKeywords.length) * 100,
      missingKeywords: expectedKeywords.filter(keyword => 
        !response.includes(keyword.toLowerCase())
      )
    };
  }

  // Detectar patrones de respuesta STAR (Situación, Tarea, Acción, Resultado)
  detectSTARPattern(response) {
    const starKeywords = {
      situation: ['situación', 'proyecto', 'problema', 'desafío', 'contexto'],
      task: ['tarea', 'objetivo', 'meta', 'responsabilidad', 'necesidad'],
      action: ['implementé', 'desarrollé', 'creé', 'optimicé', 'realicé', 'utilicé'],
      result: ['resultado', 'logré', 'mejoré', 'reduje', 'aumenté', 'completé']
    };
    
    const response_lower = response.toLowerCase();
    const starComponents = {};
    
    Object.keys(starKeywords).forEach(component => {
      starComponents[component] = starKeywords[component].some(keyword => 
        response_lower.includes(keyword)
      );
    });
    
    const starScore = Object.values(starComponents).filter(Boolean).length;
    
    return {
      components: starComponents,
      score: (starScore / 4) * 100,
      isComplete: starScore >= 3,
      suggestions: this.getSTARSuggestions(starComponents)
    };
  }

  getSTARSuggestions(components) {
    const suggestions = [];
    
    if (!components.situation) {
      suggestions.push('Describe el contexto o situación específica');
    }
    if (!components.task) {
      suggestions.push('Explica cuál era tu objetivo o tarea');
    }
    if (!components.action) {
      suggestions.push('Detalla las acciones específicas que tomaste');
    }
    if (!components.result) {
      suggestions.push('Menciona los resultados o impacto logrado');
    }
    
    return suggestions;
  }
}

export default new ResponseEvaluationService();