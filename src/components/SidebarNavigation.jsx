import React, { useContext } from 'react';
import { AuthContext } from '../App';
import GroupManager from './GroupManager';
import DMManager from './DMManager';

const SidebarNavigation = () => {
  const { activeTab, setActiveTab, setCurrentGroup, setCurrentDM } = useContext(AuthContext);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Clear the other tab's selection when switching
    if (tab === 'groups') {
      setCurrentDM(null);
    } else {
      setCurrentGroup(null);
    }
  };

  return (
    <div className="h-full bg-discord-darker text-white flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-600">
        <button
          onClick={() => handleTabChange('groups')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'bg-discord-blurple text-white border-b-2 border-discord-blurple'
              : 'text-discord-light hover:text-white hover:bg-discord-dark'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>👥</span>
            <span>Groups</span>
          </div>
        </button>
        
        <button
          onClick={() => handleTabChange('dms')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'dms'
              ? 'bg-discord-blurple text-white border-b-2 border-discord-blurple'
              : 'text-discord-light hover:text-white hover:bg-discord-dark'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>💬</span>
            <span>DMs</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'groups' ? (
          <GroupManager />
        ) : (
          <DMManager />
        )}
      </div>
    </div>
  );
};

export default SidebarNavigation; 