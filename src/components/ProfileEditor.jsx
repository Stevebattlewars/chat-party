import React, { useState } from 'react';
import ProfilePicture, { AVATAR_COLORS, AVATAR_EMOJIS } from './ProfilePicture';

const ProfileEditor = ({ 
  isOpen, 
  onClose, 
  currentEmoji = '😊', 
  currentBackgroundColor = '#3B82F6',
  onSave,
  username = 'User'
}) => {
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);
  const [selectedColor, setSelectedColor] = useState(currentBackgroundColor);

  const handleSave = () => {
    onSave({
      emoji: selectedEmoji,
      backgroundColor: selectedColor
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedEmoji(currentEmoji);
    setSelectedColor(currentBackgroundColor);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Profile Picture
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                       transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Preview */}
          <div className="text-center mb-6">
            <div className="mb-3">
              <ProfilePicture
                emoji={selectedEmoji}
                backgroundColor={selectedColor}
                size="3xl"
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Preview for {username}
            </p>
          </div>

          {/* Background Colors */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Background Color
            </h3>
            <div className="grid grid-cols-8 gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all duration-200
                    hover:scale-110 hover:shadow-lg
                    ${selectedColor === color 
                      ? 'border-gray-900 dark:border-white scale-110 shadow-lg' 
                      : 'border-gray-300 dark:border-gray-600'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Emojis */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Choose Emoji
            </h3>
            
            {/* Emoji Categories */}
            <div className="space-y-4">
              {/* Smileys & People */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  😊 Smileys & People
                </h4>
                <div className="grid grid-cols-10 gap-1">
                  {AVATAR_EMOJIS.slice(0, 20).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`
                        w-8 h-8 text-lg rounded-lg transition-all duration-200
                        hover:bg-gray-100 dark:hover:bg-dark-hover hover:scale-110
                        ${selectedEmoji === emoji 
                          ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
                          : ''
                        }
                      `}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animals & Nature */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  🐶 Animals & Nature
                </h4>
                <div className="grid grid-cols-10 gap-1">
                  {AVATAR_EMOJIS.slice(20, 40).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`
                        w-8 h-8 text-lg rounded-lg transition-all duration-200
                        hover:bg-gray-100 dark:hover:bg-dark-hover hover:scale-110
                        ${selectedEmoji === emoji 
                          ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
                          : ''
                        }
                      `}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food & Drink */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  🍕 Food & Drink
                </h4>
                <div className="grid grid-cols-10 gap-1">
                  {AVATAR_EMOJIS.slice(40, 60).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`
                        w-8 h-8 text-lg rounded-lg transition-all duration-200
                        hover:bg-gray-100 dark:hover:bg-dark-hover hover:scale-110
                        ${selectedEmoji === emoji 
                          ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
                          : ''
                        }
                      `}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activities & Objects */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  ⚽ Activities & Objects
                </h4>
                <div className="grid grid-cols-10 gap-1">
                  {AVATAR_EMOJIS.slice(60, 80).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`
                        w-8 h-8 text-lg rounded-lg transition-all duration-200
                        hover:bg-gray-100 dark:hover:bg-dark-hover hover:scale-110
                        ${selectedEmoji === emoji 
                          ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
                          : ''
                        }
                      `}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbols */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                  ❤️ Symbols
                </h4>
                <div className="grid grid-cols-10 gap-1">
                  {AVATAR_EMOJIS.slice(80).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`
                        w-8 h-8 text-lg rounded-lg transition-all duration-200
                        hover:bg-gray-100 dark:hover:bg-dark-hover hover:scale-110
                        ${selectedEmoji === emoji 
                          ? 'bg-blue-100 dark:bg-blue-900/30 scale-110' 
                          : ''
                        }
                      `}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border 
                      flex justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                     bg-gray-100 dark:bg-dark-hover hover:bg-gray-200 dark:hover:bg-gray-600
                     rounded-lg transition-colors duration-200"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg 
                       transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 
                       hover:bg-blue-700 rounded-lg transition-colors duration-200 
                       shadow-soft hover:shadow-soft-lg"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor; 