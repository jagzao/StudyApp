import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../constants/colors';
import { debugLogger, logUserAction } from '../utils/debugLogger';
import { mediaService } from '../services/mediaService';
import AddResourceModal from '../components/AddResourceModal';

const { width: screenWidth } = Dimensions.get('window');

export interface MediaResource {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'gif' | 'video';
  category: string;
  tags: string[];
  uri: string;
  thumbnail?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number; // for videos, in seconds
  createdAt: Date;
}

interface ResourcesScreenProps {
  onBack: () => void;
}

export default function ResourcesScreen({ onBack }: ResourcesScreenProps) {
  const [resources, setResources] = useState<MediaResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<MediaResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<MediaResource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [categories, setCategories] = useState<string[]>(['All']);
  const types = ['All', 'image', 'gif', 'video'];

  useEffect(() => {
    loadResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchQuery, selectedCategory, selectedType]);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      // Initialize media service if needed
      await mediaService.initialize();
      
      // Load resources from service
      const loadedResources = await mediaService.loadResources();
      setResources(loadedResources);
      
      // Update categories
      const availableCategories = mediaService.getCategories();
      setCategories(availableCategories);
      
      debugLogger.success(`Loaded ${loadedResources.length} media resources`);
      logUserAction('Load Resources', 'ResourcesScreen', { count: loadedResources.length });
    } catch (error) {
      debugLogger.error('Failed to load resources', { error: error.message });
      Alert.alert('Error', 'No se pudieron cargar los recursos multimedia');
    } finally {
      setIsLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = resources;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(resource => resource.category === selectedCategory);
    }

    // Filter by type
    if (selectedType !== 'All') {
      filtered = filtered.filter(resource => resource.type === selectedType);
    }

    setFilteredResources(filtered);
  };

  const openResource = (resource: MediaResource) => {
    setSelectedResource(resource);
    logUserAction('Open Resource', 'ResourcesScreen', { 
      resourceId: resource.id,
      title: resource.title,
      type: resource.type 
    });
  };

  const closeResource = () => {
    setSelectedResource(null);
  };

  const handleResourceAdded = (newResource: MediaResource) => {
    setResources(prev => [newResource, ...prev]);
    // Refresh categories in case a new one was added
    const updatedCategories = mediaService.getCategories();
    setCategories(updatedCategories);
  };

  const renderResourceCard = (resource: MediaResource) => {
    const cardWidth = (screenWidth - 60) / 2;
    
    return (
      <TouchableOpacity
        key={resource.id}
        style={[styles.resourceCard, { width: cardWidth }]}
        onPress={() => openResource(resource)}
      >
        {/* Thumbnail or Preview */}
        <View style={styles.resourcePreview}>
          {resource.type === 'video' ? (
            <View style={styles.videoPreview}>
              {resource.thumbnail ? (
                <Image source={{ uri: resource.thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoIcon}>🎥</Text>
                </View>
              )}
              <View style={styles.videoDuration}>
                <Text style={styles.videoDurationText}>
                  {Math.floor((resource.duration || 0) / 60)}:{((resource.duration || 0) % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
          ) : (
            <Image source={{ uri: resource.uri }} style={styles.thumbnail} resizeMode="cover" />
          )}
        </View>

        {/* Resource Info */}
        <View style={styles.resourceInfo}>
          <Text style={styles.resourceTitle} numberOfLines={2}>
            {resource.title}
          </Text>
          <Text style={styles.resourceCategory}>
            {resource.category}
          </Text>
          <View style={styles.resourceMeta}>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>
                {resource.type === 'gif' ? '🎞️' : resource.type === 'video' ? '🎥' : '🖼️'}
                {resource.type.toUpperCase()}
              </Text>
            </View>
            {resource.difficulty && (
              <View style={[styles.difficultyTag, { 
                backgroundColor: 
                  resource.difficulty === 'Beginner' ? COLORS.neonGreen :
                  resource.difficulty === 'Intermediate' ? COLORS.neonBlue :
                  COLORS.neonRed
              }]}>
                <Text style={styles.difficultyTagText}>
                  {resource.difficulty}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderResourceViewer = () => {
    if (!selectedResource) return null;

    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeResource}
      >
        <View style={styles.viewerContainer}>
          {/* Header */}
          <View style={styles.viewerHeader}>
            <View style={styles.viewerHeaderInfo}>
              <Text style={styles.viewerTitle}>{selectedResource.title}</Text>
              <Text style={styles.viewerCategory}>{selectedResource.category}</Text>
            </View>
            <TouchableOpacity onPress={closeResource} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Media Content */}
          <ScrollView contentContainerStyle={styles.viewerContent}>
            <View style={styles.mediaContainer}>
              {selectedResource.type === 'video' ? (
                <Video
                  source={{ uri: selectedResource.uri }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                />
              ) : (
                <Image
                  source={{ uri: selectedResource.uri }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Resource Details */}
            <View style={styles.resourceDetails}>
              <Text style={styles.resourceDescription}>
                {selectedResource.description}
              </Text>

              {/* Tags */}
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsTitle}>Tags:</Text>
                <View style={styles.tagsWrapper}>
                  {selectedResource.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Metadata */}
              <View style={styles.metadata}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Tipo:</Text>
                  <Text style={styles.metadataValue}>{selectedResource.type.toUpperCase()}</Text>
                </View>
                
                {selectedResource.difficulty && (
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Dificultad:</Text>
                    <Text style={styles.metadataValue}>{selectedResource.difficulty}</Text>
                  </View>
                )}
                
                {selectedResource.duration && (
                  <View style={styles.metadataItem}>
                    <Text style={styles.metadataLabel}>Duración:</Text>
                    <Text style={styles.metadataValue}>
                      {Math.floor(selectedResource.duration / 60)}:{(selectedResource.duration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📚 Recursos Multimedia</Text>
        <TouchableOpacity 
          onPress={() => setAddModalVisible(true)} 
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar recursos..."
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {/* Category Filters */}
        <View style={styles.filterGroup}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.filterChipActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type Filters */}
        <View style={styles.filterGroup}>
          {types.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                selectedType === type && styles.filterChipActive
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[
                styles.filterChipText,
                selectedType === type && styles.filterChipTextActive
              ]}>
                {type === 'All' ? 'Todos' : type === 'image' ? '🖼️' : type === 'gif' ? '🎞️' : '🎥'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Resources Grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.neonBlue} />
          <Text style={styles.loadingText}>Cargando recursos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resourcesGrid}>
          {filteredResources.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>📭</Text>
              <Text style={styles.emptyTitle}>No se encontraron recursos</Text>
              <Text style={styles.emptySubtitle}>
                Intenta cambiar los filtros o la búsqueda
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredResources.map(renderResourceCard)}
            </View>
          )}
        </ScrollView>
      )}

      {/* Resource Viewer Modal */}
      {renderResourceViewer()}

      {/* Add Resource Modal */}
      <AddResourceModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onResourceAdded={handleResourceAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: COLORS.neonBlue,
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  addButton: {
    backgroundColor: COLORS.neonGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  searchInput: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 15,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  filtersContainer: {
    paddingVertical: 10,
  },
  filterGroup: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.neonBlue,
  },
  filterChipText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  resourcesGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resourceCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  resourcePreview: {
    height: 120,
    backgroundColor: COLORS.darkGray,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
  },
  videoIcon: {
    fontSize: 24,
  },
  videoDuration: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
  },
  resourceInfo: {
    padding: 12,
  },
  resourceTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  resourceCategory: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 8,
  },
  resourceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    backgroundColor: COLORS.darkGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '500',
  },
  difficultyTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyTagText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: 'center',
  },
  // Viewer Styles
  viewerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  viewerHeaderInfo: {
    flex: 1,
  },
  viewerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  viewerCategory: {
    color: COLORS.gray,
    fontSize: 14,
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
  viewerContent: {
    paddingBottom: 20,
  },
  mediaContainer: {
    backgroundColor: COLORS.darkGray,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 200,
  },
  video: {
    width: '100%',
    height: 250,
  },
  fullImage: {
    width: '100%',
    minHeight: 200,
  },
  resourceDetails: {
    paddingHorizontal: 20,
  },
  resourceDescription: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsContainer: {
    marginBottom: 20,
  },
  tagsTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.neonBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  metadata: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 15,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metadataLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  metadataValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
});