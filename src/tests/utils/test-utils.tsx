import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock store for testing
const mockStore = configureStore({
  reducer: {
    // Add your reducers here when you create them
    test: (state = {}, action) => state,
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <Provider store={mockStore}>
      {children}
    </Provider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };

// Mock flashcard data for tests
export const mockFlashcards = [
  {
    id: 1,
    question: 'What is React?',
    answer: 'A JavaScript library for building user interfaces',
    category: 'React',
    difficulty: 'Intermediate' as const,
    tags: ['react', 'frontend'],
    createdAt: new Date('2024-01-01'),
    lastReviewed: new Date('2024-01-01'),
    correctCount: 5,
    totalReviews: 8,
    studyCount: 10,
    easeFactor: 2.5,
    interval: 7,
    dueDate: new Date('2024-01-08'),
  },
  {
    id: 2,
    question: 'What is TypeScript?',
    answer: 'A typed superset of JavaScript that compiles to plain JavaScript',
    category: 'TypeScript',
    difficulty: 'Intermediate' as const,
    tags: ['typescript', 'programming'],
    createdAt: new Date('2024-01-02'),
    lastReviewed: new Date('2024-01-02'),
    correctCount: 3,
    totalReviews: 5,
    studyCount: 6,
    easeFactor: 2.2,
    interval: 3,
    dueDate: new Date('2024-01-05'),
  },
];

// Mock API responses
export const mockApiResponses = {
  whisperTranscription: {
    text: 'This is a mock transcription from Whisper API',
  },
  openaiCompletion: {
    choices: [{
      message: {
        content: 'This is a mock response from OpenAI API',
      },
    }],
  },
  questionGeneration: {
    questions: [
      {
        question: 'What is the difference between let and var in JavaScript?',
        answer: 'let has block scope while var has function scope',
        difficulty: 'Intermediate' as const,
        category: 'JavaScript',
        tags: ['javascript', 'variables'],
      },
    ],
  },
};

// Helper function to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to mock successful API calls
export const mockSuccessfulFetch = (data: any) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

// Helper to mock failed API calls
export const mockFailedFetch = (status = 500, message = 'Internal Server Error') => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
};