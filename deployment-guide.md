# 🚀 Study AI - Deployment Guide

This guide covers deployment configurations for Study AI across different environments and platforms.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Development Setup](#development-setup)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Platform-Specific Guides](#platform-specific-guides)
- [CI/CD Setup](#cicd-setup)
- [Monitoring & Analytics](#monitoring--analytics)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Node.js 18+ 
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Git
- iOS Simulator (macOS) / Android Emulator

### Third-party Services
- [Expo Account](https://expo.dev/) - For EAS Build & Updates
- [OpenAI API Key](https://platform.openai.com/api-keys) - For AI features
- [Supabase Project](https://supabase.com/) - For cloud database
- [Firebase Project](https://console.firebase.google.com/) - For analytics
- Apple Developer Account (iOS)
- Google Play Console Account (Android)

## Environment Configuration

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Fill in Required Values
Edit `.env` with your actual service credentials:

```env
OPENAI_API_KEY=sk-your-actual-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key
# ... other configurations
```

### 3. Verify Configuration
```bash
npm run test:config
```

## Development Setup

### Initial Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platforms
npm run ios        # iOS Simulator
npm run android    # Android Emulator
npm run web        # Web Browser
```

### Development Features
- Hot reloading enabled
- Debug logging active
- Mock data available
- Dev tools accessible

## Staging Deployment

### Build for Testing
```bash
# Build preview version
eas build --profile preview --platform all

# Submit to internal testing
eas submit --profile preview --platform ios --auto
```

### Staging Configuration
- Internal distribution
- Test data enabled
- Analytics in debug mode
- Push notifications to development FCM

## Production Deployment

### Pre-deployment Checklist
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation clean (`npm run typecheck`)
- [ ] Linting passed (`npm run lint`)
- [ ] Environment variables configured
- [ ] App store assets prepared
- [ ] Privacy policy updated
- [ ] Terms of service current

### Production Build
```bash
# Create production build
eas build --profile production --platform all

# Submit to app stores
eas submit --profile production --platform all
```

### Production Configuration
- Optimized bundle size
- Performance monitoring enabled
- Crash reporting active
- Production analytics
- Real push notifications

## Platform-Specific Guides

### iOS Deployment

#### Requirements
- Apple Developer Account ($99/year)
- iOS Distribution Certificate
- App Store Connect app record

#### Setup Steps
1. Configure `app.config.js` iOS settings
2. Set up provisioning profiles
3. Configure push notifications
4. Upload to App Store Connect
5. Submit for review

#### iOS-specific Config
```javascript
// app.config.js
ios: {
  bundleIdentifier: "com.studyai.app",
  buildNumber: "1",
  supportsTablet: true,
  infoPlist: {
    NSMicrophoneUsageDescription: "For voice input features",
    NSSpeechRecognitionUsageDescription: "For speech recognition"
  }
}
```

### Android Deployment

#### Requirements
- Google Play Console Account ($25 one-time)
- Android signing key
- Privacy policy URL

#### Setup Steps
1. Generate upload key
2. Configure `app.config.js` Android settings
3. Create app bundle
4. Upload to Google Play Console
5. Release to production

#### Android-specific Config
```javascript
// app.config.js
android: {
  package: "com.studyai.app",
  versionCode: 1,
  permissions: [
    "android.permission.RECORD_AUDIO",
    "android.permission.INTERNET"
  ]
}
```

### Web Deployment

#### Hosting Options
- Vercel (recommended)
- Netlify
- GitHub Pages
- Custom server

#### Build for Web
```bash
# Build web version
npx expo export --platform web

# Deploy to Vercel
npx vercel --prod
```

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Study AI

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm install -g eas-cli
      - run: eas build --profile production --platform all --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

### Environment Secrets

Add these secrets to your repository:
- `EXPO_TOKEN` - Expo access token
- `OPENAI_API_KEY` - OpenAI API key
- `SUPABASE_URL` & `SUPABASE_ANON_KEY` - Supabase credentials

## Monitoring & Analytics

### Production Monitoring
- **Crashlytics**: Real-time crash reporting
- **Performance**: App performance metrics
- **Analytics**: User behavior tracking
- **Sentry**: Error monitoring and alerting

### Key Metrics to Track
- App crashes and errors
- User retention rates
- Feature usage statistics
- API response times
- Study session completion rates

### Setting up Monitoring
```bash
# Install monitoring packages
npm install @sentry/react-native
npx @sentry/wizard -i reactNative -p ios android
```

## Troubleshooting

### Common Build Issues

#### iOS Build Failures
```bash
# Clear iOS build cache
rm -rf ios/build
expo prebuild --clean

# Reset iOS simulator
xcrun simctl erase all
```

#### Android Build Failures
```bash
# Clear Android cache
cd android && ./gradlew clean && cd ..

# Reset Android emulator
$ANDROID_HOME/emulator/emulator -avd Pixel_4_API_30 -wipe-data
```

#### Metro Bundle Issues
```bash
# Clear Metro cache
npx expo start --clear

# Reset React Native cache
npx react-native start --reset-cache
```

### Environment Issues

#### Missing Environment Variables
```bash
# Verify environment setup
node -e "console.log(process.env)"

# Check if .env is loaded
npm run env:check
```

#### Service Integration Problems
```bash
# Test OpenAI connection
npm run test:openai

# Test Supabase connection  
npm run test:supabase

# Test Firebase connection
npm run test:firebase
```

### Performance Issues

#### Large Bundle Size
```bash
# Analyze bundle composition
npx expo install @expo/webpack-config
npm run analyze

# Enable tree shaking
# Configure in metro.config.js
```

#### Slow App Performance
- Enable Hermes engine (React Native 0.70+)
- Optimize images and assets
- Implement lazy loading
- Use performance profiling tools

## Update Strategy

### Over-the-Air (OTA) Updates
```bash
# Publish update to all users
eas update --branch production --message "Bug fixes and improvements"

# Gradual rollout
eas update --branch production --rollout-percentage 25
```

### Version Updates
```bash
# Increment version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0  
npm version major  # 1.1.0 -> 2.0.0

# Build and submit
eas build --profile production --auto-submit
```

## Security Checklist

- [ ] API keys not exposed in client code
- [ ] Secure storage for sensitive data
- [ ] HTTPS only for all network requests
- [ ] Input validation and sanitization
- [ ] Authentication and authorization implemented
- [ ] Regular dependency updates
- [ ] Code obfuscation in production

## Support

### Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)

### Community
- [Expo Discord](https://discord.gg/expo)
- [React Native Community](https://github.com/react-native-community)

### Professional Support
- Expo Support Plans
- React Native consulting services

---

**Happy Deploying! 🚀**

For issues specific to Study AI deployment, please check our troubleshooting guide or create an issue in the repository.