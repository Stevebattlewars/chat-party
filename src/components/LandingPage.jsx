import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-discord-blurple via-purple-600 to-indigo-800">
      {/* Navigation */}
      <nav className="relative px-4 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-discord-blurple font-bold text-xl">💬</span>
            </div>
                          <span className="text-white text-2xl font-bold">Chat Party</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/login"
              className="text-white hover:text-gray-200 px-4 py-2 rounded-md transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/signup"
              className="bg-white text-discord-blurple hover:bg-gray-100 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Connect with your
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent block">
              community
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto">
            Experience real-time messaging with end-to-end encryption, group management, 
            and a beautiful Discord-inspired interface. Built for teams and communities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup"
              className="bg-discord-green hover:bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              🚀 Start Chatting Free
            </Link>
            <Link 
              to="/login"
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-discord-blurple px-8 py-4 rounded-lg text-lg font-semibold transition-all"
            >
              👋 Welcome Back
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Real-time Messaging */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-discord-green rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">⚡</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Real-time Messaging</h3>
            <p className="text-gray-200">
              Lightning-fast message delivery with Socket.IO and Firebase. 
              See messages appear instantly across all devices.
            </p>
          </div>

          {/* Group Management */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">👥</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Smart Groups</h3>
            <p className="text-gray-200">
              Create and manage groups effortlessly. Organize conversations 
              by topic, team, or project with admin controls.
            </p>
          </div>

          {/* Security */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">🔐</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Secure & Private</h3>
            <p className="text-gray-200">
              Your conversations are protected with Firebase authentication 
              and planned end-to-end encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Built with Modern Technology
          </h2>
          <p className="text-gray-200 text-lg">
            Powered by industry-leading tools and frameworks
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚛️</span>
            </div>
            <p className="text-white font-medium">React</p>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔥</span>
            </div>
            <p className="text-white font-medium">Firebase</p>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔌</span>
            </div>
            <p className="text-white font-medium">Socket.IO</p>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎨</span>
            </div>
            <p className="text-white font-medium">Tailwind</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to transform your communication?
          </h2>
          <p className="text-gray-200 text-lg mb-8">
                          Join thousands of teams already using Chat Party to stay connected and productive.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup"
              className="bg-discord-green hover:bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105"
            >
              Create Free Account
            </Link>
            <Link 
              to="/login"
              className="bg-transparent border-2 border-gray-300 text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-300">
            © 2025 Chat Party. Built with ❤️ for seamless communication.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 