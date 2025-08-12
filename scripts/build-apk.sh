#!/bin/bash

# 🚀 BUILD APK SCRIPT - Study AI
# Este script automatiza el proceso de construcción del APK

set -e  # Exit on any error

echo "🔧 Starting APK build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if EAS is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI is not installed. Installing..."
    npm install -g @expo/eas-cli
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf android ios .expo node_modules/.cache

# Install dependencies
print_status "Installing dependencies..."
npm install

# Check TypeScript compilation
print_status "Checking TypeScript compilation..."
if command -v tsc &> /dev/null; then
    npx tsc --noEmit
    print_success "TypeScript compilation check passed"
else
    print_warning "TypeScript not found, skipping compilation check"
fi

# Pre-build validation
print_status "Validating project configuration..."

# Check if app.json exists and is valid
if [ ! -f "app.json" ]; then
    print_error "app.json not found!"
    exit 1
fi

# Check if eas.json exists
if [ ! -f "eas.json" ]; then
    print_error "eas.json not found!"
    exit 1
fi

# Validate app.json
node -e "
try {
    const config = require('./app.json');
    if (!config.expo.name) throw new Error('App name missing');
    if (!config.expo.slug) throw new Error('App slug missing');
    if (!config.expo.version) throw new Error('App version missing');
    if (!config.expo.sdkVersion) throw new Error('SDK version missing');
    console.log('✅ app.json validation passed');
} catch (error) {
    console.error('❌ app.json validation failed:', error.message);
    process.exit(1);
}
"

# Check EAS project configuration
print_status "Checking EAS project configuration..."
eas project:info || {
    print_warning "EAS project not properly configured"
    print_status "You may need to run: eas build:configure"
}

# Build options
BUILD_PROFILE=${1:-preview}
PLATFORM=${2:-android}

print_status "Building $PLATFORM APK with profile: $BUILD_PROFILE"

# Determine build command based on profile
case $BUILD_PROFILE in
    "preview")
        BUILD_CMD="eas build --platform $PLATFORM --profile preview --clear-cache"
        ;;
    "production")
        BUILD_CMD="eas build --platform $PLATFORM --profile production --clear-cache"
        ;;
    "development")
        BUILD_CMD="eas build --platform $PLATFORM --profile development --clear-cache"
        ;;
    *)
        print_error "Unknown build profile: $BUILD_PROFILE"
        print_status "Available profiles: preview, production, development"
        exit 1
        ;;
esac

# Execute build
print_status "Executing build command: $BUILD_CMD"
eval $BUILD_CMD

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    print_success "Build completed successfully!"
    print_status "🎉 Your APK should be available in your EAS dashboard"
    print_status "📱 Check: https://expo.dev/accounts/jagzao/projects/zaostudy/builds"
else
    print_error "Build failed with exit code: $BUILD_EXIT_CODE"
    print_status "📋 Check the build logs for details"
    exit $BUILD_EXIT_CODE
fi

# QR Code issue resolution
print_status "🔧 Resolving QR code issues..."
print_status "If you're having QR code issues, try these solutions:"
echo ""
echo "1. 📱 Make sure Expo Go app is updated to latest version"
echo "2. 🌐 Ensure both devices are on the same WiFi network"
echo "3. 🔄 Try running: expo start --tunnel"
echo "4. 📡 For development builds, use: expo start --dev-client"
echo "5. 🆔 Use direct URL instead of QR: exp://192.168.x.x:8081"
echo ""

# Development server restart suggestion
print_status "To test the new build locally, run:"
echo "  npm start"
echo "  # or"
echo "  expo start --clear"
echo ""

print_success "Build script completed! 🚀"