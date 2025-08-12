import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { configService } from '../services/configService';
import APIKeyModal from './APIKeyModal';
import DebugPanel from './DebugPanel';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export default function HamburgerMenu({ 
  visible, 
  onClose, 
  onNavigate 
}: HamburgerMenuProps) {
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);

  const handleNavigate = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  const showAPIKeyModal = () => {
    setApiKeyModalVisible(true);
    onClose();
  };

  const handleAPIKeySet = (apiKey: string) => {
    setApiKeyModalVisible(false);
    Alert.alert(
      '¡API Key Configurada!',
      'Ya puedes usar todas las funciones de IA de la aplicación.',
    );
  };

  const clearAPIKey = async () => {
    Alert.alert(
      'Eliminar API Key',
      '¿Estás seguro de que quieres eliminar tu API key? Esto deshabilitará las funciones de IA.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await configService.clearOpenAIApiKey();
              Alert.alert('API Key eliminada', 'Las funciones de IA han sido deshabilitadas.');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la API key.');
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.menuContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>⚙️ Menú</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Main Navigation */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📚 Estudiar</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('study')}
                >
                  <Text style={styles.menuItemIcon}>🎯</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Flashcards</Text>
                    <Text style={styles.menuItemSubtitle}>Estudia con tarjetas interactivas</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('tutor')}
                >
                  <Text style={styles.menuItemIcon}>🤖</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>AI Tutor</Text>
                    <Text style={styles.menuItemSubtitle}>Chatea con tu tutor personal</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('resources')}
                >
                  <Text style={styles.menuItemIcon}>📚</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Recursos Multimedia</Text>
                    <Text style={styles.menuItemSubtitle}>Videos, GIFs e imágenes educativas</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Interview Prep */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💼 Entrevistas</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('interview')}
                >
                  <Text style={styles.menuItemIcon}>🎯</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Prep Entrevistas</Text>
                    <Text style={styles.menuItemSubtitle}>Práctica para entrevistas técnicas</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('senior')}
                >
                  <Text style={styles.menuItemIcon}>🚀</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Senior Prep</Text>
                    <Text style={styles.menuItemSubtitle}>Entrevistas nivel senior</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Progress & Social */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Progreso</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('profile')}
                >
                  <Text style={styles.menuItemIcon}>👤</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Mi Perfil</Text>
                    <Text style={styles.menuItemSubtitle}>Estadísticas y configuración</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('analytics')}
                >
                  <Text style={styles.menuItemIcon}>📊</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Analytics</Text>
                    <Text style={styles.menuItemSubtitle}>Dashboard avanzado de progreso</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('achievements')}
                >
                  <Text style={styles.menuItemIcon}>🏆</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Logros</Text>
                    <Text style={styles.menuItemSubtitle}>Desbloquea achievements</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('leaderboard')}
                >
                  <Text style={styles.menuItemIcon}>📈</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Ranking</Text>
                    <Text style={styles.menuItemSubtitle}>Compite con otros usuarios</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Account */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👤 Cuenta</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('auth')}
                >
                  <Text style={styles.menuItemIcon}>🔐</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Iniciar Sesión / Registro</Text>
                    <Text style={styles.menuItemSubtitle}>Opcional - Sincroniza tu progreso</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Configuration */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚙️ Configuración</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={showAPIKeyModal}
                >
                  <Text style={styles.menuItemIcon}>🔑</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Configurar OpenAI</Text>
                    <Text style={styles.menuItemSubtitle}>API key para funciones IA</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={clearAPIKey}
                >
                  <Text style={styles.menuItemIcon}>🗑️</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Eliminar API Key</Text>
                    <Text style={styles.menuItemSubtitle}>Deshabilitar funciones IA</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('backup')}
                >
                  <Text style={styles.menuItemIcon}>☁️</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Backup & Sync</Text>
                    <Text style={styles.menuItemSubtitle}>Sincronización en la nube</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('settings')}
                >
                  <Text style={styles.menuItemIcon}>⚡</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Configuración</Text>
                    <Text style={styles.menuItemSubtitle}>Notificaciones y preferencias</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ℹ️ Información</Text>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('about')}
                >
                  <Text style={styles.menuItemIcon}>📖</Text>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemTitle}>Acerca de</Text>
                    <Text style={styles.menuItemSubtitle}>Versión y créditos</Text>
                  </View>
                </TouchableOpacity>
                
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: COLORS.warning }]}
                    onPress={() => {
                      setDebugPanelVisible(true);
                      onClose();
                    }}
                  >
                    <Text style={styles.menuItemIcon}>🔧</Text>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>Debug Panel</Text>
                      <Text style={styles.menuItemSubtitle}>Logs y herramientas de desarrollo</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* API Key Modal */}
      <APIKeyModal
        visible={apiKeyModalVisible}
        onClose={() => setApiKeyModalVisible(false)}
        onApiKeySet={handleAPIKeySet}
        isRequired={false}
      />

      {/* Debug Panel */}
      <DebugPanel
        visible={debugPanelVisible}
        onClose={() => setDebugPanelVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.secondary,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
});