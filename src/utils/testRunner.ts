import { localAuthService } from '../services/authService.local';
import { databaseService } from '../services/databaseService.platform';
import { debugLogger, logUserAction } from './debugLogger';

export interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

class TestRunner {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    debugLogger.info('Starting comprehensive app tests');
    
    // Authentication Tests
    await this.runTest('Auth: Sign Up New User', this.testSignUp.bind(this));
    await this.runTest('Auth: Sign In Valid User', this.testSignIn.bind(this));
    await this.runTest('Auth: Sign In Invalid Password', this.testSignInInvalidPassword.bind(this));
    await this.runTest('Auth: Sign Out', this.testSignOut.bind(this));
    
    // User Progress Tests
    await this.runTest('Progress: Add XP', this.testAddXP.bind(this));
    await this.runTest('Progress: Update Streak', this.testUpdateStreak.bind(this));
    
    // Database Tests
    await this.runTest('Database: Add Flashcard', this.testAddFlashcard.bind(this));
    await this.runTest('Database: Get Flashcards', this.testGetFlashcards.bind(this));
    
    // Debug Logger Tests
    await this.runTest('Debug: Logging Functions', this.testDebugLogging.bind(this));
    
    debugLogger.success(`All tests completed: ${this.getPassCount()}/${this.results.length} passed`);
    return this.results;
  }

  private async runTest(name: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: 'PASS',
        message: 'Test completed successfully',
        duration,
      });
      debugLogger.success(`✅ ${name} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        duration,
      });
      debugLogger.error(`❌ ${name} - ${error instanceof Error ? error.message : String(error)} (${duration}ms)`);
    }
  }

  // Authentication Tests
  private async testSignUp(): Promise<void> {
    const testEmail = `test_${Date.now()}@example.com`;
    const testUsername = `test_user_${Date.now()}`;
    
    const result = await localAuthService.signUp(testEmail, 'password123', testUsername, 'Test User');
    
    if (result.error) {
      throw new Error(`Sign up failed: ${result.error}`);
    }
    
    if (!result.user) {
      throw new Error('Sign up did not return user');
    }
    
    if (result.user.email !== testEmail) {
      throw new Error('User email does not match');
    }
  }

  private async testSignIn(): Promise<void> {
    // First create a test user
    const testEmail = `signin_test_${Date.now()}@example.com`;
    const testUsername = `signin_test_${Date.now()}`;
    const password = 'password123';
    
    const signUpResult = await localAuthService.signUp(testEmail, password, testUsername);
    if (signUpResult.error) {
      throw new Error(`Setup failed: ${signUpResult.error}`);
    }
    
    // Sign out first
    await localAuthService.signOut();
    
    // Now test sign in
    const signInResult = await localAuthService.signIn(testEmail, password);
    
    if (signInResult.error) {
      throw new Error(`Sign in failed: ${signInResult.error}`);
    }
    
    if (!signInResult.user) {
      throw new Error('Sign in did not return user');
    }
    
    if (signInResult.user.email !== testEmail) {
      throw new Error('Signed in user email does not match');
    }
  }

  private async testSignInInvalidPassword(): Promise<void> {
    const testEmail = `invalid_test_${Date.now()}@example.com`;
    const testUsername = `invalid_test_${Date.now()}`;
    
    // Create user first
    await localAuthService.signUp(testEmail, 'correct_password', testUsername);
    await localAuthService.signOut();
    
    // Try to sign in with wrong password
    const result = await localAuthService.signIn(testEmail, 'wrong_password');
    
    if (!result.error) {
      throw new Error('Sign in with invalid password should have failed');
    }
    
    if (result.user) {
      throw new Error('Sign in with invalid password should not return user');
    }
  }

  private async testSignOut(): Promise<void> {
    // Make sure we're signed in
    const testEmail = `signout_test_${Date.now()}@example.com`;
    await localAuthService.signUp(testEmail, 'password123', `signout_test_${Date.now()}`);
    
    const result = await localAuthService.signOut();
    
    if (result.error) {
      throw new Error(`Sign out failed: ${result.error}`);
    }
    
    const currentUser = await localAuthService.getCurrentUser();
    if (currentUser) {
      throw new Error('User should be null after sign out');
    }
  }

  // Progress Tests
  private async testAddXP(): Promise<void> {
    // Make sure we have a user
    const testEmail = `xp_test_${Date.now()}@example.com`;
    const signUpResult = await localAuthService.signUp(testEmail, 'password123', `xp_test_${Date.now()}`);
    
    if (!signUpResult.user) {
      throw new Error('Setup failed - no user created');
    }
    
    const initialXP = signUpResult.user.xp;
    const xpToAdd = 50;
    
    const result = await localAuthService.addXP(xpToAdd, 'test');
    
    if (result.newXP !== initialXP + xpToAdd) {
      throw new Error(`XP not added correctly. Expected: ${initialXP + xpToAdd}, Got: ${result.newXP}`);
    }
  }

  private async testUpdateStreak(): Promise<void> {
    // Make sure we have a user
    const testEmail = `streak_test_${Date.now()}@example.com`;
    const signUpResult = await localAuthService.signUp(testEmail, 'password123', `streak_test_${Date.now()}`);
    
    if (!signUpResult.user) {
      throw new Error('Setup failed - no user created');
    }
    
    const result = await localAuthService.updateStreak();
    
    if (typeof result.streak !== 'number' || result.streak < 1) {
      throw new Error('Streak update did not return valid streak number');
    }
  }

  // Database Tests
  private async testAddFlashcard(): Promise<void> {
    const testCard = {
      question: 'Test Question',
      answer: 'Test Answer',
      category: 'Test Category'
    };
    
    const result = await databaseService.addFlashcard(testCard);
    
    if (!result.id) {
      throw new Error('Add flashcard did not return valid ID');
    }
  }

  private async testGetFlashcards(): Promise<void> {
    // Add a test card first
    const testCard = {
      question: 'Get Test Question',
      answer: 'Get Test Answer',
      category: 'Get Test Category'
    };
    
    await databaseService.addFlashcard(testCard);
    
    const flashcards = await databaseService.getFlashcards();
    
    if (!Array.isArray(flashcards)) {
      throw new Error('getFlashcards did not return array');
    }
    
    const foundCard = flashcards.find(card => card.question === testCard.question);
    if (!foundCard) {
      throw new Error('Added flashcard not found in results');
    }
  }

  // Debug Logger Tests
  private async testDebugLogging(): Promise<void> {
    const initialLogCount = debugLogger.getLogs().length;
    
    debugLogger.info('Test info message');
    debugLogger.error('Test error message');
    debugLogger.success('Test success message');
    debugLogger.warning('Test warning message');
    
    const finalLogCount = debugLogger.getLogs().length;
    
    if (finalLogCount !== initialLogCount + 4) {
      throw new Error(`Expected 4 new logs, got ${finalLogCount - initialLogCount}`);
    }
  }

  // Results helpers
  getPassCount(): number {
    return this.results.filter(result => result.status === 'PASS').length;
  }

  getFailCount(): number {
    return this.results.filter(result => result.status === 'FAIL').length;
  }

  getFailedTests(): TestResult[] {
    return this.results.filter(result => result.status === 'FAIL');
  }

  getTotalDuration(): number {
    return this.results.reduce((total, result) => total + result.duration, 0);
  }

  generateReport(): string {
    const passed = this.getPassCount();
    const failed = this.getFailCount();
    const total = this.results.length;
    const duration = this.getTotalDuration();

    let report = `\n🧪 TEST REPORT\n`;
    report += `===============\n`;
    report += `Total Tests: ${total}\n`;
    report += `✅ Passed: ${passed}\n`;
    report += `❌ Failed: ${failed}\n`;
    report += `⏱️ Duration: ${duration}ms\n\n`;

    if (failed > 0) {
      report += `FAILED TESTS:\n`;
      report += `-------------\n`;
      this.getFailedTests().forEach(test => {
        report += `❌ ${test.name}: ${test.message}\n`;
      });
      report += `\n`;
    }

    report += `DETAILED RESULTS:\n`;
    report += `----------------\n`;
    this.results.forEach(test => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      report += `${status} ${test.name} (${test.duration}ms)\n`;
      if (test.status === 'FAIL') {
        report += `   Error: ${test.message}\n`;
      }
    });

    return report;
  }
}

export const testRunner = new TestRunner();
export default testRunner;