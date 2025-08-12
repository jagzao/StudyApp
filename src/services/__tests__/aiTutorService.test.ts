import { aiTutorService } from '../aiTutorService';
import { mockSuccessfulFetch, mockFailedFetch } from '../../tests/utils/test-utils';

// Mock config service
jest.mock('../configService', () => ({
  configService: {
    getOpenAIApiKey: jest.fn(() => Promise.resolve('mock-api-key')),
    hasOpenAIApiKey: jest.fn(() => Promise.resolve(true)),
  }
}));

describe('AI Tutor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(aiTutorService.initialize()).resolves.toBeUndefined();
    });
  });

  describe('chat functionality', () => {
    it('should send a message and receive a response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a helpful response about React hooks.',
          },
        }],
      };

      mockSuccessfulFetch(mockResponse);

      const response = await aiTutorService.sendMessage('Explain React hooks');
      
      expect(response).toBe('This is a helpful response about React hooks.');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFailedFetch(500, 'OpenAI API Error');

      await expect(aiTutorService.sendMessage('Test message')).rejects.toThrow('OpenAI API Error');
    });

    it('should handle empty responses', async () => {
      const mockResponse = {
        choices: [],
      };

      mockSuccessfulFetch(mockResponse);

      const response = await aiTutorService.sendMessage('Test message');
      expect(response).toBe('Lo siento, no pude generar una respuesta. Intenta de nuevo.');
    });
  });

  describe('conversation management', () => {
    it('should maintain conversation context', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Great question about JavaScript!',
          },
        }],
      };

      mockSuccessfulFetch(mockResponse);
      mockSuccessfulFetch(mockResponse);

      await aiTutorService.sendMessage('What is JavaScript?');
      await aiTutorService.sendMessage('Can you give me an example?');

      // Check that both messages were sent with context
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should get conversation history', () => {
      // Clear any previous conversation
      aiTutorService.clearConversation();
      
      const history = aiTutorService.getConversationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear conversation history', () => {
      aiTutorService.clearConversation();
      const history = aiTutorService.getConversationHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('explanation features', () => {
    it('should explain a flashcard answer', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'React is a JavaScript library because...',
          },
        }],
      };

      mockSuccessfulFetch(mockResponse);

      const explanation = await aiTutorService.explainAnswer(
        'What is React?',
        'A JavaScript library for building user interfaces'
      );

      expect(explanation).toBe('React is a JavaScript library because...');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Explica detalladamente'),
        })
      );
    });

    it('should generate follow-up questions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Here are some follow-up questions about React...',
          },
        }],
      };

      mockSuccessfulFetch(mockResponse);

      const followUp = await aiTutorService.generateFollowUpQuestions(
        'React',
        'What is React?'
      );

      expect(followUp).toBe('Here are some follow-up questions about React...');
    });

    it('should provide study tips for a topic', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Here are some tips for studying React effectively...',
          },
        }],
      };

      mockSuccessfulFetch(mockResponse);

      const tips = await aiTutorService.getStudyTips('React', 'Intermediate');

      expect(tips).toBe('Here are some tips for studying React effectively...');
    });
  });

  describe('service availability', () => {
    it('should check if service is available', async () => {
      const isAvailable = await aiTutorService.isServiceAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should return false when API key is missing', async () => {
      // Mock missing API key
      const configService = require('../configService').configService;
      configService.hasOpenAIApiKey.mockResolvedValue(false);

      const isAvailable = await aiTutorService.isServiceAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('personalization', () => {
    it('should adapt responses to user level', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Here is an advanced explanation...',
          },
        }],
      };

      mockSuccessfulFetch(mockResponse);

      const response = await aiTutorService.getPersonalizedResponse(
        'Explain closures',
        'Advanced',
        ['JavaScript', 'Functions']
      );

      expect(response).toBe('Here is an advanced explanation...');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('Advanced'),
        })
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle network timeouts', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      await expect(aiTutorService.sendMessage('Test')).rejects.toThrow('Network timeout');
    });

    it('should handle invalid API responses', async () => {
      mockSuccessfulFetch({ invalid: 'response' });

      const response = await aiTutorService.sendMessage('Test');
      expect(response).toBe('Lo siento, no pude generar una respuesta. Intenta de nuevo.');
    });

    it('should handle rate limiting', async () => {
      mockFailedFetch(429, 'Rate limit exceeded');

      await expect(aiTutorService.sendMessage('Test')).rejects.toThrow('Rate limit exceeded');
    });
  });
});