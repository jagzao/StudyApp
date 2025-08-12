import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { localAuthService as authService } from '../services/authService.local';
import { debugLogger, logAuthEvent, logUserAction } from '../utils/debugLogger';
import { COLORS } from '../constants/colors';

interface ForgotPasswordScreenProps {
  onNavigateBack: () => void;
  onResetSuccess: () => void;
}

export default function ForgotPasswordScreen({ 
  onNavigateBack, 
  onResetSuccess 
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState<'email' | 'password'>('email');

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      logUserAction('Password Reset Request', 'ForgotPasswordScreen', { email });
      
      // Use local auth service for password reset
      const result = await authService.resetPassword(email);
      
      if (result.error) {
        logAuthEvent('Password Reset Failed', false, result.error);
        Alert.alert('Error', result.error);
      } else {
        logAuthEvent('Password Reset Success', true);
        Alert.alert(
          'Email Enviado',
          'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.',
          [{ text: 'OK', onPress: () => setEmailSent(true) }]
        );
      }
    } catch (error) {
      logAuthEvent('Password Reset Failed - Exception', false, error.message);
      debugLogger.error('Password reset error', { error: error.message, email });
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa ambos campos de contraseña');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      logUserAction('Password Update Request', 'ForgotPasswordScreen');
      
      const result = await authService.updatePassword(newPassword);
      
      if (result.error) {
        logAuthEvent('Password Update Failed', false, result.error);
        Alert.alert('Error', result.error);
      } else {
        logAuthEvent('Password Update Success', true);
        Alert.alert(
          'Contraseña Actualizada',
          'Tu contraseña ha sido actualizada exitosamente.',
          [{ text: 'OK', onPress: onResetSuccess }]
        );
      }
    } catch (error) {
      logAuthEvent('Password Update Failed - Exception', false, error.message);
      debugLogger.error('Password update error', { error: error.message });
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailResetForm = () => (
    <>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🔐</Text>
      </View>

      <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
      <Text style={styles.description}>
        No te preocupes, ingresa tu email y te enviaremos instrucciones para crear una nueva contraseña.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          placeholderTextColor={COLORS.gray}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isLoading}
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleSendResetEmail}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Enviar Instrucciones</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderEmailSentMessage = () => (
    <>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📧</Text>
      </View>

      <Text style={styles.title}>Email Enviado</Text>
      <Text style={styles.description}>
        Hemos enviado instrucciones para restablecer tu contraseña a {email}. 
        Revisa tu bandeja de entrada y sigue los pasos.
      </Text>

      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>💡 Consejos:</Text>
        <Text style={styles.tipText}>• Revisa tu carpeta de spam</Text>
        <Text style={styles.tipText}>• El enlace es válido por 24 horas</Text>
        <Text style={styles.tipText}>• Puedes solicitar un nuevo email si es necesario</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setEmailSent(false)}
      >
        <Text style={styles.primaryButtonText}>Enviar Nuevo Email</Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordResetForm = () => (
    <>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🔑</Text>
      </View>

      <Text style={styles.title}>Nueva Contraseña</Text>
      <Text style={styles.description}>
        Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nueva Contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={COLORS.gray}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeButtonText}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repite la nueva contraseña"
          placeholderTextColor={COLORS.gray}
          secureTextEntry={!showPassword}
          editable={!isLoading}
        />
        {confirmPassword.length > 0 && (
          <Text style={[
            styles.inputHint, 
            { 
              color: newPassword === confirmPassword ? COLORS.neonGreen : COLORS.neonRed 
            }
          ]}>
            {newPassword === confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handlePasswordReset}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Text style={styles.primaryButtonText}>Actualizar Contraseña</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {resetMode === 'password' 
            ? renderPasswordResetForm()
            : emailSent 
              ? renderEmailSentMessage() 
              : renderEmailResetForm()
          }

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onNavigateBack}
          >
            <Text style={styles.secondaryButtonText}>⬅ Volver al Inicio de Sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>¿Necesitas más ayuda?</Text>
          <Text style={styles.helpText}>
            Si tienes problemas para restablecer tu contraseña, puedes:
          </Text>
          
          <View style={styles.helpOptions}>
            <TouchableOpacity style={styles.helpOption}>
              <Text style={styles.helpOptionEmoji}>💬</Text>
              <Text style={styles.helpOptionText}>Contactar Soporte</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.helpOption}>
              <Text style={styles.helpOptionEmoji}>❓</Text>
              <Text style={styles.helpOptionText}>Preguntas Frecuentes</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setResetMode(resetMode === 'email' ? 'password' : 'email')}
          >
            <Text style={styles.debugButtonText}>
              {resetMode === 'email' ? 'Demo: Cambiar Contraseña' : 'Demo: Enviar Email'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 16,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 16,
    padding: 4,
  },
  eyeButtonText: {
    fontSize: 18,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 15,
  },
  secondaryButtonText: {
    color: COLORS.neonBlue,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  tipContainer: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.neonBlue,
  },
  tipTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  tipText: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  helpSection: {
    alignItems: 'center',
  },
  helpTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  helpText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  helpOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  helpOption: {
    alignItems: 'center',
    flex: 1,
    padding: 15,
  },
  helpOptionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  helpOptionText: {
    color: COLORS.neonBlue,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  debugButton: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  debugButtonText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '500',
  },
});