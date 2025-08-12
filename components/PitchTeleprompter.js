import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import whisperService from '../services/whisperService';

const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#0A0A0A',
  secondary: '#1A1A1A',
  neonRed: '#FF1E1E',
  white: '#FFFFFF',
  gray: '#666666',
  success: '#00FF88',
  warning: '#FFB800',
  primary: '#FF1E1E',
  darkGray: '#1A1A1A',
  lightGray: '#666666',
};

const PITCH_STORAGE_KEY = '@pitch_data';

// Datos predefinidos del pitch
const DEFAULT_PITCH_DATA = {
  intro: "Soy Juan Zambrano, desarrollador fullstack con más de 9 años de experiencia en .NET, React, Azure y bases de datos SQL. Me especializo en optimizar sistemas complejos, aplicando arquitectura limpia, patrones de diseño y buenas prácticas. En mis últimos proyectos logré reducir tiempos de ejecución en un 30% y mejorar la seguridad de plataformas financieras. Me interesa aportar mi experiencia para que su empresa alcance más eficiencia e innovación.",
  
  contextualNotes: {
    ".net": [
      "9 años desarrollando en .NET Framework y .NET Core",
      "Experiencia con Entity Framework, Web API, MVC",
      "Migración exitosa de sistemas legacy a .NET 6/7"
    ],
    "react": [
      "Desarrollo de SPAs con React + Redux/Context",
      "Experiencia con React Hooks, componentes funcionales",
      "Integración con APIs REST y GraphQL"
    ],
    "azure": [
      "Despliegue en Azure App Services y Functions",
      "Gestión de bases de datos Azure SQL",
      "Implementación de CI/CD con Azure DevOps"
    ],
    "sql": [
      "Optimización de consultas complejas",
      "Diseño de esquemas relacionales eficientes",
      "Experiencia con SQL Server, PostgreSQL, MySQL"
    ],
    "arquitectura": [
      "Aplicación de principios SOLID y Clean Architecture",
      "Implementación de patrones como Repository, CQRS",
      "Microservicios y arquitecturas distribuidas"
    ],
    "rendimiento": [
      "Reducción de 30% en tiempos de ejecución",
      "Implementación de caché Redis",
      "Optimización de consultas y procedimientos almacenados"
    ],
    "seguridad": [
      "Implementación de autenticación JWT",
      "Validación y sanitización de inputs",
      "Auditoría de seguridad en aplicaciones financieras"
    ]
  },
  
  starExamples: {
    "optimización": {
      situation: "Sistema de facturación con tiempos de respuesta lentos",
      task: "Mejorar el rendimiento y reducir los tiempos de carga",
      action: "Implementé caché Redis, optimicé consultas SQL y refactoricé la arquitectura usando patrones CQRS",
      result: "Reduje los tiempos de respuesta en un 30% y mejoré la experiencia del usuario significativamente"
    },
    "seguridad": {
      situation: "Plataforma financiera con vulnerabilidades de seguridad",
      task: "Reforzar la seguridad y cumplir con estándares bancarios",
      action: "Implementé validación robusta, autenticación multifactor y auditoría completa de transacciones",
      result: "Sistema certificado y sin incidentes de seguridad durante 2 años de operación"
    },
    "liderazgo": {
      situation: "Equipo de desarrollo sin metodologías definidas",
      task: "Establecer procesos y mejorar la calidad del código",
      action: "Implementé code reviews, CI/CD, y mentoré al equipo en mejores prácticas",
      result: "Aumentamos la velocidad de entrega en 40% y reducimos bugs en producción"
    }
  }
};

