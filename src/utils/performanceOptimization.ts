import React from 'react';
import { Platform, Dimensions, PixelRatio, InteractionManager } from 'react-native';

// Device performance detection
export const getDevicePerformanceProfile = () => {
  const { width, height } = Dimensions.get('window');
  const pixelRatio = PixelRatio.get();
  const totalPixels = width * height * pixelRatio;
  
  // Classify device performance based on screen resolution and platform
  if (Platform.OS === 'ios') {
    // iOS devices generally have better performance
    if (totalPixels > 2000000) return 'high';
    if (totalPixels > 1000000) return 'medium';
    return 'low';
  } else {
    // Android devices vary more
    if (totalPixels > 2500000) return 'high';
    if (totalPixels > 1500000) return 'medium';
    return 'low';
  }
};

// Performance-aware component rendering
export const shouldUseOptimizedRendering = () => {
  const profile = getDevicePerformanceProfile();
  return profile === 'low';
};

// Debounce utility for performance
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for performance
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Optimized animation frame execution (React Native compatible)
export const runOnNextFrame = (callback: () => void) => {
  // React Native doesn't have requestAnimationFrame, use setImmediate instead
  setImmediate(callback);
};

// Batch updates for better performance
export const runAfterInteractions = (callback: () => void) => {
  InteractionManager.runAfterInteractions(callback);
};

// Memory optimization utilities
export const optimizeImageSize = (originalWidth: number, originalHeight: number, maxSize: number = 800) => {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize,
    };
  }
};

// Cache management
class PerformanceCache {
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private maxSize = 100;
  
  set(key: string, value: any, ttl: number = 300000) { // 5 minutes default
    // Clean up expired entries
    this.cleanup();
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const performanceCache = new PerformanceCache();

// Performance monitoring
export const performanceMonitor = {
  startTiming: (label: string) => {
    console.time(label);
  },
  
  endTiming: (label: string) => {
    console.timeEnd(label);
  },
  
  measureAsync: async <T>(label: string, asyncFunction: () => Promise<T>): Promise<T> => {
    performanceMonitor.startTiming(label);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      performanceMonitor.endTiming(label);
    }
  },
};

// Lazy loading utilities
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};

// Virtual list optimization
export const calculateOptimalItemHeight = () => {
  const { height } = Dimensions.get('window');
  const performance = getDevicePerformanceProfile();
  
  // Adjust item height based on device performance
  switch (performance) {
    case 'high':
      return Math.min(100, height / 8);
    case 'medium':
      return Math.min(80, height / 10);
    case 'low':
      return Math.min(60, height / 12);
    default:
      return 80;
  }
};

// Network optimization
export const shouldReduceNetworkCalls = () => {
  const performance = getDevicePerformanceProfile();
  return performance === 'low';
};

// Animation optimization
export const getOptimalAnimationConfig = () => {
  const performance = getDevicePerformanceProfile();
  
  switch (performance) {
    case 'high':
      return {
        duration: 300,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      };
    case 'medium':
      return {
        duration: 250,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      };
    case 'low':
      return {
        duration: 200,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      };
    default:
      return {
        duration: 250,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      };
  }
};