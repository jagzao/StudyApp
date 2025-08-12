import { Platform } from 'react-native';

// Dynamic import based on platform
let databaseService: any;

if (Platform.OS === 'web') {
  // Use web-compatible version
  const webService = require('./databaseService.web');
  databaseService = webService.default;
} else {
  // Use native SQLite version
  const nativeService = require('./databaseService');
  databaseService = nativeService.default;
}

export { databaseService };
export default databaseService;