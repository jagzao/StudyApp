import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { debugLogger, logUserAction } from '../utils/debugLogger';
import { localAuthService } from '../services/authService.local';
import { testRunner, TestResult } from '../utils/testRunner';
import { COLORS } from '../constants/colors';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [authStats, setAuthStats] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'auth' | 'tests' | 'actions'>('logs');

  useEffect(() => {
    if (visible) {
      loadDebugData();
    }
  }, [visible]);

  const loadDebugData = async () => {
    // Load recent logs
    const recentLogs = debugLogger.getRecentLogs(50);
    setLogs(recentLogs);

    // Load auth stats
    try {
      const stats = await localAuthService.getStats();
      setAuthStats(stats);
    } catch (error) {
      console.error('Error loading auth stats:', error);
    }
  };

  const clearLogs = () => {
    debugLogger.clearLogs();
    setLogs([]);
    logUserAction('Clear Debug Logs', 'DebugPanel');
  };

  const clearAuthData = async () => {
    await localAuthService.clearAllData();
    logUserAction('Clear Auth Data', 'DebugPanel');
    loadDebugData();
  };

  const testUserActions = () => {
    logUserAction('Test Action 1', 'DebugPanel', { test: true });
    logUserAction('Test Action 2', 'DebugPanel', { value: 123 });
    logUserAction('Test Action 3', 'DebugPanel', { success: false });
    loadDebugData();
  };

  const runComprehensiveTests = async () => {
    setIsRunningTests(true);
    logUserAction('Start Comprehensive Tests', 'DebugPanel');
    
    try {
      const results = await testRunner.runAllTests();
      setTestResults(results);
      
      const report = testRunner.generateReport();
      debugLogger.info('Test Results', { 
        passed: testRunner.getPassCount(), 
        failed: testRunner.getFailCount(), 
        total: results.length 
      });
      
      logUserAction('Complete Comprehensive Tests', 'DebugPanel', {
        passed: testRunner.getPassCount(),
        failed: testRunner.getFailCount(),
        duration: testRunner.getTotalDuration()
      });
    } catch (error) {
      debugLogger.error('Test runner failed', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsRunningTests(false);
      loadDebugData();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔧 Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
              Logs ({logs.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'auth' && styles.activeTab]}
            onPress={() => setActiveTab('auth')}
          >
            <Text style={[styles.tabText, activeTab === 'auth' && styles.activeTabText]}>
              Auth
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'tests' && styles.activeTab]}
            onPress={() => setActiveTab('tests')}
          >
            <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>
              Tests ({testResults.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'actions' && styles.activeTab]}
            onPress={() => setActiveTab('actions')}
          >
            <Text style={[styles.tabText, activeTab === 'actions' && styles.activeTabText]}>
              Actions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {activeTab === 'logs' && (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Logs</Text>
                <TouchableOpacity onPress={clearLogs} style={styles.button}>
                  <Text style={styles.buttonText}>Clear Logs</Text>
                </TouchableOpacity>
              </View>
              
              {logs.length === 0 ? (
                <Text style={styles.emptyText}>No logs available</Text>
              ) : (
                logs.map((log, index) => (
                  <View key={index} style={styles.logEntry}>
                    <Text style={[
                      styles.logText,
                      log.includes('ERROR') && styles.errorLog,
                      log.includes('SUCCESS') && styles.successLog,
                      log.includes('WARNING') && styles.warningLog,
                    ]}>
                      {log}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'auth' && (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Authentication Status</Text>
                <TouchableOpacity onPress={clearAuthData} style={styles.dangerButton}>
                  <Text style={styles.buttonText}>⚠️ Clear Auth Data</Text>
                </TouchableOpacity>
              </View>
              
              {authStats && (
                <View style={styles.statsContainer}>
                  <Text style={styles.statItem}>Total Users: {authStats.totalUsers}</Text>
                  <Text style={styles.statItem}>Current User: {authStats.currentUser || 'None'}</Text>
                  <Text style={styles.statItem}>Last Active: {authStats.lastActive || 'Never'}</Text>
                  <Text style={styles.statItem}>Authenticated: {localAuthService.isAuthenticated() ? '✅ Yes' : '❌ No'}</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'tests' && (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Comprehensive Testing</Text>
                <TouchableOpacity 
                  onPress={runComprehensiveTests} 
                  style={[styles.button, isRunningTests && styles.buttonDisabled]}
                  disabled={isRunningTests}
                >
                  <Text style={styles.buttonText}>
                    {isRunningTests ? '🧪 Running Tests...' : '🧪 Run All Tests'}
                  </Text>
                </TouchableOpacity>
              </View>

              {testResults.length > 0 && (
                <View style={styles.testResultsContainer}>
                  <Text style={styles.testResultsTitle}>
                    Latest Results: {testRunner.getPassCount()}/{testResults.length} passed
                  </Text>
                  
                  {testResults.map((test, index) => (
                    <View key={index} style={styles.testResultItem}>
                      <Text style={[
                        styles.testResultStatus,
                        { color: test.status === 'PASS' ? COLORS.success : COLORS.error }
                      ]}>
                        {test.status === 'PASS' ? '✅' : '❌'} {test.name}
                      </Text>
                      <Text style={styles.testResultDuration}>{test.duration}ms</Text>
                      {test.status === 'FAIL' && (
                        <Text style={styles.testResultError}>{test.message}</Text>
                      )}
                    </View>
                  ))}

                  <View style={styles.testSummaryContainer}>
                    <Text style={styles.testSummaryTitle}>Summary:</Text>
                    <Text style={styles.testSummaryText}>
                      • Total Duration: {testRunner.getTotalDuration()}ms
                    </Text>
                    <Text style={styles.testSummaryText}>
                      • Success Rate: {Math.round((testRunner.getPassCount() / testResults.length) * 100)}%
                    </Text>
                    {testRunner.getFailCount() > 0 && (
                      <Text style={[styles.testSummaryText, { color: COLORS.error }]}>
                        • {testRunner.getFailCount()} test(s) need attention
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'actions' && (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Test Actions</Text>
              </View>
              
              <TouchableOpacity onPress={testUserActions} style={styles.button}>
                <Text style={styles.buttonText}>Generate Test Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={loadDebugData} style={styles.button}>
                <Text style={styles.buttonText}>Refresh Data</Text>
              </TouchableOpacity>

              <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>Debug Info:</Text>
                <Text style={styles.infoText}>• Logs persist between app restarts</Text>
                <Text style={styles.infoText}>• Auth data is stored locally</Text>
                <Text style={styles.infoText}>• Use this panel to troubleshoot issues</Text>
                <Text style={styles.infoText}>• Clear data if you need fresh start</Text>
              </View>
            </View>
          )}
        </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.neonRed,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: COLORS.neonRed,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  dangerButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  logEntry: {
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.secondary,
  },
  logText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  errorLog: {
    color: COLORS.error,
  },
  successLog: {
    color: COLORS.success,
  },
  warningLog: {
    color: COLORS.warning,
  },
  statsContainer: {
    paddingVertical: 20,
  },
  statItem: {
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 10,
  },
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
  },
  infoTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  testResultsContainer: {
    paddingVertical: 20,
  },
  testResultsTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  testResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 6,
  },
  testResultStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  testResultDuration: {
    color: COLORS.gray,
    fontSize: 11,
    marginBottom: 2,
  },
  testResultError: {
    color: COLORS.error,
    fontSize: 11,
    fontStyle: 'italic',
  },
  testSummaryContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: COLORS.darkGray,
    borderRadius: 8,
  },
  testSummaryTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testSummaryText: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 4,
  },
});