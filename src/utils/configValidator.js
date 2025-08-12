// Configuration validator for deployment
// This utility validates that all required environment variables are set

const requiredConfigs = {
  development: [
    // Required for basic functionality
    'NODE_ENV',
  ],
  staging: [
    'NODE_ENV',
    'EAS_PROJECT_ID',
  ],
  production: [
    'NODE_ENV',
    'EAS_PROJECT_ID',
    // Add more production-required vars here
  ]
};

const optionalConfigs = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'FIREBASE_API_KEY',
  'FIREBASE_PROJECT_ID',
  'ANALYTICS_ENABLED',
  'VOICE_RECOGNITION_ENABLED',
  'AI_TUTOR_ENABLED',
  'SOCIAL_FEATURES_ENABLED',
  'CLOUD_SYNC_ENABLED'
];

function validateConfiguration() {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🔍 Validating configuration for environment: ${env}`);
  
  const required = requiredConfigs[env] || requiredConfigs.development;
  const missing = [];
  const present = [];
  
  // Check required configurations
  required.forEach(config => {
    if (!process.env[config]) {
      missing.push(config);
    } else {
      present.push(config);
    }
  });
  
  // Check optional configurations
  const optionalPresent = [];
  const optionalMissing = [];
  
  optionalConfigs.forEach(config => {
    if (process.env[config]) {
      optionalPresent.push(config);
    } else {
      optionalMissing.push(config);
    }
  });
  
  // Report results
  console.log('✅ Required configurations present:', present.length > 0 ? present : 'None required');
  
  if (missing.length > 0) {
    console.log('❌ Missing required configurations:', missing);
    console.log('   Please check your .env file or environment variables');
    process.exit(1);
  }
  
  console.log('📋 Optional configurations:');
  if (optionalPresent.length > 0) {
    console.log('   ✅ Present:', optionalPresent);
  }
  if (optionalMissing.length > 0) {
    console.log('   ⚠️  Missing:', optionalMissing);
    console.log('   💡 These are optional but enable additional features');
  }
  
  // Feature availability report
  console.log('\n🎯 Feature Availability:');
  console.log(`   🤖 AI Tutor: ${process.env.OPENAI_API_KEY ? '✅ Available' : '❌ Requires OPENAI_API_KEY'}`);
  console.log(`   ☁️  Cloud Sync: ${process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? '✅ Available' : '❌ Requires Supabase config'}`);
  console.log(`   📊 Analytics: ${process.env.FIREBASE_PROJECT_ID ? '✅ Available' : '❌ Requires Firebase config'}`);
  console.log(`   🎤 Voice Recognition: ${process.env.VOICE_RECOGNITION_ENABLED !== 'false' ? '✅ Available' : '❌ Disabled'}`);
  console.log(`   👥 Social Features: ${process.env.SOCIAL_FEATURES_ENABLED !== 'false' ? '✅ Available' : '❌ Disabled'}`);
  
  console.log('\n🎉 Configuration validation completed successfully!');
}

// Run validation if called directly
if (require.main === module) {
  validateConfiguration();
}

module.exports = {
  validateConfiguration,
  requiredConfigs,
  optionalConfigs
};