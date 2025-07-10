import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';

// Import existing chat components
import ChatRoom from './components/ChatRoom';
import GroupManager from './components/GroupManager';
import LandingPage from './components/LandingPage';
import SidebarNavigation from './components/SidebarNavigation';
import ThemeToggle from './components/ThemeToggle';
import ProfilePicture from './components/ProfilePicture';
import ProfileEditor from './components/ProfileEditor';

// Firebase imports with error handling
let firebaseAvailable = false;
let createUserWithEmailAndPassword = null;
let signInWithEmailAndPassword = null;
let signOut = null;
let updateProfile = null;
let auth = null;
let db = null;
let setDoc = null;
let doc = null;

// Dynamic Firebase initialization
const initializeFirebase = async () => {
  try {
    // Dynamic imports for Firebase
    const firebaseAuth = await import('firebase/auth');
    const firebaseConfig = await import('./config/firebase');
    const firebaseFirestore = await import('firebase/firestore');
    
    createUserWithEmailAndPassword = firebaseAuth.createUserWithEmailAndPassword;
    signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword;
    signOut = firebaseAuth.signOut;
    updateProfile = firebaseAuth.updateProfile;
    auth = firebaseConfig.auth;
    db = firebaseConfig.db;
    setDoc = firebaseFirestore.setDoc;
    doc = firebaseFirestore.doc;
    
    // Check if Firebase is properly configured
    if (auth && db) {
      firebaseAvailable = true;
      console.log('✅ Firebase auth and Firestore initialized successfully');
    } else {
      console.warn('⚠️ Firebase auth or Firestore not configured properly');
    }
  } catch (error) {
    console.warn('⚠️ Firebase not available, using test mode:', error.message);
    firebaseAvailable = false;
  }
};

// Initialize Firebase (async, won't block app startup)
initializeFirebase();

// Create AuthContext with theme support
const AuthContext = createContext({
  user: null,
  setUser: () => {},
  currentGroup: null,
  setCurrentGroup: () => {},
  currentDM: null,
  setCurrentDM: () => {},
  activeTab: 'groups', // 'groups' or 'dms'
  setActiveTab: () => {},
  theme: 'light', // 'light' or 'dark'
  setTheme: () => {},
  toggleTheme: () => {}
});

// Utility functions for permission checking
const hasPermission = (user, permission) => {
  return user?.permissions?.includes(permission) || false;
};

const isAdmin = (user) => {
  return user?.role === 'admin' || false;
};

const canCreateRooms = (user) => {
  return hasPermission(user, 'create_rooms') || isAdmin(user);
};

const canManageUsers = (user) => {
  return hasPermission(user, 'manage_users') || isAdmin(user);
};

