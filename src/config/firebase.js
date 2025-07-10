import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Simplified Firebase configuration with error handling
let app = null;
let auth = null;
let db = null;

try {
  // Firebase configuration with fallback values
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:demo-app-id"
  };

  // Only initialize if we have a proper API key
  const hasValidConfig = firebaseConfig.apiKey && 
                        firebaseConfig.apiKey !== "demo-api-key" && 
                        firebaseConfig.projectId && 
                        firebaseConfig.projectId !== "demo-project";

  if (hasValidConfig) {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase not configured - using demo mode');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('📝 App will continue without Firebase functionality');
}

// Export with null checks
export { auth, db };
export default app; 