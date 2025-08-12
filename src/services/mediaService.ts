import AsyncStorage from '@react-native-async-storage/async-storage';
import { MediaResource } from '../screens/ResourcesScreen';
import { debugLogger } from '../utils/debugLogger';

class MediaService {
  private readonly STORAGE_KEY = '@media_resources';
  private resources: MediaResource[] = [];

  // Initialize the service
  async initialize(): Promise<void> {
    try {
      await this.loadResources();
      debugLogger.success('Media service initialized');
    } catch (error) {
      debugLogger.error('Failed to initialize media service', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Load resources from storage
  async loadResources(): Promise<MediaResource[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.resources = JSON.parse(stored);
      } else {
        // Load default/sample resources if none exist
        this.resources = this.getDefaultResources();
        await this.saveResources();
      }
      
      debugLogger.info(`Loaded ${this.resources.length} media resources`);
      return this.resources;
    } catch (error) {
      debugLogger.error('Failed to load resources', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  // Get all resources
  getResources(): MediaResource[] {
    return [...this.resources];
  }

  // Get resources by category
  getResourcesByCategory(category: string): MediaResource[] {
    if (category === 'All') return this.getResources();
    return this.resources.filter(resource => resource.category === category);
  }

  // Get resources by type
  getResourcesByType(type: string): MediaResource[] {
    if (type === 'All') return this.getResources();
    return this.resources.filter(resource => resource.type === type);
  }

  // Search resources
  searchResources(query: string): MediaResource[] {
    const lowercaseQuery = query.toLowerCase();
    return this.resources.filter(resource =>
      resource.title.toLowerCase().includes(lowercaseQuery) ||
      resource.description.toLowerCase().includes(lowercaseQuery) ||
      resource.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      resource.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Add new resource
  async addResource(resource: Omit<MediaResource, 'id' | 'createdAt'>): Promise<MediaResource> {
    try {
      const newResource: MediaResource = {
        ...resource,
        id: Date.now().toString(),
        createdAt: new Date(),
      };

      this.resources.push(newResource);
      await this.saveResources();
      
      debugLogger.success(`Added new resource: ${newResource.title}`);
      return newResource;
    } catch (error) {
      debugLogger.error('Failed to add resource', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Update existing resource
  async updateResource(id: string, updates: Partial<MediaResource>): Promise<MediaResource | null> {
    try {
      const index = this.resources.findIndex(resource => resource.id === id);
      if (index === -1) {
        debugLogger.warning(`Resource not found for update: ${id}`);
        return null;
      }

      this.resources[index] = { ...this.resources[index], ...updates };
      await this.saveResources();
      
      debugLogger.success(`Updated resource: ${this.resources[index].title}`);
      return this.resources[index];
    } catch (error) {
      debugLogger.error('Failed to update resource', { error: error instanceof Error ? error.message : String(error), id });
      throw error;
    }
  }

  // Delete resource
  async deleteResource(id: string): Promise<boolean> {
    try {
      const index = this.resources.findIndex(resource => resource.id === id);
      if (index === -1) {
        debugLogger.warning(`Resource not found for deletion: ${id}`);
        return false;
      }

      const deletedResource = this.resources.splice(index, 1)[0];
      await this.saveResources();
      
      debugLogger.success(`Deleted resource: ${deletedResource.title}`);
      return true;
    } catch (error) {
      debugLogger.error('Failed to delete resource', { error: error instanceof Error ? error.message : String(error), id });
      throw error;
    }
  }

  // Get resource by ID
  getResourceById(id: string): MediaResource | null {
    return this.resources.find(resource => resource.id === id) || null;
  }

  // Get categories
  getCategories(): string[] {
    const categories = new Set(this.resources.map(resource => resource.category));
    return ['All', ...Array.from(categories).sort()];
  }

  // Get resource types
  getTypes(): string[] {
    return ['All', 'image', 'gif', 'video'];
  }

  // Get resources by difficulty
  getResourcesByDifficulty(difficulty: string): MediaResource[] {
    return this.resources.filter(resource => resource.difficulty === difficulty);
  }

  // Save resources to storage
  private async saveResources(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.resources));
    } catch (error) {
      debugLogger.error('Failed to save resources', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Get default/sample resources
  private getDefaultResources(): MediaResource[] {
    return [
      {
        id: '1',
        title: 'React Hooks Básicos',
        description: 'Introducción visual a los hooks más importantes de React: useState, useEffect, y useContext.',
        type: 'gif',
        category: 'Programming',
        tags: ['react', 'hooks', 'javascript', 'frontend'],
        uri: 'https://example.com/react-hooks.gif', // Replace with your actual file paths
        difficulty: 'Beginner',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        title: 'Algoritmos de Ordenamiento',
        description: 'Visualización animada de diferentes algoritmos de ordenamiento: bubble sort, quick sort, merge sort.',
        type: 'video',
        category: 'Programming',
        tags: ['algorithms', 'sorting', 'computer-science', 'animation'],
        uri: 'https://example.com/sorting-algorithms.mp4',
        thumbnail: 'https://example.com/sorting-thumb.jpg',
        difficulty: 'Intermediate',
        duration: 180,
        createdAt: new Date('2024-01-10'),
      },
      {
        id: '3',
        title: 'Estructuras de Datos',
        description: 'Diagrama explicativo de las principales estructuras de datos: arrays, listas, stacks, queues.',
        type: 'image',
        category: 'Programming',
        tags: ['data-structures', 'computer-science', 'diagrams'],
        uri: 'https://example.com/data-structures.png',
        difficulty: 'Advanced',
        createdAt: new Date('2024-01-05'),
      },
      {
        id: '4',
        title: 'CSS Flexbox Layout',
        description: 'Guía visual interactiva para entender flexbox y sus propiedades principales.',
        type: 'gif',
        category: 'Design',
        tags: ['css', 'flexbox', 'layout', 'web-design'],
        uri: 'https://example.com/flexbox-guide.gif',
        difficulty: 'Beginner',
        createdAt: new Date('2024-01-20'),
      },
      {
        id: '5',
        title: 'JavaScript Async/Await',
        description: 'Explicación paso a paso de programación asíncrona en JavaScript con ejemplos prácticos.',
        type: 'video',
        category: 'Programming',
        tags: ['javascript', 'async', 'promises', 'programming'],
        uri: 'https://example.com/async-await.mp4',
        thumbnail: 'https://example.com/async-thumb.jpg',
        difficulty: 'Intermediate',
        duration: 240,
        createdAt: new Date('2024-01-12'),
      },
      {
        id: '6',
        title: 'Principios de UX Design',
        description: 'Infografía completa sobre los principios fundamentales del diseño de experiencia de usuario.',
        type: 'image',
        category: 'Design',
        tags: ['ux', 'design', 'user-experience', 'principles'],
        uri: 'https://example.com/ux-principles.jpg',
        difficulty: 'Beginner',
        createdAt: new Date('2024-01-08'),
      },
      {
        id: '7',
        title: 'Git Workflow Explicado',
        description: 'Animación que muestra el flujo de trabajo típico con Git: branches, merges, y pull requests.',
        type: 'gif',
        category: 'Programming',
        tags: ['git', 'version-control', 'workflow', 'development'],
        uri: 'https://example.com/git-workflow.gif',
        difficulty: 'Intermediate',
        createdAt: new Date('2024-01-18'),
      },
      {
        id: '8',
        title: 'Matemáticas: Derivadas',
        description: 'Video tutorial sobre el concepto de derivadas con ejemplos visuales y aplicaciones prácticas.',
        type: 'video',
        category: 'Mathematics',
        tags: ['calculus', 'derivatives', 'math', 'tutorial'],
        uri: 'https://example.com/derivatives.mp4',
        thumbnail: 'https://example.com/derivatives-thumb.jpg',
        difficulty: 'Advanced',
        duration: 420,
        createdAt: new Date('2024-01-14'),
      },
    ];
  }

  // Clear all resources (for testing/debugging)
  async clearAllResources(): Promise<void> {
    try {
      this.resources = [];
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      debugLogger.success('All media resources cleared');
    } catch (error) {
      debugLogger.error('Failed to clear resources', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Import resources from JSON
  async importResources(resourcesData: MediaResource[]): Promise<number> {
    try {
      const importedCount = resourcesData.length;
      this.resources = [...this.resources, ...resourcesData];
      await this.saveResources();
      
      debugLogger.success(`Imported ${importedCount} resources`);
      return importedCount;
    } catch (error) {
      debugLogger.error('Failed to import resources', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Export resources to JSON
  exportResources(): MediaResource[] {
    debugLogger.info('Exporting all resources');
    return this.getResources();
  }

  // Get resource statistics
  getResourceStats(): {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
  } {
    const stats = {
      total: this.resources.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
    };

    this.resources.forEach(resource => {
      // Count by type
      stats.byType[resource.type] = (stats.byType[resource.type] || 0) + 1;
      
      // Count by category
      stats.byCategory[resource.category] = (stats.byCategory[resource.category] || 0) + 1;
      
      // Count by difficulty
      if (resource.difficulty) {
        stats.byDifficulty[resource.difficulty] = (stats.byDifficulty[resource.difficulty] || 0) + 1;
      }
    });

    return stats;
  }
}

// Singleton instance
export const mediaService = new MediaService();
export default mediaService;