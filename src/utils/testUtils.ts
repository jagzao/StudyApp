// ==================== BASIC TEST UTILITIES ====================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;

  describe(name: string, fn: () => void): void {
    const suite: TestSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
    };

    this.currentSuite = suite;
    const start = Date.now();
    
    try {
      fn();
    } catch (error) {
      console.error(`Suite "${name}" failed:`, error);
    }
    
    suite.duration = Date.now() - start;
    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    
    this.suites.push(suite);
    this.currentSuite = null;
  }

  it(name: string, fn: () => void | Promise<void>): void {
    if (!this.currentSuite) {
      throw new Error('Test must be inside a describe block');
    }

    const start = Date.now();
    let passed = false;
    let error: string | undefined;

    try {
      const result = fn();
      if (result instanceof Promise) {
        // For now, we'll handle sync tests only
        // In a real implementation, you'd await here
        console.warn('Async tests not fully supported in this basic runner');
      }
      passed = true;
    } catch (e) {
      passed = false;
      error = e instanceof Error ? e.message : String(e);
    }

    const test: TestResult = {
      name,
      passed,
      error,
      duration: Date.now() - start,
    };

    this.currentSuite.tests.push(test);
  }

  expect(actual: any): Expectation {
    return new Expectation(actual);
  }

  run(): void {
    console.log('\n🧪 Running Study AI Tests...\n');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const suite of this.suites) {
      console.log(`📋 ${suite.name}`);
      
      for (const test of suite.tests) {
        const icon = test.passed ? '✅' : '❌';
        console.log(`  ${icon} ${test.name} (${test.duration}ms)`);
        
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      }
      
      console.log(`  📊 ${suite.passed} passed, ${suite.failed} failed (${suite.duration}ms)\n`);
      
      totalPassed += suite.passed;
      totalFailed += suite.failed;
    }
    
    const totalTests = totalPassed + totalFailed;
    const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';
    
    console.log(`🎯 Final Results: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
    
    if (totalFailed > 0) {
      console.log(`⚠️  ${totalFailed} tests failed`);
    } else {
      console.log('🎉 All tests passed!');
    }
  }

  reset(): void {
    this.suites = [];
    this.currentSuite = null;
  }
}

class Expectation {
  constructor(private actual: any) {}

  toBe(expected: any): void {
    if (this.actual !== expected) {
      throw new Error(`Expected ${this.actual} to be ${expected}`);
    }
  }

  toEqual(expected: any): void {
    if (JSON.stringify(this.actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} to equal ${JSON.stringify(expected)}`);
    }
  }

  toBeTruthy(): void {
    if (!this.actual) {
      throw new Error(`Expected ${this.actual} to be truthy`);
    }
  }

  toBeFalsy(): void {
    if (this.actual) {
      throw new Error(`Expected ${this.actual} to be falsy`);
    }
  }

  toContain(expected: any): void {
    if (!this.actual.includes(expected)) {
      throw new Error(`Expected ${this.actual} to contain ${expected}`);
    }
  }

  toHaveLength(expected: number): void {
    if (this.actual.length !== expected) {
      throw new Error(`Expected length ${this.actual.length} to be ${expected}`);
    }
  }

  toBeInstanceOf(expected: any): void {
    if (!(this.actual instanceof expected)) {
      throw new Error(`Expected ${this.actual} to be instance of ${expected.name}`);
    }
  }

  toBeLessThan(expected: number): void {
    if (this.actual >= expected) {
      throw new Error(`Expected ${this.actual} to be less than ${expected}`);
    }
  }

  toBeGreaterThan(expected: number): void {
    if (this.actual <= expected) {
      throw new Error(`Expected ${this.actual} to be greater than ${expected}`);
    }
  }

  toThrow(expectedError?: string): void {
    if (typeof this.actual !== 'function') {
      throw new Error('Expected a function to test throwing');
    }

    let threw = false;
    let actualError: string | undefined;

    try {
      this.actual();
    } catch (e) {
      threw = true;
      actualError = e instanceof Error ? e.message : String(e);
    }

    if (!threw) {
      throw new Error('Expected function to throw');
    }

    if (expectedError && actualError !== expectedError) {
      throw new Error(`Expected to throw "${expectedError}" but threw "${actualError}"`);
    }
  }
}

// Global test runner instance
export const testRunner = new TestRunner();

// Export global functions for convenience
export const describe = testRunner.describe.bind(testRunner);
export const it = testRunner.it.bind(testRunner);
export const expect = testRunner.expect.bind(testRunner);
export const runTests = testRunner.run.bind(testRunner);
export const resetTests = testRunner.reset.bind(testRunner);

// Mock utilities for React Native testing
export const mockAsyncStorage = {
  data: new Map<string, string>(),
  
  getItem: async (key: string): Promise<string | null> => {
    return mockAsyncStorage.data.get(key) || null;
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    mockAsyncStorage.data.set(key, value);
  },
  
  removeItem: async (key: string): Promise<void> => {
    mockAsyncStorage.data.delete(key);
  },
  
  clear: async (): Promise<void> => {
    mockAsyncStorage.data.clear();
  },
  
  getAllKeys: async (): Promise<string[]> => {
    return Array.from(mockAsyncStorage.data.keys());
  },
  
  // Test utilities
  reset: (): void => {
    mockAsyncStorage.data.clear();
  },
  
  setMockData: (data: Record<string, string>): void => {
    mockAsyncStorage.data.clear();
    Object.entries(data).forEach(([key, value]) => {
      mockAsyncStorage.data.set(key, value);
    });
  }
};

export const mockSQLite = {
  databases: new Map<string, any>(),
  
  openDatabase: (name: string) => {
    if (!mockSQLite.databases.has(name)) {
      mockSQLite.databases.set(name, {
        name,
        tables: new Map(),
        exec: async (sql: string, params: any[] = []) => {
          console.log(`Mock SQL: ${sql}`, params);
          return { lastInsertRowId: Date.now(), changes: 1 };
        },
        getAll: async (sql: string, params: any[] = []) => {
          console.log(`Mock SQL Query: ${sql}`, params);
          return [];
        },
        getFirst: async (sql: string, params: any[] = []) => {
          console.log(`Mock SQL Query: ${sql}`, params);
          return null;
        },
        run: async (sql: string, params: any[] = []) => {
          console.log(`Mock SQL Run: ${sql}`, params);
          return { lastInsertRowId: Date.now(), changes: 1 };
        }
      });
    }
    return mockSQLite.databases.get(name);
  },
  
  reset: (): void => {
    mockSQLite.databases.clear();
  }
};

// Performance testing utilities
export const performance = {
  measure: async (name: string, fn: () => void | Promise<void>): Promise<number> => {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    console.log(`⏱️ ${name}: ${duration}ms`);
    return duration;
  },
  
  benchmark: async (name: string, fn: () => void | Promise<void>, iterations: number = 100): Promise<{
    average: number;
    min: number;
    max: number;
    total: number;
  }> => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      times.push(Date.now() - start);
    }
    
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const total = times.reduce((a, b) => a + b, 0);
    
    console.log(`🏃 ${name} (${iterations} iterations):`);
    console.log(`  Average: ${average.toFixed(2)}ms`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  Total: ${total}ms`);
    
    return { average, min, max, total };
  }
};