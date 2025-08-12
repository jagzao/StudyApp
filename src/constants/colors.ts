export const COLORS = {
  // Main theme colors
  background: '#0A0A0A',    // Negro profundo
  secondary: '#1A1A1A',     // Gris oscuro  
  neonRed: '#FF1E1E',       // Rojo neón
  white: '#FFFFFF',         // Blanco puro
  gray: '#666666',          // Gris medio
  success: '#00FF88',       // Verde neón
  warning: '#FFB800',       // Amarillo neón
  error: '#FF4444',         // Rojo error
  
  // Legacy compatibility
  primary: '#FF1E1E',
  dark: '#0A0A0A',
  darkGray: '#1A1A1A',
  lightGray: '#666666',
  accent: '#FF1E1E',
  
  // Extended palette
  neonBlue: '#00D4FF',
  neonGreen: '#00FF88',
  neonPurple: '#BB00FF',
  neonYellow: '#FFD700',
  
  // UI states
  disabled: '#333333',
  placeholder: '#999999',
  border: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.8)',
} as const;

export type ColorKey = keyof typeof COLORS;