export default function PitchTeleprompter({ onClose }) {
  const [pitchData, setPitchData] = useState(DEFAULT_PITCH_DATA);
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [discreteMode, setDiscreteMode] = useState(false);
  const [showContextualNotes, setShowContextualNotes] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedIntro, setEditedIntro] = useState(pitchData.intro);
  
  const scrollViewRef = useRef(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [notesAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadPitchData();
    requestAudioPermissions();
  }, []);

  const loadPitchData = async () => {
    try {
      const stored = await AsyncStorage.getItem(PITCH_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setPitchData({ ...DEFAULT_PITCH_DATA, ...data });
        setEditedIntro(data.intro || DEFAULT_PITCH_DATA.intro);
      }
    } catch (error) {
      console.error('Error loading pitch data:', error);
    }
  };

  const savePitchData = async (data) => {
    try {
      await AsyncStorage.setItem(PITCH_STORAGE_KEY, JSON.stringify(data));
      setPitchData(data);
    } catch (error) {
      console.error('Error saving pitch data:', error);
    }
  };

  const requestAudioPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permisos', 'Se necesitan permisos de audio para el reconocimiento de voz');
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
    }
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        // Transcribir con Whisper
        const transcription = await whisperService.transcribeAudio(uri);
        processTranscription(transcription);
      }
      setRecording(null);
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsListening(false);
    }
  };

  const processTranscription = (transcription) => {
    const text = transcription.toLowerCase();
    
    // Buscar palabras clave en el texto transcrito
    const keywords = Object.keys(pitchData.contextualNotes);
    const matchedKeywords = keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      // Mostrar notas contextuales
      setShowContextualNotes(matchedKeywords);
      showContextualNotesAnimation();
      
      // Auto-scroll al contenido relevante
      autoScrollToKeyword(matchedKeywords[0]);
    }
    
    // Buscar ejemplos STAR
    const starKeywords = Object.keys(pitchData.starExamples);
    const matchedStar = starKeywords.find(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (matchedStar) {
      showStarExample(matchedStar);
    }
    
    // Simular progreso en el teleprompter basado en las palabras
    const words = pitchData.intro.split(' ');
    const transcribedWords = transcription.split(' ');
    const matchCount = transcribedWords.filter(word => 
      words.some(pitchWord => 
        pitchWord.toLowerCase().includes(word.toLowerCase()) && word.length > 3
      )
    ).length;
    
    if (matchCount > 0) {
      const newPosition = Math.min(
        currentPosition + (matchCount * 20), 
        pitchData.intro.length
      );
      setCurrentPosition(newPosition);
      autoScrollToPosition(newPosition);
    }
  };

  const showContextualNotesAnimation = () => {
    Animated.sequence([
      Animated.timing(notesAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(5000),
      Animated.timing(notesAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setShowContextualNotes([]));
  };

  const autoScrollToKeyword = (keyword) => {
    const keywordIndex = pitchData.intro.toLowerCase().indexOf(keyword.toLowerCase());
    if (keywordIndex !== -1 && scrollViewRef.current) {
      const scrollPosition = (keywordIndex / pitchData.intro.length) * 500;
      scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
    }
  };

  const autoScrollToPosition = (position) => {
    if (scrollViewRef.current) {
      const scrollPosition = (position / pitchData.intro.length) * 500;
      scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
    }
  };

  const showStarExample = (keyword) => {
    const example = pitchData.starExamples[keyword];
    if (example) {
      Alert.alert(
        `Ejemplo STAR: ${keyword.toUpperCase()}`,
        `🎯 Situación: ${example.situation}\n\n📋 Tarea: ${example.task}\n\n⚡ Acción: ${example.action}\n\n🏆 Resultado: ${example.result}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const renderTeleprompterText = () => {
    const text = pitchData.intro;
    const beforeCurrent = text.substring(0, currentPosition);
    const current = text.substring(currentPosition, currentPosition + 50);
    const afterCurrent = text.substring(currentPosition + 50);

    return (
      <View style={styles.teleprompterContainer}>
        <Text style={styles.textBefore}>{beforeCurrent}</Text>
        <Text style={styles.textCurrent}>{current}</Text>
        <Text style={styles.textAfter}>{afterCurrent}</Text>
      </View>
    );
  };

  const renderContextualNotes = () => {
    if (showContextualNotes.length === 0) return null;

    return (
      <Animated.View 
        style={[
          styles.contextualNotesContainer, 
          { opacity: notesAnim, transform: [{ translateY: notesAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })}]}
        ]}
      >
        <Text style={styles.notesTitle}>💡 Notas de apoyo:</Text>
        {showContextualNotes.map((keyword) => (
          <View key={keyword} style={styles.noteItem}>
            <Text style={styles.noteKeyword}>{keyword.toUpperCase()}:</Text>
            {pitchData.contextualNotes[keyword].map((note, index) => (
              <Text key={index} style={styles.noteText}>• {note}</Text>
            ))}
          </View>
        ))}
      </Animated.View>
    );
  };

  const saveEditedIntro = async () => {
    const updatedData = { ...pitchData, intro: editedIntro };
    await savePitchData(updatedData);
    setEditModalVisible(false);
    setCurrentPosition(0);
    Alert.alert('¡Guardado!', 'Tu pitch ha sido actualizado');
  };

  const resetPosition = () => {
    setCurrentPosition(0);
    setShowContextualNotes([]);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  return (
    <View style={[styles.container, discreteMode && styles.discreteContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>🎤 PITCH TELEPROMPTER</Text>
        
        <TouchableOpacity 
          onPress={() => setDiscreteMode(!discreteMode)}
          style={styles.modeButton}
        >
          <Text style={styles.modeButtonText}>
            {discreteMode ? '🔍' : '📱'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Teleprompter Display */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.teleprompterScroll}
        showsVerticalScrollIndicator={false}
      >
        {renderTeleprompterText()}
      </ScrollView>

      {/* Contextual Notes */}
      {renderContextualNotes()}

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.listenButton, isListening && styles.listenButtonActive]}
          onPress={isListening ? stopListening : startListening}
        >
          <Text style={styles.listenButtonText}>
            {isListening ? '🔴 DETENER' : '🎙️ ESCUCHAR'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetPosition}>
          <Text style={styles.resetButtonText}>🔄 REINICIAR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => setEditModalVisible(true)}
        >
          <Text style={styles.editButtonText}>✏️ EDITAR</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(currentPosition / pitchData.intro.length) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((currentPosition / pitchData.intro.length) * 100)}%
        </Text>
      </View>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ EDITAR PITCH</Text>
            
            <TextInput
              style={styles.editTextInput}
              value={editedIntro}
              onChangeText={setEditedIntro}
              placeholder="Escribe tu pitch aquí..."
              placeholderTextColor={COLORS.lightGray}
              multiline
              numberOfLines={10}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveEditedIntro}
              >
                <Text style={styles.modalButtonText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.helpText}>
              💡 Tip: Incluye palabras clave como .NET, React, Azure, SQL para activar notas contextuales automáticas
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  discreteContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: width * 0.4,
    height: height * 0.6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.darkGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    color: COLORS.neonRed,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 20,
  },
  teleprompterScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  teleprompterContainer: {
    minHeight: height * 0.8,
    paddingBottom: 50,
  },
  textBefore: {
    fontSize: 16,
    color: COLORS.gray,
    lineHeight: 28,
    opacity: 0.6,
  },
  textCurrent: {
    fontSize: 20,
    color: COLORS.white,
    lineHeight: 32,
    fontWeight: 'bold',
    backgroundColor: COLORS.neonRed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  textAfter: {
    fontSize: 16,
    color: COLORS.lightGray,
    lineHeight: 28,
    opacity: 0.8,
  },
  contextualNotesContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: COLORS.darkGray,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  notesTitle: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  noteItem: {
    marginBottom: 8,
  },
  noteKeyword: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noteText: {
    color: COLORS.white,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
  },
  listenButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    flex: 1,
    marginRight: 5,
  },
  listenButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.white,
  },
  listenButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 5,
  },
  resetButtonText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
    marginLeft: 5,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.darkGray,
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.neonRed,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    backgroundColor: COLORS.darkGray,
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 15,
    padding: 25,
    borderWidth: 2,
    borderColor: COLORS.neonRed,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.neonRed,
    textAlign: 'center',
    marginBottom: 20,
  },
  editTextInput: {
    backgroundColor: COLORS.background,
    color: COLORS.white,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
    fontSize: 16,
    minHeight: 200,
    maxHeight: 300,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  modalCancelButton: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalSaveButton: {
    backgroundColor: COLORS.neonRed,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 11,
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 16,
  },
});