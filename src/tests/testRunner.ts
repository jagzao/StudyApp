/**
 * Comprehensive Test Runner for StudyApp
 * Validates the complete application flow and functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { configService } from '../services/configService';
import { databaseService } from '../services/databaseService.platform';

// Mock AsyncStorage for testing
const mockAsyncStorage = {
  storage: new Map(),
  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  },
  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach(key => this.storage.delete(key));
  },
  clear() {
    this.storage.clear();
  }
};

// Replace AsyncStorage with mock
Object.assign(AsyncStorage, mockAsyncStorage);

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

class TestRunner {
  private results: TestSuite[] = [];

  async runTest(testName: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      return {
        testName,
        passed: true,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }

  async runSuite(suiteName: string, tests: Array<{name: string, fn: () => Promise<void>}>): Promise<TestSuite> {
    const suiteStartTime = Date.now();
    const results: TestResult[] = [];

    console.log(`\n🧪 Running test suite: ${suiteName}`);
    console.log('='.repeat(50));

    for (const test of tests) {
      console.log(`\n  Running: ${test.name}...`);
      const result = await this.runTest(test.name, test.fn);
      results.push(result);
      
      if (result.passed) {
        console.log(`  ✅ ${test.name} (${result.duration}ms)`);
      } else {
        console.log(`  ❌ ${test.name} (${result.duration}ms)`);
        console.log(`     Error: ${result.error}`);
      }
    }

    const totalDuration = Date.now() - suiteStartTime;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;

    const suite: TestSuite = {
      suiteName,
      results,
      totalTests: tests.length,
      passedTests,
      failedTests,
      totalDuration
    };

    this.results.push(suite);

    console.log(`\n📊 Suite Summary: ${suiteName}`);
    console.log(`   Total: ${suite.totalTests} tests`);
    console.log(`   Passed: ${suite.passedTests} tests`);
    console.log(`   Failed: ${suite.failedTests} tests`);
    console.log(`   Duration: ${suite.totalDuration}ms`);

    return suite;
  }

  generateReport(): string {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.totalTests, 0);
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failedTests, 0);
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.totalDuration, 0);

    let report = '\n' + '='.repeat(60) + '\n';
    report += '🏁 TEST EXECUTION COMPLETE\n';
    report += '='.repeat(60) + '\n\n';

    report += `📈 OVERALL RESULTS:\n`;
    report += `   Total Tests: ${totalTests}\n`;
    report += `   Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)\n`;
    report += `   Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)\n`;
    report += `   Total Duration: ${totalDuration}ms\n\n`;

    // Suite breakdown
    report += '📋 SUITE BREAKDOWN:\n';
    this.results.forEach(suite => {
      const passRate = ((suite.passedTests / suite.totalTests) * 100).toFixed(1);
      report += `\n  ${suite.suiteName}:\n`;
      report += `    Tests: ${suite.totalTests} | Passed: ${suite.passedTests} | Failed: ${suite.failedTests}\n`;
      report += `    Pass Rate: ${passRate}% | Duration: ${suite.totalDuration}ms\n`;
      
      // Show failed tests
      const failedTests = suite.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        report += `    Failed Tests:\n`;
        failedTests.forEach(test => {
          report += `      ❌ ${test.testName}: ${test.error}\n`;
        });
      }
    });

    return report;
  }

  async cleanup() {
    // Clean up test data
    mockAsyncStorage.clear();
    
    // Close database connections if open
    try {
      await databaseService.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Test Suites
const configServiceTests = [
  {
    name: 'Should initialize config service',
    fn: async () => {
      await configService.initialize();
      if (!configService.isConfigInitialized()) {
        throw new Error('Config service not initialized');
      }
    }
  },
  {
    name: 'Should save and retrieve API key',
    fn: async () => {
      const testKey = 'sk-test1234567890abcdef';
      await configService.setOpenAIApiKey(testKey);
      const retrieved = await configService.getOpenAIApiKey();
      if (retrieved !== testKey) {
        throw new Error(`Expected ${testKey}, got ${retrieved}`);
      }
    }
  },
  {
    name: 'Should handle missing API key',
    fn: async () => {
      await configService.clearOpenAIApiKey();
      const hasKey = await configService.hasOpenAIApiKey();
      if (hasKey) {
        throw new Error('Should not have API key after clearing');
      }
    }
  },
  {
    name: 'Should manage onboarding status',
    fn: async () => {
      await configService.resetOnboarding();
      let completed = await configService.hasCompletedOnboarding();
      if (completed) {
        throw new Error('Onboarding should not be complete after reset');
      }
      
      await configService.markOnboardingComplete();
      completed = await configService.hasCompletedOnboarding();
      if (!completed) {
        throw new Error('Onboarding should be complete after marking');
      }
    }
  }
];

const databaseServiceTests = [
  {
    name: 'Should initialize database',
    fn: async () => {
      await databaseService.initialize();
      if (!databaseService.isInitialized) {
        throw new Error('Database not initialized');
      }
    }
  },
  {
    name: 'Should have seeded initial data',
    fn: async () => {
      const flashcards = await databaseService.getFlashcards();
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error('No initial flashcards found');
      }
    }
  },
  {
    name: 'Should perform CRUD operations',
    fn: async () => {
      const newCard = {
        question: 'Test Question',
        answer: 'Test Answer',
        category: 'Test',
        difficulty: 'Beginner' as const,
      };
      
      // Create
      const cardId = await databaseService.addFlashcard(newCard);
      if (typeof cardId !== 'number') {
        throw new Error('Failed to create flashcard');
      }
      
      // Read
      const flashcards = await databaseService.getFlashcards();
      const createdCard = flashcards.find(card => card.id === cardId);
      if (!createdCard) {
        throw new Error('Failed to read created flashcard');
      }
      
      // Update
      const updates = { question: 'Updated Question' };
      await databaseService.updateFlashcard(cardId, updates);
      const updatedFlashcards = await databaseService.getFlashcards();
      const updatedCard = updatedFlashcards.find(card => card.id === cardId);
      if (updatedCard?.question !== updates.question) {
        throw new Error('Failed to update flashcard');
      }
      
      // Delete
      await databaseService.deleteFlashcard(cardId);
      const finalFlashcards = await databaseService.getFlashcards();
      const deletedCard = finalFlashcards.find(card => card.id === cardId);
      if (deletedCard) {
        throw new Error('Failed to delete flashcard');
      }
    }
  },
  {
    name: 'Should track analytics',
    fn: async () => {
      const analytics = await databaseService.getStudyAnalytics(7);
      if (typeof analytics.totalQuestions !== 'number' ||
          typeof analytics.accuracy !== 'number' ||
          !Array.isArray(analytics.categoryBreakdown)) {
        throw new Error('Invalid analytics structure');
      }
    }
  }
];

const integrationTests = [
  {
    name: 'Should complete full app initialization flow',
    fn: async () => {
      // Initialize all core services
      await configService.initialize();
      await databaseService.initialize();
      
      // Verify initialization
      if (!configService.isConfigInitialized() || !databaseService.isInitialized) {
        throw new Error('Core services not properly initialized');
      }
    }
  },
  {
    name: 'Should handle API key flow',
    fn: async () => {
      // Start without API key
      await configService.clearOpenAIApiKey();
      let hasKey = await configService.hasOpenAIApiKey();
      if (hasKey) {
        throw new Error('Should start without API key');
      }
      
      // Configure API key
      await configService.setOpenAIApiKey('sk-integration-test');
      hasKey = await configService.hasOpenAIApiKey();
      if (!hasKey) {
        throw new Error('Should have API key after configuration');
      }
    }
  },
  {
    name: 'Should complete study session flow',
    fn: async () => {
      // Get initial flashcards
      const flashcards = await databaseService.getFlashcards();
      if (flashcards.length === 0) {
        throw new Error('No flashcards available for study');
      }
      
      // Simulate study session
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      await databaseService.recordStudySession(startTime, endTime, 10, 8, 30);
      
      // Verify session recorded
      const analytics = await databaseService.getStudyAnalytics(1);
      if (analytics.totalQuestions < 10) {
        throw new Error('Study session not properly recorded');
      }
    }
  }
];

// Main test execution
export async function runAllTests(): Promise<void> {
  const runner = new TestRunner();

  console.log('🚀 Starting StudyApp Test Suite');
  console.log('⏰ ' + new Date().toISOString());

  try {
    // Run test suites
    await runner.runSuite('Config Service Tests', configServiceTests);
    await runner.runSuite('Database Service Tests', databaseServiceTests);
    await runner.runSuite('Integration Tests', integrationTests);

    // Generate and display report
    const report = runner.generateReport();
    console.log(report);

    // Determine exit code
    const totalFailed = runner.results.reduce((sum, suite) => sum + suite.failedTests, 0);
    if (totalFailed > 0) {
      console.log('❌ Tests failed. Check the report above for details.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed!');
    }
  } finally {
    await runner.cleanup();
  }
}

// Auto-run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('🔥 Test runner crashed:', error);
    process.exit(1);
  });
}