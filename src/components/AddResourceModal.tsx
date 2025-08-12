import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../constants/colors';
import { mediaService } from '../services/mediaService';
import { MediaResource } from '../screens/ResourcesScreen';
import { debugLogger, logUserAction } from '../utils/debugLogger';

interface AddResourceModalProps {
  visible: boolean;
  onClose: () => void;
  onResourceAdded: (resource: MediaResource) => void;
}

export default function AddResourceModal({ visible, onClose, onResourceAdded }: AddResourceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Programming');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; type: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['Programming', 'Mathematics', 'Science', 'Languages', 'Design', 'Other'];
  const difficulties = ['Beginner', 'Intermediate', 'Advanced'];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Programming');
    setTags('');
    setDifficulty('Beginner');
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tus archivos para agregar recursos multimedia.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    if (!(await requestPermissions())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile({
        uri: result.assets[0].uri,
        type: 'image'
      });
      debugLogger.info('Image selected for resource', { uri: result.assets[0].uri });
    }
  };

  const pickVideo = async () => {
    if (!(await requestPermissions())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile({
        uri: result.assets[0].uri,
        type: 'video'
      });
      debugLogger.info('Video selected for resource', { uri: result.assets[0].uri });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const mimeType = result.assets[0].mimeType || '';
        let type = 'image';
        
        if (mimeType.startsWith('video/')) {
          type = 'video';
        } else if (mimeType.includes('gif')) {
          type = 'gif';
        }

        setSelectedFile({
          uri: result.assets[0].uri,
          type
        });
        debugLogger.info('Document selected for resource', { 
          uri: result.assets[0].uri,
          type,
          mimeType 
        });
      }
    } catch (error) {
      debugLogger.error('Error picking document', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción es requerida');
      return false;
    }
    if (!selectedFile) {
      Alert.alert('Error', 'Debes seleccionar un archivo multimedia');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      const newResource: Omit<MediaResource, 'id' | 'createdAt'> = {
        title: title.trim(),
        description: description.trim(),
        type: selectedFile!.type as 'image' | 'gif' | 'video',
        category,
        tags: tagsArray,
        uri: selectedFile!.uri,
        difficulty,
      };

      const savedResource = await mediaService.addResource(newResource);
      
      logUserAction('Add Resource', 'AddResourceModal', {
        title: savedResource.title,
        type: savedResource.type,
        category: savedResource.category
      });

      onResourceAdded(savedResource);
      handleClose();
      
      Alert.alert(
        '¡Recurso agregado!',
        `"${savedResource.title}" se ha agregado exitosamente a tu biblioteca.`
      );
    } catch (error) {
      debugLogger.error('Failed to add resource', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'No se pudo agregar el recurso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📎 Agregar Recurso</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Básica</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Nombre del recurso..."
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descripción *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe qué se aprende con este recurso..."
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tags (separados por comas)</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="react, javascript, programming"
                placeholderTextColor={COLORS.gray}
              />
            </View>
          </View>

          {/* Category and Difficulty */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clasificación</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.optionChip,
                        category === cat && styles.optionChipActive
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[
                        styles.optionChipText,
                        category === cat && styles.optionChipTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Dificultad</Text>
              <View style={styles.optionsContainer}>
                {difficulties.map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.optionChip,
                      difficulty === diff && styles.optionChipActive
                    ]}
                    onPress={() => setDifficulty(diff as any)}
                  >
                    <Text style={[
                      styles.optionChipText,
                      difficulty === diff && styles.optionChipTextActive
                    ]}>
                      {diff}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* File Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Archivo Multimedia *</Text>
            
            {selectedFile ? (
              <View style={styles.selectedFileContainer}>
                <Text style={styles.selectedFileText}>
                  📎 Archivo seleccionado ({selectedFile.type})
                </Text>
                <TouchableOpacity
                  style={styles.changeFileButton}
                  onPress={() => setSelectedFile(null)}
                >
                  <Text style={styles.changeFileButtonText}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.fileOptionsContainer}>
                <TouchableOpacity style={styles.fileOptionButton} onPress={pickImage}>
                  <Text style={styles.fileOptionIcon}>🖼️</Text>
                  <Text style={styles.fileOptionText}>Imagen/GIF</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.fileOptionButton} onPress={pickVideo}>
                  <Text style={styles.fileOptionIcon}>🎥</Text>
                  <Text style={styles.fileOptionText}>Video</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.fileOptionButton} onPress={pickDocument}>
                  <Text style={styles.fileOptionIcon}>📁</Text>
                  <Text style={styles.fileOptionText}>Archivo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>💾 Guardar Recurso</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
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
    padding: 15,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  optionChipActive: {
    backgroundColor: COLORS.neonBlue,
  },
  optionChipText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: COLORS.white,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 12,
  },
  selectedFileText: {
    color: COLORS.white,
    fontSize: 14,
    flex: 1,
  },
  changeFileButton: {
    backgroundColor: COLORS.neonBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeFileButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  fileOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fileOptionButton: {
    backgroundColor: COLORS.secondary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  fileOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  fileOptionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
    padding: 20,
  },
  saveButton: {
    backgroundColor: COLORS.neonGreen,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});