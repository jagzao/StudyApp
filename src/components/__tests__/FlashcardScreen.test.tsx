import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { render, mockFlashcards } from '../../tests/utils/test-utils';
import FlashcardScreen from '../FlashcardScreen';

const mockProps = {
  currentCard: mockFlashcards[0],
  currentIndex: 0,
  totalCards: 2,
  showAnswer: false,
  userAnswer: '',
  showUserAnswer: false,
  answerMode: 'flashcard' as const,
  isListening: false,
  isProcessing: false,
  onStartListening: jest.fn(),
  onStopListening: jest.fn(),
};

describe('FlashcardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flashcard screen correctly', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    expect(getByText('What is React?')).toBeTruthy();
    expect(getByText('1 / 2')).toBeTruthy();
  });

  it('shows answer when answer button is pressed', async () => {
    const { getByText, queryByText } = render(<FlashcardScreen {...mockProps} />);
    
    // Initially answer should not be visible
    expect(queryByText('A JavaScript library for building user interfaces')).toBeFalsy();
    
    // Press the answer button
    const answerButton = getByText('RESPUESTA');
    fireEvent.press(answerButton);
    
    await waitFor(() => {
      expect(queryByText('A JavaScript library for building user interfaces')).toBeTruthy();
    });
  });

  it('displays correct and incorrect buttons when answer is shown', () => {
    const propsWithAnswer = { ...mockProps, showAnswer: true };
    const { getByText } = render(<FlashcardScreen {...propsWithAnswer} />);
    
    expect(getByText('✓ CORRECTO')).toBeTruthy();
    expect(getByText('✗ INCORRECTO')).toBeTruthy();
  });

  it('calls voice recognition functions when voice button is pressed', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    const voiceButton = getByText('🎙️ COMANDO DE VOZ');
    fireEvent.press(voiceButton);
    
    expect(mockProps.onStartListening).toHaveBeenCalled();
  });

  it('shows listening state correctly', () => {
    const listeningProps = { ...mockProps, isListening: true };
    const { getByText } = render(<FlashcardScreen {...listeningProps} />);
    
    expect(getByText('🧠 PROCESANDO...')).toBeTruthy();
  });

  it('displays processing state correctly', () => {
    const processingProps = { ...mockProps, isProcessing: true };
    const { getByText } = render(<FlashcardScreen {...processingProps} />);
    
    expect(getByText('🧠 PROCESANDO...')).toBeTruthy();
  });

  it('renders navigation buttons', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    expect(getByText('⬅️ ANTERIOR')).toBeTruthy();
    expect(getByText('SIGUIENTE ➡️')).toBeTruthy();
  });

  it('shows category and difficulty information', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    expect(getByText('React • Intermediate')).toBeTruthy();
  });

  it('handles empty current card gracefully', () => {
    const emptyProps = { ...mockProps, currentCard: null };
    const { getByText } = render(<FlashcardScreen {...emptyProps} />);
    
    expect(getByText('No hay tarjetas disponibles')).toBeTruthy();
  });

  it('displays correct stats when cards are available', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    // Check if stats are displayed
    expect(getByText('CORRECTAS')).toBeTruthy();
    expect(getByText('RACHA')).toBeTruthy();
    expect(getByText('TOTAL')).toBeTruthy();
  });

  it('renders add new card button', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    expect(getByText('+ NUEVA TARJETA')).toBeTruthy();
  });

  it('renders API key configuration button', () => {
    const { getByText } = render(<FlashcardScreen {...mockProps} />);
    
    expect(getByText('⚙️ CONFIG WHISPER')).toBeTruthy();
  });
});