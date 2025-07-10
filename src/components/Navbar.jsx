import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthContext } from '../App';

const Navbar = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-discord-darker shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/chat" className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-white">Chat Party</h1>
              </div>
            </Link>
            
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  to="/chat"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/chat')
                      ? 'bg-discord-blurple text-white'
                      : 'text-discord-light hover:bg-discord-dark hover:text-white'
                  }`}
                >
                  Chat
                </Link>
                <Link
                  to="/groups"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/groups')
                      ? 'bg-discord-blurple text-white'
                      : 'text-discord-light hover:bg-discord-dark hover:text-white'
                  }`}
                >
                  Groups
                </Link>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-discord-light">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-discord-blurple rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="ml-2 text-sm font-medium">
                  {user?.displayName || user?.email?.split('@')[0]}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-discord-red hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-discord-dark">
          <Link
            to="/chat"
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/chat')
                ? 'bg-discord-blurple text-white'
                : 'text-discord-light hover:bg-discord-darker hover:text-white'
            }`}
          >
            Chat
          </Link>
          <Link
            to="/groups"
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/groups')
                ? 'bg-discord-blurple text-white'
                : 'text-discord-light hover:bg-discord-darker hover:text-white'
            }`}
          >
            Groups
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 