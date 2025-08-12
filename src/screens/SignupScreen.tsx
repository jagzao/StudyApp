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
import { COLORS } from '../constants/colors';

interface SignupScreenProps {
  onSignupSuccess: () => void;
  onNavigateToLogin: () => void;
}

export default function SignupScreen({ onSignupSuccess, onNavigateToLogin }: SignupScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    const { fullName, username, email, password, confirmPassword } = formData;

    if (!fullName.trim()) {
      return 'El nombre completo es requerido';
    }

    if (!username.trim()) {
      return 'El nombre de usuario es requerido';
    }

    if (username.length < 3) {
      return 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    if (!email.trim()) {
      return 'El email es requerido';
    }

    if (!isValidEmail(email)) {
      return 'Por favor ingresa un email válido';
    }

    if (!password) {
      return 'La contraseña es requerida';
    }

    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden';
    }

    if (!agreeToTerms) {
      return 'Debes aceptar los términos y condiciones';
    }

    return null;
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error de Validación', validationError);
      return;
    }

    setIsLoading(true);

    try {
      const { fullName, username, email, password } = formData;

      // Try with Supabase first if configured
      let result;
      if (supabaseService.isConfigured()) {
        result = await supabaseService.signUp(email, password, {
          full_name: fullName,
          username: username,
        });
        
        if (result) {
          Alert.alert(
            'Registro Exitoso',
            'Por favor revisa tu email para verificar tu cuenta.',
            [{ text: 'OK', onPress: onSignupSuccess }]
          );
          return;
        }
      }

      // Fallback to local auth service
      result = await authService.signUp(email, password, username, fullName);
      
      if (result.error) {
        Alert.alert('Error de Registro', result.error);
      } else if (result.user) {
        Alert.alert(
          'Registro Exitoso',
          '¡Bienvenido a Study AI! Tu cuenta ha sido creada exitosamente.',
          [{ text: 'Comenzar', onPress: onSignupSuccess }]
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string): { strength: number; text: string; color: string } => {
    if (!password) return { strength: 0, text: '', color: COLORS.gray };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    const texts = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
    const colors = [COLORS.gray, COLORS.neonRed, COLORS.neonRed, COLORS.warning, COLORS.neonBlue, COLORS.neonGreen];
    
    return {
      strength,
      text: texts[strength],
      color: colors[strength]
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🎓 Study AI</Text>
          <Text style={styles.subtitle}>Crear Nueva Cuenta</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre Completo</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholder="Tu nombre completo"
              placeholderTextColor={COLORS.gray}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre de Usuario</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value.toLowerCase())}
              placeholder="nombre_usuario"
              placeholderTextColor={COLORS.gray}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <Text style={styles.inputHint}>Solo letras, números y guiones bajos</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="tu@email.com"
              placeholderTextColor={COLORS.gray}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
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
            {formData.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View 
                    style={[
                      styles.passwordStrengthFill, 
                      { 
                        width: `${(passwordStrength.strength / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder="Repite tu contraseña"
                placeholderTextColor={COLORS.gray}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeButtonText}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            {formData.confirmPassword.length > 0 && (
              <Text style={[
                styles.inputHint, 
                { 
                  color: formData.password === formData.confirmPassword ? COLORS.neonGreen : COLORS.neonRed 
                }
              ]}>
                {formData.password === formData.confirmPassword ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
          >
            <Text style={styles.checkbox}>
              {agreeToTerms ? '☑️' : '◻️'}
            </Text>
            <Text style={styles.checkboxLabel}>
              Acepto los términos y condiciones de uso
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.signupButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Inicia sesión aquí</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>Al registrarte obtienes:</Text>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>☁️</Text>
            <Text style={styles.benefitText}>Sincronización automática entre dispositivos</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>📊</Text>
            <Text style={styles.benefitText}>Historial completo de progreso y estadísticas</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🏆</Text>
            <Text style={styles.benefitText}>Participación en rankings y competencias</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitEmoji}>🎯</Text>
            <Text style={styles.benefitText}>Recomendaciones personalizadas de IA</Text>
          </View>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.gray,
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
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
  },
  inputHint: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
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
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: COLORS.darkGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  checkbox: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  checkboxLabel: {
    color: COLORS.gray,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  signupButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPromptText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.neonBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  benefits: {
    marginTop: 20,
    paddingBottom: 40,
  },
  benefitsTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  benefitEmoji: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  benefitText: {
    color: COLORS.gray,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});