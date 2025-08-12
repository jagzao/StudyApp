import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { cloudBackupService, SyncStatus } from '../services/cloudBackupService';
import { configService } from '../services/configService';

export default function BackupScreen() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: 0,
    isOnline: false,
    needsSync: false,
    syncInProgress: false,
  });
  const [backups, setBackups] = useState<Array<{ id: string; timestamp: number; size: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    loadBackupData();
    loadSettings();
  }, []);

  const loadBackupData = async () => {
    try {
      setLoading(true);
      const [status, backupList] = await Promise.all([
        cloudBackupService.getSyncStatus(),
        cloudBackupService.listBackups(),
      ]);
      
      setSyncStatus(status);
      setBackups(backupList);
    } catch (error) {
      console.error('Failed to load backup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const [url, key, autoSyncSetting] = await Promise.all([
        configService.getConfig('SUPABASE_URL') || '',
        configService.getConfig('SUPABASE_ANON_KEY') || '',
        configService.getConfig('AUTO_SYNC') || true,
      ]);
      
      setSupabaseUrl(url);
      setSupabaseKey(key);
      setAutoSync(autoSyncSetting);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      setLoading(true);
      await cloudBackupService.syncWithCloud();
      await loadBackupData();
      
      Alert.alert('¡Éxito!', 'Sincronización completada correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo completar la sincronización');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const backup = await cloudBackupService.createBackup();
      await cloudBackupService.uploadBackup(backup);
      await loadBackupData();
      
      Alert.alert('¡Éxito!', 'Backup creado y subido correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = (backupId: string, timestamp: number) => {
    Alert.alert(
      'Restaurar Backup',
      `¿Estás seguro de que quieres restaurar el backup del ${new Date(timestamp).toLocaleString()}? Esto puede sobrescribir tus datos actuales.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const backup = await cloudBackupService.downloadBackup(backupId);
              await cloudBackupService.restoreBackup(backup);
              
              Alert.alert('¡Éxito!', 'Backup restaurado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo restaurar el backup');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveCredentials = async () => {
    try {
      if (!supabaseUrl.trim() || !supabaseKey.trim()) {
        Alert.alert('Error', 'Por favor completa todos los campos');
        return;
      }

      await configService.setConfig('SUPABASE_URL', supabaseUrl.trim());
      await configService.setConfig('SUPABASE_ANON_KEY', supabaseKey.trim());
      
      Alert.alert('¡Guardado!', 'Credenciales de Supabase guardadas correctamente');
      setShowCredentials(false);
      
      // Reinitialize cloud service with new credentials
      await cloudBackupService.initialize();
      await loadBackupData();
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar las credenciales');
    }
  };

  const handleToggleAutoSync = async (value: boolean) => {
    setAutoSync(value);
    await configService.setConfig('AUTO_SYNC', value);
    
    if (value) {
      cloudBackupService.startPeriodicSync();
    } else {
      cloudBackupService.stopPeriodicSync();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusColor = () => {
    if (syncStatus.syncInProgress) return COLORS.warning;
    if (!syncStatus.isOnline) return COLORS.neonRed;
    if (syncStatus.needsSync) return COLORS.warning;
    return COLORS.success;
  };

  const getStatusText = () => {
    if (syncStatus.syncInProgress) return 'Sincronizando...';
    if (!syncStatus.isOnline) return 'Sin conexión';
    if (syncStatus.needsSync) return 'Necesita sincronización';
    return 'Sincronizado';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>☁️ Backup & Sync</Text>
          <Text style={styles.subtitle}>
            Mantén tus datos seguros en la nube y sincronizados entre dispositivos
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Estado de Sincronización</Text>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          </View>
          
          <Text style={styles.statusText}>{getStatusText()}</Text>
          
          {syncStatus.lastSync > 0 && (
            <Text style={styles.lastSyncText}>
              Última sincronización: {new Date(syncStatus.lastSync).toLocaleString()}
            </Text>
          )}

          <View style={styles.statusActions}>
            <TouchableOpacity
              style={[styles.syncButton, loading && styles.buttonDisabled]}
              onPress={handleManualSync}
              disabled={loading || syncStatus.syncInProgress}
            >
              {loading || syncStatus.syncInProgress ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>⚙️ Configuración</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Sincronización automática</Text>
            <Switch
              value={autoSync}
              onValueChange={handleToggleAutoSync}
              trackColor={{ false: COLORS.gray, true: COLORS.neonRed }}
              thumbColor={autoSync ? COLORS.white : COLORS.gray}
            />
          </View>

          <TouchableOpacity
            style={styles.credentialsButton}
            onPress={() => setShowCredentials(!showCredentials)}
          >
            <Text style={styles.credentialsButtonText}>
              {showCredentials ? '🔒 Ocultar' : '🔑 Configurar'} Credenciales
            </Text>
          </TouchableOpacity>

          {showCredentials && (
            <View style={styles.credentialsForm}>
              <Text style={styles.inputLabel}>Supabase URL:</Text>
              <TextInput
                style={styles.input}
                value={supabaseUrl}
                onChangeText={setSupabaseUrl}
                placeholder="https://your-project.supabase.co"
                placeholderTextColor={COLORS.gray}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>Supabase Anon Key:</Text>
              <TextInput
                style={styles.input}
                value={supabaseKey}
                onChangeText={setSupabaseKey}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                placeholderTextColor={COLORS.gray}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCredentials}
              >
                <Text style={styles.saveButtonText}>💾 Guardar Credenciales</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Backup Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>🎯 Acciones</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton, loading && styles.buttonDisabled]}
            onPress={handleCreateBackup}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>📦 Crear Backup Manual</Text>
          </TouchableOpacity>

          <Text style={styles.actionDescription}>
            Crea un backup completo de todos tus flashcards y progreso
          </Text>
        </View>

        {/* Backup History */}
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>📋 Historial de Backups</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.neonRed} />
              <Text style={styles.loadingText}>Cargando backups...</Text>
            </View>
          ) : backups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay backups disponibles</Text>
              <Text style={styles.emptySubtext}>Crea tu primer backup para empezar</Text>
            </View>
          ) : (
            backups.map((backup, index) => (
              <View key={backup.id} style={styles.backupItem}>
                <View style={styles.backupInfo}>
                  <Text style={styles.backupDate}>
                    📅 {new Date(backup.timestamp).toLocaleDateString()}
                  </Text>
                  <Text style={styles.backupTime}>
                    🕐 {new Date(backup.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text style={styles.backupSize}>
                    📊 {formatFileSize(backup.size)}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={() => handleRestoreBackup(backup.id, backup.timestamp)}
                  disabled={loading}
                >
                  <Text style={styles.restoreButtonText}>🔄 Restaurar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Información Importante</Text>
          <Text style={styles.infoText}>
            • Los backups incluyen todas tus flashcards, progreso de estudio y configuraciones{'\n'}
            • La sincronización automática se ejecuta cada 15 minutos{'\n'}
            • Necesitas configurar Supabase para usar el backup en la nube{'\n'}
            • Tus datos están encriptados durante la transmisión{'\n'}
            • Puedes restaurar cualquier backup anterior
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  statusCard: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 8,
  },
  lastSyncText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
  },
  statusActions: {
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: COLORS.neonRed,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  syncButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.white,
  },
  credentialsButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  credentialsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  credentialsForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionDescription: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  historyCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    color: COLORS.gray,
    fontSize: 14,
  },
  backupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  backupTime: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 2,
  },
  backupSize: {
    color: COLORS.gray,
    fontSize: 12,
  },
  restoreButton: {
    backgroundColor: COLORS.neonBlue,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  restoreButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    margin: 20,
    marginTop: 0,
    marginBottom: 40,
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});