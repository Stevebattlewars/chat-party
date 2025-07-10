import React, { useState, useRef, useEffect } from 'react';

const ChatActions = ({ 
  currentConversation, 
  activeTab, 
  currentUser,
  onLeaveGroup, 
  onDeleteChat, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isGroupChat = activeTab === 'groups';
  const isDMChat = activeTab === 'dms';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentConversation) {
    return null;
  }

  const handleLeaveGroup = () => {
    if (window.confirm(`Are you sure you want to leave "${currentConversation.name}"?`)) {
      onLeaveGroup(currentConversation);
    }
    setIsOpen(false);
  };

  const handleDeleteChat = () => {
    const chatType = isGroupChat ? 'group' : 'conversation';
    const chatName = currentConversation.name || 'this conversation';
    
    if (window.confirm(`Are you sure you want to delete ${chatType} "${chatName}"? This action cannot be undone.`)) {
      onDeleteChat(currentConversation);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chat-actions-button p-2 rounded-lg hover:bg-light-bg-secondary dark:hover:bg-dark-bg-secondary transition-colors duration-200"
        aria-label="Chat actions"
        title="Chat actions"
      >
        <svg
          className="w-5 h-5 text-light-text-secondary dark:text-dark-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="chat-actions-dropdown absolute right-0 top-12 z-50">
          <div className="bg-light-bg-primary dark:bg-dark-bg-primary border border-light-border dark:border-dark-border rounded-lg shadow-lg py-1 min-w-[180px]">
            
            {/* Leave Group Option (only for groups) */}
            {isGroupChat && (
              <button
                onClick={handleLeaveGroup}
                className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Leave Group</span>
              </button>
            )}

            {/* Delete Chat Option */}
            <button
              onClick={handleDeleteChat}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete {isGroupChat ? 'Group' : 'Conversation'}</span>
            </button>

            {/* Chat Info Option */}
            <div className="border-t border-light-border dark:border-dark-border my-1"></div>
            <div className="px-3 py-2 text-xs text-light-text-muted dark:text-dark-text-muted">
              {isGroupChat ? 'Group' : 'Direct Message'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatActions; 