import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { configService } from '../services/configService';

interface APIKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onApiKeySet: (apiKey: string) => void;
  isRequired?: boolean; // If true, user cannot close without setting key
}

export default function APIKeyModal({ 
  visible, 
  onClose, 
  onApiKeySet, 
  isRequired = false 
}: APIKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu API key de OpenAI');
      return;
    }

    // Basic validation
    if (!apiKey.startsWith('sk-')) {
      Alert.alert('Error', 'La API key debe comenzar con "sk-"');
      return;
    }

    try {
      setIsValidating(true);
      
      // Save to config service
      await configService.setOpenAIApiKey(apiKey.trim());
      
      // Notify parent component
      onApiKeySet(apiKey.trim());
      
      Alert.alert(
        '¡Éxito!', 
        'API Key configurada correctamente. Ahora puedes usar todas las funciones de IA.',
        [{ text: 'OK', onPress: onClose }]
      );
      
      setApiKey('');
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('Error', 'No se pudo guardar la API key. Inténtalo de nuevo.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    if (isRequired) {
      Alert.alert(
        'Funcionalidad limitada',
        'Sin API key, algunas funciones estarán limitadas:\n\n• Sin evaluación automática de respuestas\n• Sin generación de preguntas personalizadas\n• Sin comando de voz con IA\n\n¿Continuar sin API key?',
        [
          { text: 'Configurar ahora', style: 'default' },
          { 
            text: 'Continuar sin API key', 
            style: 'destructive',
            onPress: onClose 
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const openOpenAIWebsite = () => {
    Linking.openURL('https://platform.openai.com/api-keys');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={isRequired ? undefined : onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🔑 Configurar API Key</Text>
              <Text style={styles.subtitle}>
                Para usar las funciones de IA necesitas una API key de OpenAI
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>📋 Instrucciones:</Text>
              
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1.</Text>
                <Text style={styles.stepText}>
                  Ve a{' '}
                  <Text style={styles.link} onPress={openOpenAIWebsite}>
                    platform.openai.com/api-keys
                  </Text>
                </Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>2.</Text>
                <Text style={styles.stepText}>Crea una cuenta o inicia sesión</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>3.</Text>
                <Text style={styles.stepText}>Haz clic en "Create new secret key"</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>4.</Text>
                <Text style={styles.stepText}>Copia la API key y pégala abajo</Text>
              </View>
            </View>

            {/* Cost Information */}
            <View style={styles.costContainer}>
              <Text style={styles.costTitle}>💰 Información de costos:</Text>
              <Text style={styles.costText}>
                • Evaluación de respuestas: ~$0.002 por respuesta
              </Text>
              <Text style={styles.costText}>
                • Comando de voz: ~$0.006 por minuto
              </Text>
              <Text style={styles.costText}>
                • Uso típico: $1-5 USD al mes
              </Text>
            </View>

            {/* API Key Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>OpenAI API Key:</Text>
              <TextInput
                style={styles.textInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                placeholderTextColor={COLORS.gray}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.inputHint}>
                Tu API key se guarda de forma segura en tu dispositivo
              </Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>✨ Con API key obtienes:</Text>
              <Text style={styles.benefitText}>• 🤖 Evaluación automática de respuestas</Text>
              <Text style={styles.benefitText}>• 🎯 Feedback detallado y personalizado</Text>
              <Text style={styles.benefitText}>• 🎙️ Comandos de voz avanzados</Text>
              <Text style={styles.benefitText}>• 📝 Generación de preguntas personalizadas</Text>
              <Text style={styles.benefitText}>• 🧠 AI Tutor personalizado</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isValidating}
              >
                <Text style={styles.saveButtonText}>
                  {isValidating ? 'Guardando...' : '✅ Guardar API Key'}
                </Text>
              </TouchableOpacity>

              {!isRequired && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipButtonText}>
                    Usar sin API Key (funcionalidad limitada)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.neonRed,
    width: 20,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: COLORS.neonRed,
    textDecorationLine: 'underline',
  },
  costContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  costText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.gray,
    fontFamily: 'monospace',
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    fontStyle: 'italic',
  },
  benefitsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  skipButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
  },
});