import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDevicePerformanceProfile, runAfterInteractions, debounce } from '../utils/performanceOptimization';

// Hook for optimized rendering based on device performance
export const useOptimizedRendering = () => {
  const [performanceProfile] = useState(getDevicePerformanceProfile());
  
  const shouldReduceAnimations = performanceProfile === 'low';
  const shouldLazyLoad = performanceProfile !== 'high';
  const shouldVirtualizeList = performanceProfile === 'low';
  
  return {
    performanceProfile,
    shouldReduceAnimations,
    shouldLazyLoad,
    shouldVirtualizeList,
  };
};

// Hook for debounced state updates
export const useDebouncedState = <T>(initialValue: T, delay: number = 300) => {
  const [state, setState] = useState<T>(initialValue);
  const [debouncedState, setDebouncedState] = useState<T>(initialValue);
  
  const debouncedSetState = useMemo(
    () => debounce((value: T) => setDebouncedState(value), delay),
    [delay]
  );
  
  useEffect(() => {
    debouncedSetState(state);
  }, [state, debouncedSetState]);
  
  return [debouncedState, setState] as const;
};

// Hook for lazy loading content after interactions
export const useLazyContent = <T>(
  loadContent: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    
    runAfterInteractions(async () => {
      try {
        const result = await loadContent();
        setContent(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    });
  }, dependencies);
  
  useEffect(() => {
    load();
  }, [load]);
  
  return { content, loading, error, reload: load };
};

// Hook for optimized list rendering
export const useOptimizedList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const { shouldVirtualizeList } = useOptimizedRendering();
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const scrollOffset = useRef(0);
  
  const updateVisibleRange = useCallback(
    debounce((offset: number) => {
      if (!shouldVirtualizeList) return;
      
      const start = Math.floor(offset / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const buffer = 5; // Render extra items for smooth scrolling
      
      setVisibleRange({
        start: Math.max(0, start - buffer),
        end: Math.min(items.length, start + visibleCount + buffer),
      });
    }, 16), // ~60fps
    [shouldVirtualizeList, itemHeight, containerHeight, items.length]
  );
  
  const onScroll = useCallback((event: any) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
    updateVisibleRange(scrollOffset.current);
  }, [updateVisibleRange]);
  
  const visibleItems = useMemo(() => {
    if (!shouldVirtualizeList) return items;
    
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      key: `${visibleRange.start + index}`,
    }));
  }, [items, visibleRange, shouldVirtualizeList]);
  
  return {
    visibleItems,
    onScroll,
    shouldVirtualize: shouldVirtualizeList,
    totalHeight: shouldVirtualizeList ? items.length * itemHeight : undefined,
  };
};

// Hook for memory-efficient image loading
export const useOptimizedImage = (uri: string, dimensions?: { width: number; height: number }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { performanceProfile } = useOptimizedRendering();
  
  useEffect(() => {
    if (!uri) return;
    
    setLoading(true);
    setError(null);
    
    // Optimize image loading based on device performance
    const loadImage = () => {
      if (performanceProfile === 'low' && dimensions) {
        // For low-performance devices, use smaller images
        const optimizedDimensions = {
          width: Math.round(dimensions.width * 0.7),
          height: Math.round(dimensions.height * 0.7),
        };
        
        // Here you would typically use an image optimization service
        // For now, we'll just use the original URI
        setImageUri(uri);
      } else {
        setImageUri(uri);
      }
      
      setLoading(false);
    };
    
    runAfterInteractions(loadImage);
  }, [uri, dimensions, performanceProfile]);
  
  return { imageUri, loading, error };
};

// Hook for performance-aware animations
export const useOptimizedAnimation = (config: any = {}) => {
  const { shouldReduceAnimations, performanceProfile } = useOptimizedRendering();
  
  const animationConfig = useMemo(() => {
    if (shouldReduceAnimations) {
      return {
        ...config,
        duration: config.duration ? config.duration * 0.5 : 150,
        useNativeDriver: true,
      };
    }
    
    return {
      ...config,
      duration: config.duration || (performanceProfile === 'high' ? 300 : 200),
      useNativeDriver: true,
    };
  }, [config, shouldReduceAnimations, performanceProfile]);
  
  return animationConfig;
};

// Hook for batched state updates
export const useBatchedUpdates = <T extends Record<string, any>>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    batchTimeoutRef.current = setTimeout(() => {
      setState(prevState => ({ ...prevState, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
      batchTimeoutRef.current = null;
    }, 16); // Batch updates within one frame
  }, []);
  
  const immediateUpdate = useCallback((updates: Partial<T>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);
  
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);
  
  return [state, batchUpdate, immediateUpdate] as const;
};

// Hook for memory leak prevention
export const useCleanupEffect = (effect: () => (() => void) | void, deps?: any[]) => {
  useEffect(() => {
    const cleanup = effect();
    
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, deps);
};