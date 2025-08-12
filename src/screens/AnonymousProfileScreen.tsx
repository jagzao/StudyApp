import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { anonymousUserService, AnonymousUser } from '../services/anonymousUserService';
import { debugLogger, logUserAction } from '../utils/debugLogger';
import { COLORS } from '../constants/colors';

export default function AnonymousProfileScreen() {
  const [user, setUser] = useState<AnonymousUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Edit form states
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [notifications, setNotifications] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const currentUser = anonymousUserService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        setEditUsername(currentUser.username || '');
        setEditEmail(currentUser.email || '');
        setEditFullName(currentUser.fullName || '');
        setNotifications(currentUser.preferences?.notifications ?? false);
        
        logUserAction('Load Profile', 'AnonymousProfileScreen', {
          hasProfile: !!(currentUser.username || currentUser.email)
        });
      }
    } catch (error) {
      debugLogger.error('Failed to load profile', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const profileData = {
        username: editUsername.trim() || undefined,
        email: editEmail.trim() || undefined,
        fullName: editFullName.trim() || undefined,
        preferences: {
          notifications,
        }
      };

      const result = await anonymousUserService.updateProfile(profileData);
      
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        // Reload user data
        await loadUserProfile();
        setEditModalVisible(false);
        
        Alert.alert(
          '✅ Perfil Actualizado',
          'Tu información ha sido guardada correctamente.'
        );
        
        logUserAction('Save Profile', 'AnonymousProfileScreen', {
          hasUsername: !!profileData.username,
          hasEmail: !!profileData.email,
          hasFullName: !!profileData.fullName
        });
      }
    } catch (error) {
      debugLogger.error('Failed to save profile', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'No se pudo guardar el perfil');
    }
  };

  const calculateProgress = () => {
    if (!user) return { percentage: 0, nextLevelXP: 100 };
    
    const currentLevelXP = anonymousUserService.getXPRequiredForLevel(user.level);
    const nextLevelXP = anonymousUserService.getXPRequiredForLevel(user.level + 1);
    const progressXP = user.xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    const percentage = Math.min((progressXP / requiredXP) * 100, 100);
    
    return { percentage, nextLevelXP: requiredXP - progressXP };
  };

  const renderUserStats = () => {
    if (!user) return null;

    const { percentage, nextLevelXP } = calculateProgress();
    const stats = anonymousUserService.getStats();

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>📊 Tu Progreso</Text>
        
        {/* Level Progress */}
        <View style={styles.levelContainer}>
          <View style={styles.levelHeader}>
            <Text style={styles.levelText}>Nivel {user.level}</Text>
            <Text style={styles.xpText}>{user.xp} XP</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {nextLevelXP > 0 ? `${nextLevelXP} XP para el siguiente nivel` : 'Nivel máximo!'}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.streak}</Text>
            <Text style={styles.statLabel}>🔥 Racha</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.daysSinceFirstUsage}</Text>
            <Text style={styles.statLabel}>📅 Días</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.stats?.flashcardsStudied || 0}</Text>
            <Text style={styles.statLabel}>📚 Estudios</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderProfileData = () => {
    if (!user) return null;

    const hasProfileData = user.username || user.email || user.fullName;

    return (
      <View style={styles.profileContainer}>
        <Text style={styles.sectionTitle}>👤 Información Personal</Text>
        
        {hasProfileData ? (
          <View style={styles.profileData}>
            {user.username && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Nombre de usuario:</Text>
                <Text style={styles.profileValue}>{user.username}</Text>
              </View>
            )}
            {user.email && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Email:</Text>
                <Text style={styles.profileValue}>{user.email}</Text>
              </View>
            )}
            {user.fullName && (
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Nombre completo:</Text>
                <Text style={styles.profileValue}>{user.fullName}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noProfileData}>
            <Text style={styles.noProfileText}>
              📝 No has proporcionado información personal aún
            </Text>
            <Text style={styles.noProfileSubtext}>
              Agregar tu información nos ayuda a personalizar tu experiencia de aprendizaje
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditModalVisible(true)}
        >
          <Text style={styles.editButtonText}>
            {hasProfileData ? '✏️ Editar Perfil' : '➕ Agregar Información'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSessionInfo = () => {
    if (!user) return null;

    const stats = anonymousUserService.getStats();

    return (
      <View style={styles.sessionContainer}>
        <Text style={styles.sectionTitle}>📱 Información de Sesión</Text>
        
        <View style={styles.sessionData}>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>ID de Sesión:</Text>
            <Text style={styles.sessionValue}>{stats.sessionId}</Text>
          </View>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Primer uso:</Text>
            <Text style={styles.sessionValue}>
              {new Date(user.firstUsage).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Última actividad:</Text>
            <Text style={styles.sessionValue}>
              {new Date(user.lastActive).toLocaleString()}
            </Text>
          </View>
          <View style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>Modo:</Text>
            <Text style={styles.sessionValue}>🔓 Uso Anónimo</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>✏️ Editar Perfil</Text>
          <TouchableOpacity onPress={() => setEditModalVisible(false)}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            Esta información es opcional y nos ayuda a personalizar tu experiencia.
            Todos los datos se almacenan localmente en tu dispositivo.
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre de usuario</Text>
            <TextInput
              style={styles.input}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Como quieres que te llamemos..."
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="tu@email.com"
              placeholderTextColor={COLORS.gray}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Tu nombre completo..."
              placeholderTextColor={COLORS.gray}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Notificaciones locales</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: COLORS.gray, true: COLORS.neonBlue }}
              thumbColor={notifications ? COLORS.white : COLORS.lightGray}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>💾 Guardar Cambios</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👤 Mi Perfil</Text>
          <Text style={styles.headerSubtitle}>Modo Anónimo - Sin Registro Requerido</Text>
        </View>

        {renderUserStats()}
        {renderProfileData()}
        {renderSessionInfo()}

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>💡 Acerca del Modo Anónimo</Text>
          <Text style={styles.helpText}>
            • Puedes usar la app sin crear una cuenta{'\n'}
            • Todos tus datos se guardan localmente{'\n'}
            • Tu progreso se mantiene entre sesiones{'\n'}
            • Proporcionar información personal es opcional{'\n'}
            • Puedes usar funciones de respaldo para sincronizar
          </Text>
        </View>
      </ScrollView>
      
      {renderEditModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: COLORS.gray,
    fontSize: 14,
  },
  statsContainer: {
    margin: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
  },
  statsTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  levelContainer: {
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  xpText: {
    color: COLORS.neonBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.darkGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.neonBlue,
  },
  progressText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
  },
  profileContainer: {
    margin: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  profileData: {
    marginBottom: 15,
  },
  profileItem: {
    marginBottom: 10,
  },
  profileLabel: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 2,
  },
  profileValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  noProfileData: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noProfileText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  noProfileSubtext: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  editButton: {
    backgroundColor: COLORS.neonBlue,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  sessionContainer: {
    margin: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
  },
  sessionData: {
    gap: 12,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  sessionValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  helpContainer: {
    margin: 20,
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 20,
  },
  helpTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  helpText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    color: COLORS.gray,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
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
    borderRadius: 8,
    padding: 12,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 20,
  },
  switchLabel: {
    color: COLORS.white,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.neonGreen,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});