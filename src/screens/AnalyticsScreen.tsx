import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { advancedAnalyticsService } from '../services/advancedAnalyticsService';

const { width } = Dimensions.get('window');

interface CategoryPerformance {
  category: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  trend: 'improving' | 'stable' | 'declining';
  difficulty: 'weak' | 'moderate' | 'strong';
  lastStudied: Date;
}

interface LearningInsight {
  type: 'strength' | 'weakness' | 'recommendation' | 'milestone';
  title: string;
  description: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

interface TimeDistribution {
  hour: number;
  sessions: number;
  avgAccuracy: number;
  totalMinutes: number;
}

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'insights' | 'patterns'>('overview');
  const [loading, setLoading] = useState(true);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<TimeDistribution[]>([]);
  const [streak, setStreak] = useState(0);
  const [heatmapData, setHeatmapData] = useState<{ date: string; value: number }[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load all analytics data in parallel
      const [
        categoryData,
        insightsData,
        timeData,
        streakData,
        heatmapResults
      ] = await Promise.all([
        advancedAnalyticsService.getCategoryPerformance(30),
        advancedAnalyticsService.generateLearningInsights(),
        advancedAnalyticsService.getTimeDistribution(7),
        advancedAnalyticsService.getCurrentStreak(),
        advancedAnalyticsService.getStudyHeatmapData(30)
      ]);

      setCategoryPerformance(categoryData);
      setInsights(insightsData);
      setTimeDistribution(timeData);
      setStreak(streakData);
      setHeatmapData(heatmapResults);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Current Streak */}
      <View style={styles.streakCard}>
        <Text style={styles.streakNumber}>🔥 {streak}</Text>
        <Text style={styles.streakLabel}>Días de racha</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{categoryPerformance.length}</Text>
          <Text style={styles.statLabel}>Categorías</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {categoryPerformance.reduce((sum, c) => sum + c.totalQuestions, 0)}
          </Text>
          <Text style={styles.statLabel}>Preguntas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {categoryPerformance.length > 0 
              ? Math.round(categoryPerformance.reduce((sum, c) => sum + c.accuracy, 0) / categoryPerformance.length)
              : 0}%
          </Text>
          <Text style={styles.statLabel}>Precisión</Text>
        </View>
      </View>

      {/* Study Heatmap */}
      <View style={styles.heatmapSection}>
        <Text style={styles.sectionTitle}>📅 Actividad de Estudio</Text>
        <View style={styles.heatmapGrid}>
          {heatmapData.slice(-21).map((day, index) => (
            <View
              key={index}
              style={[
                styles.heatmapCell,
                {
                  backgroundColor: day.value === 0 ? COLORS.secondary :
                                  day.value === 1 ? COLORS.success + '40' :
                                  day.value === 2 ? COLORS.success + '60' :
                                  day.value === 3 ? COLORS.success + '80' :
                                  COLORS.success
                }
              ]}
            />
          ))}
        </View>
        <Text style={styles.heatmapLegend}>
          Últimas 3 semanas • Verde intenso = más estudio
        </Text>
      </View>