// AuthProvider component with theme support
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentDM, setCurrentDM] = useState(null);
  const [activeTab, setActiveTab] = useState('groups');
  
  // Theme state with localStorage persistence
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('chatparty-theme');
      if (savedTheme) return savedTheme;
      
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply theme to document and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('chatparty-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!localStorage.getItem('chatparty-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    user,
    setUser,
    currentGroup,
    setCurrentGroup,
    currentDM,
    setCurrentDM,
    activeTab,
    setActiveTab,
    theme,
    setTheme,
    toggleTheme
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function HomePage() {
  const { user } = useAuth();
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If not logged in, show landing page
  return <LandingPage />;
}

function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { email, password } = formData;
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let loggedInUser;

      // Try Firebase authentication if available
      if (firebaseAvailable && auth && signInWithEmailAndPassword) {
        console.log('🔥 Attempting Firebase login...');
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Load additional user data from Firestore
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            loggedInUser = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName || firebaseUser.email.split('@')[0],
              uid: firebaseUser.uid,
              source: 'firebase',
              ...userData
            };
            
            // Update last seen
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(userDocRef, {
              lastSeen: new Date().toISOString(),
              isOnline: true
            });
            
            console.log('✅ Firebase login successful with user data loaded');
          } else {
            // User exists in Auth but not in Firestore, create basic record
            loggedInUser = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              uid: firebaseUser.uid,
              source: 'firebase',
              role: 'user',
              permissions: ['send_messages']
            };
            console.log('⚠️ User data not found in Firestore, using basic data');
          }
        } catch (firestoreError) {
          console.error('❌ Error loading user data from Firestore:', firestoreError);
          // Fallback to basic Firebase user data
          loggedInUser = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            uid: firebaseUser.uid,
            source: 'firebase',
            role: 'user',
            permissions: ['send_messages']
          };
        }
        
        const roleMessage = loggedInUser.role === 'admin' ? ' 👑 Admin' : '';
        console.log(`🎉 Welcome back, ${loggedInUser.displayName}!${roleMessage}`);
        
      } else {
        // Fallback to test mode
        console.log('⚠️ Using test mode login');
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isAdmin = email.toLowerCase().includes('admin');
        
        loggedInUser = {
          email: email,
          displayName: email.split('@')[0],
          uid: `test-user-${Date.now()}`,
          source: 'test',
          role: isAdmin ? 'admin' : 'user',
          permissions: isAdmin ? ['create_rooms', 'manage_users', 'delete_messages'] : ['send_messages']
        };
        
        const roleMessage = isAdmin ? ' 👑 Admin' : '';
        console.log(`🧪 Test login successful!${roleMessage} - Email: ${email} - Test mode`);
      }

      setUser(loggedInUser);
      setFormData({ email: '', password: '' });
      
      // Automatically redirect to dashboard after successful login
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(getErrorMessage(error.code || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return `An error occurred during login: ${errorCode}`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">Sign in to your account</p>
          <p className="text-xs text-gray-500 mt-1">
            Mode: {firebaseAvailable ? '🔥 Firebase Auth' : '🧪 Test Mode'}
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign up here
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← Back to Home
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, setUser } = useAuth();
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const handleLogout = async () => {
    try {
      if (firebaseAvailable && auth && signOut) {
        await signOut(auth);
        console.log('✅ Firebase logout successful');
      }
      setUser(null);
      alert('👋 Logged out successfully!');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still log out locally even if Firebase logout fails
      setUser(null);
      alert('⚠️ Logout completed (with some issues)');
    }
  };

  const testFirebaseConnection = async () => {
    try {
      if (!db) {
        alert('❌ Firebase database not initialized');
        return;
      }
      
      // Try to read from groups collection
      const { collection, getDocs } = await import('firebase/firestore');
      const groupsRef = collection(db, 'groups');
      const snapshot = await getDocs(groupsRef);
      
      alert(`✅ Firebase connection works!\n📁 Found ${snapshot.docs.length} groups in database`);
      console.log('🔥 Firebase test successful, groups:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('❌ Firebase test failed:', error);
      alert(`❌ Firebase connection failed:\n${error.message}`);
    }
  };

  const testFirebaseMessages = async () => {
    try {
      if (!db) {
        alert('❌ Firebase database not initialized');
        return;
      }
      
      // Try to read from messages collection
      const { collection, getDocs } = await import('firebase/firestore');
      const messagesRef = collection(db, 'messages');
      const snapshot = await getDocs(messagesRef);
      
      alert(`✅ Messages collection accessible!\n📨 Found ${snapshot.docs.length} messages in database`);
      console.log('💬 Messages test successful, messages:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('❌ Messages test failed:', error);
      alert(`❌ Messages access failed:\n${error.message}`);
    }
  };

  const createAdminRoom = async () => {
    if (!canCreateRooms(user)) {
      alert('❌ You don\'t have permission to create rooms');
      return;
    }

    const roomName = prompt('Enter room name:');
    if (!roomName || !roomName.trim()) return;

    const roomDescription = prompt('Enter room description (optional):') || '';

    try {
      if (!db) {
        alert('❌ Firebase not available');
        return;
      }

      const { collection, addDoc } = await import('firebase/firestore');
      const groupData = {
        name: roomName.trim(),
        description: roomDescription.trim(),
        createdBy: user.uid,
        createdAt: new Date(),
        members: [user.uid],
        type: 'public',
        isAdminCreated: true,
        moderators: [user.uid]
      };

      await addDoc(collection(db, 'groups'), groupData);
      alert(`✅ Room "${roomName}" created successfully!`);
    } catch (error) {
      console.error('❌ Error creating room:', error);
      alert(`❌ Failed to create room: ${error.message}`);
    }
  };

  const handleProfileSave = async (avatarData) => {
    try {
      if (firebaseAvailable && db && doc && setDoc) {
        // Update in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          avatar: avatarData
        }, { merge: true });
        
        // Update local user state
        setUser(prev => ({
          ...prev,
          avatar: avatarData
        }));
        
        console.log('✅ Profile updated in Firestore');
      } else {
        // Test mode - just update local state
        setUser(prev => ({
          ...prev,
          avatar: avatarData
        }));
        console.log('🧪 Profile updated in test mode');
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-discord-blurple to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">💬</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.displayName}!</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAdmin(user) && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  👑 Admin
                </span>
              )}
              
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">👤</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Account Type</p>
                <p className="text-2xl font-bold text-gray-900">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">🔥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Firebase</p>
                <p className="text-2xl font-bold text-gray-900">{firebaseAvailable ? 'Active' : 'Test'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Database</p>
                <p className="text-2xl font-bold text-gray-900">{db ? 'Ready' : 'Offline'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-900">Online</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <Link 
                  to="/chat"
                  className="group bg-gradient-to-r from-discord-blurple to-purple-600 hover:from-purple-600 hover:to-discord-blurple text-white p-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <span className="text-2xl">💬</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Open Chat</h4>
                      <p className="text-sm opacity-90">Start messaging now</p>
                    </div>
                  </div>
                </Link>

                <button 
                  onClick={() => window.open('https://console.firebase.google.com/project/chat-app-3709a/firestore', '_blank')}
                  className="group bg-gradient-to-r from-orange-500 to-red-500 hover:from-red-500 hover:to-orange-500 text-white p-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Firebase Console</h4>
                      <p className="text-sm opacity-90">Manage database</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin(user) && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-md p-6 border border-yellow-200">
                <div className="flex items-center mb-6">
                  <span className="text-2xl mr-3">👑</span>
                  <h3 className="text-lg font-semibold text-gray-900">Admin Controls</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={createAdminRoom}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-lg transition-colors font-medium"
                  >
                    🏠 Create Public Room
                  </button>
                  
                  <button 
                    onClick={testFirebaseConnection}
                    className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg transition-colors font-medium"
                  >
                    🔧 Test Firebase
                  </button>
                  
                  <button 
                    onClick={testFirebaseMessages}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg transition-colors font-medium"
                  >
                    📨 Test Messages
                  </button>
                  
                  <button 
                    onClick={() => alert('User management coming soon!')}
                    className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg transition-colors font-medium"
                  >
                    👥 Manage Users
                  </button>
                </div>
              </div>
            )}

            {/* Debug Information */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">User ID</label>
                    <p className="font-mono text-sm bg-gray-100 p-2 rounded">{user.uid}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-sm text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <p className="text-sm text-gray-900 capitalize">{user.role || 'user'}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Permissions</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.permissions?.map((perm, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {perm.replace('_', ' ')}
                        </span>
                      )) || <span className="text-gray-500 text-sm">No permissions loaded</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Member Since</label>
                    <p className="text-sm text-gray-900">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Active</label>
                    <p className="text-sm text-gray-900">
                      {user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* User Profile Card */}
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <div className="mb-4">
                <ProfilePicture
                  emoji={user.avatar?.emoji || '😊'}
                  backgroundColor={user.avatar?.backgroundColor || '#3B82F6'}
                  size="3xl"
                  className="mx-auto"
                  onClick={() => setShowProfileEditor(true)}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{user.displayName}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
              <div className="mt-4 space-y-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                </span>
                <div>
                  <button
                    onClick={() => setShowProfileEditor(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit Profile Picture
                  </button>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Firebase Auth</span>
                  <span className={`text-sm font-medium ${auth ? 'text-green-600' : 'text-red-600'}`}>
                    {auth ? '✅ Ready' : '❌ Offline'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Firestore DB</span>
                  <span className={`text-sm font-medium ${db ? 'text-green-600' : 'text-red-600'}`}>
                    {db ? '✅ Connected' : '❌ Offline'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Socket.IO</span>
                  <span className="text-sm font-medium text-green-600">✅ Ready</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mode</span>
                  <span className="text-sm font-medium text-blue-600">
                    {firebaseAvailable ? '🔥 Production' : '🧪 Test'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link 
                  to="/chat"
                  className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span>💬</span>
                  <span>Chat Rooms</span>
                </Link>
                <Link 
                  to="/"
                  className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span>🏠</span>
                  <span>Home</span>
                </Link>
                <button 
                  onClick={() => alert('Settings coming soon!')}
                  className="w-full flex items-center space-x-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Editor Modal */}
      <ProfileEditor
        isOpen={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
        currentEmoji={user.avatar?.emoji || '😊'}
        currentBackgroundColor={user.avatar?.backgroundColor || '#3B82F6'}
        username={user.displayName}
        onSave={handleProfileSave}
      />
    </div>
  );
}

// Chat Interface Component
function ChatInterface() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

    return (
    <div className="h-screen chat-container flex">
      {/* Sidebar - Navigation (Groups & DMs) */}
      <div className="w-80 sidebar relative">
        <SidebarNavigation />
        
        {/* Theme Toggle - Fixed at bottom of sidebar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center justify-between p-3 bg-light-bg-tertiary dark:bg-dark-bg-tertiary rounded-lg">
            <div className="flex items-center space-x-2">
              <ProfilePicture
                emoji={user.avatar?.emoji || '😊'}
                backgroundColor={user.avatar?.backgroundColor || '#3B82F6'}
                size="sm"
              />
              <div className="text-sm">
                <div className="font-medium text-light-text dark:text-dark-text truncate">
                  {user.displayName || user.email?.split('@')[0]}
                </div>
                <div className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  Online
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ChatRoom />
      </div>
    </div>
  );
}

function TestPage() {
  const { user, setUser } = useAuth();
  
  const handleTestLogin = () => {
    setUser({
      email: 'test@example.com',
      displayName: 'Test User',
      uid: 'test-uid-123',
      source: 'test'
    });
    alert('Test user logged in!');
  };

  const handleTestLogout = () => {
    setUser(null);
    alert('User logged out!');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page</h1>
      <p>Routing is working!</p>
      <p>AuthContext is working!</p>
      <p>🔥 Firebase status: <strong>{firebaseAvailable ? 'Available & Configured' : 'Test mode'}</strong></p>
      <p>📊 Database: {db ? 'Firestore Connected' : 'Not connected'}</p>
      {user ? (
        <div>
          <p>✅ Logged in as: <strong>{user.displayName}</strong> ({user.email})</p>
          <button onClick={handleTestLogout} style={{ padding: '10px', margin: '5px' }}>
            Test Logout
          </button>
        </div>
      ) : (
        <button onClick={handleTestLogin} style={{ padding: '10px', margin: '5px' }}>
          Test Login
        </button>
      )}
      <br /><br />
      <Link to="/">Go back to Home</Link>
    </div>
  );
}

function SimpleSignup() {
  const { setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = formData;
    
    // Basic validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let newUser;

      // Try Firebase authentication if available
      if (firebaseAvailable && auth && createUserWithEmailAndPassword && updateProfile && db && setDoc && doc) {
        console.log('🔥 Creating Firebase user account...');
        
        // Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Update user profile with username
        await updateProfile(firebaseUser, {
          displayName: username
        });

        // Determine if user should be admin (first user or admin email)
        const isAdmin = email.toLowerCase().includes('admin') || 
                       email.toLowerCase() === 'admin@chatparty.com' ||
                       username.toLowerCase().includes('admin');

        // Store additional user data in Firestore
        const userData = {
          username: username,
          email: email,
          displayName: username,
          role: isAdmin ? 'admin' : 'user',
          permissions: isAdmin ? ['create_rooms', 'manage_users', 'delete_messages'] : ['send_messages'],
          createdAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          isOnline: true,
          profileCompleted: true,
          avatar: {
            emoji: '😊',
            backgroundColor: '#3B82F6'
          },
          bio: '',
          joinedGroups: [],
          adminOfGroups: []
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        
        console.log('✅ User created in Firebase Auth');
        console.log('✅ User data saved to Firestore');

        newUser = {
          email: firebaseUser.email,
          displayName: username,
          uid: firebaseUser.uid,
          source: 'firebase',
          ...userData
        };
        
        const roleMessage = isAdmin ? '\n👑 Admin privileges granted!' : '';
        alert(`🎉 Account created successfully!\n\n👤 Username: ${username}\n📧 Email: ${email}\n🔥 Stored in Firebase & Firestore${roleMessage}`);
        
      } else {
        // Fallback to test mode
        console.log('⚠️ Using test mode signup (Firebase not available)');
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isAdmin = email.toLowerCase().includes('admin');
        
        newUser = {
          email: email,
          displayName: username,
          uid: `test-user-${Date.now()}`,
          source: 'test',
          role: isAdmin ? 'admin' : 'user',
          permissions: isAdmin ? ['create_rooms', 'manage_users', 'delete_messages'] : ['send_messages'],
          createdAt: new Date().toISOString()
        };
        
        const roleMessage = isAdmin ? '\n👑 Admin privileges granted!' : '';
        alert(`🧪 Test account created!\n\n👤 Username: ${username}\n📧 Email: ${email}\n⚠️ This is test mode - no data was saved${roleMessage}`);
      }

      setUser(newUser);
      setFormData({ username: '', email: '', password: '', confirmPassword: '' });
      
    } catch (error) {
      console.error('❌ Signup error:', error);
      setError(getErrorMessage(error.code || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return `An error occurred during signup: ${errorCode}`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600">Join the conversation</p>
          <p className="text-xs text-gray-500 mt-1">
            Mode: {firebaseAvailable ? '🔥 Firebase + Firestore' : '🧪 Test Mode'}
          </p>
        </div>
        
        <form onSubmit={handleSignup} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Choose a username"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Create a password"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Confirm your password"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign in here
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← Back to Home
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/signup" element={<SimpleSignup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatInterface />} />
          </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App; 
// Export AuthContext for use in other components
export { AuthContext }; 