import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function App() {
  const [message, setMessage] = useState('Study AI - Inicializando...');

  useEffect(() => {
    // Simulamos una inicialización exitosa
    const timer = setTimeout(() => {
      setMessage('¡Study AI funcionando correctamente en web!');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Study AI</Text>
      <Text style={styles.subtitle}>{message}</Text>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>✅ Web funcionando</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        La aplicación completa se cargará después de resolver 
        el problema de import.meta
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#FF1E1E',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FF1E1E',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});