      {/* Top Insights Preview */}
      <View style={styles.insightsPreview}>
        <Text style={styles.sectionTitle}>💡 Insights Principales</Text>
        {insights.slice(0, 2).map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightDescription}>{insight.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCategoriesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>📊 Performance por Categoría</Text>
      {categoryPerformance.map((category, index) => (
        <View key={index} style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryName}>{category.category}</Text>
            <View style={styles.categoryBadges}>
              <Text style={[
                styles.trendBadge,
                category.trend === 'improving' ? styles.trendImproving :
                category.trend === 'declining' ? styles.trendDeclining :
                styles.trendStable
              ]}>
                {category.trend === 'improving' ? '📈' :
                 category.trend === 'declining' ? '📉' : '➡️'}
              </Text>
              <Text style={[
                styles.difficultyBadge,
                category.difficulty === 'strong' ? styles.difficultyStrong :
                category.difficulty === 'weak' ? styles.difficultyWeak :
                styles.difficultyModerate
              ]}>
                {category.difficulty === 'strong' ? '💪' :
                 category.difficulty === 'weak' ? '🔧' : '⚖️'}
              </Text>
            </View>
          </View>
          
          {/* Accuracy Bar */}
          <View style={styles.accuracySection}>
            <Text style={styles.accuracyLabel}>Precisión: {Math.round(category.accuracy)}%</Text>
            <View style={styles.accuracyBar}>
              <View 
                style={[
                  styles.accuracyFill,
                  { 
                    width: `${category.accuracy}%`,
                    backgroundColor: category.accuracy > 80 ? COLORS.success :
                                   category.accuracy > 60 ? COLORS.warning :
                                   COLORS.neonRed
                  }
                ]} 
              />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.categoryStats}>
            <Text style={styles.statText}>
              📝 {category.totalQuestions} preguntas
            </Text>
            <Text style={styles.statText}>
              ⏱️ {Math.round(category.averageTime)}min promedio
            </Text>
            <Text style={styles.statText}>
              📅 {category.lastStudied.toLocaleDateString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderInsightsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>🔍 Insights de Aprendizaje</Text>
      {insights.map((insight, index) => (
        <View key={index} style={[
          styles.insightCard,
          insight.priority === 'high' ? styles.insightHigh :
          insight.priority === 'medium' ? styles.insightMedium :
          styles.insightLow
        ]}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightType}>
              {insight.type === 'strength' ? '💪' :
               insight.type === 'weakness' ? '🎯' :
               insight.type === 'recommendation' ? '💡' : '🏆'}
            </Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
          </View>
          <Text style={styles.insightDescription}>{insight.description}</Text>
          {insight.actionable && (
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Tomar Acción</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const renderPatternsTab = () => {
    const maxSessions = Math.max(...timeDistribution.map(t => t.sessions));
    
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>⏰ Patrones de Estudio</Text>
        
        {/* Time Distribution Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Actividad por Hora del Día</Text>
          <View style={styles.timeChart}>
            {timeDistribution.map((time, index) => (
              <View key={index} style={styles.timeBar}>
                <View
                  style={[
                    styles.timeBarFill,
                    {
                      height: maxSessions > 0 ? `${(time.sessions / maxSessions) * 100}%` : '0%',
                      backgroundColor: time.avgAccuracy > 75 ? COLORS.success :
                                     time.avgAccuracy > 50 ? COLORS.warning :
                                     COLORS.neonRed
                    }
                  ]}
                />
                <Text style={styles.timeLabel}>{time.hour}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartLegend}>
            Verde = Alta precisión • Amarillo = Media • Rojo = Baja
          </Text>
        </View>

        {/* Best Time Recommendation */}
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>⭐ Tu Mejor Momento</Text>
          <Text style={styles.recommendationText}>
            Según tus datos, tu mejor rendimiento es entre las{' '}
            {timeDistribution.reduce((best, current) => 
              current.avgAccuracy > best.avgAccuracy ? current : best
            ).hour}:00 - {timeDistribution.reduce((best, current) => 
              current.avgAccuracy > best.avgAccuracy ? current : best
            ).hour + 1}:00
          </Text>
        </View>
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'overview', label: 'Resumen' },
        { key: 'categories', label: 'Categorías' },
        { key: 'insights', label: 'Insights' },
        { key: 'patterns', label: 'Patrones' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.neonRed} />
        <Text style={styles.loadingText}>Analizando tu progreso...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <TouchableOpacity onPress={loadAnalyticsData}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'insights' && renderInsightsTab()}
        {activeTab === 'patterns' && renderPatternsTab()}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  refreshButton: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.neonRed,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
  },
  streakCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.neonRed,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.neonRed,
    marginBottom: 4,
  },
  streakLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.neonBlue,
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
  },
  heatmapSection: {
    marginBottom: 20,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: 8,
  },
  heatmapCell: {
    width: (width - 60) / 7 - 3,
    height: (width - 60) / 7 - 3,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
  },
  heatmapLegend: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
  },
  insightsPreview: {
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  insightHigh: {
    borderColor: COLORS.neonRed,
  },
  insightMedium: {
    borderColor: COLORS.warning,
  },
  insightLow: {
    borderColor: COLORS.success,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightType: {
    fontSize: 20,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  insightDescription: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: COLORS.neonRed,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  trendBadge: {
    fontSize: 16,
  },
  trendImproving: {},
  trendDeclining: {},
  trendStable: {},
  difficultyBadge: {
    fontSize: 16,
  },
  difficultyStrong: {},
  difficultyWeak: {},
  difficultyModerate: {},
  accuracySection: {
    marginBottom: 12,
  },
  accuracyLabel: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  accuracyBar: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
  },
  timeChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  timeBar: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  timeBarFill: {
    width: '80%',
    borderRadius: 2,
    minHeight: 4,
  },
  timeLabel: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 4,
  },
  chartLegend: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  recommendationText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
});