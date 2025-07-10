import React from 'react';

const ProfilePicture = ({ 
  emoji = '😊', 
  backgroundColor = '#3B82F6', 
  size = 'md', 
  className = '',
  onClick = null,
  showOnlineStatus = false,
  isOnline = false
}) => {
  // Size variants
  const sizeClasses = {
    'xs': 'w-6 h-6 text-xs',
    'sm': 'w-8 h-8 text-sm', 
    'md': 'w-10 h-10 text-base',
    'lg': 'w-12 h-12 text-lg',
    'xl': 'w-16 h-16 text-2xl',
    '2xl': 'w-20 h-20 text-3xl',
    '3xl': 'w-24 h-24 text-4xl'
  };

  const statusSizes = {
    'xs': 'w-1.5 h-1.5 -bottom-0 -right-0',
    'sm': 'w-2 h-2 -bottom-0 -right-0',
    'md': 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    'lg': 'w-3 h-3 -bottom-0.5 -right-0.5',
    'xl': 'w-4 h-4 -bottom-1 -right-1',
    '2xl': 'w-5 h-5 -bottom-1 -right-1',
    '3xl': 'w-6 h-6 -bottom-1.5 -right-1.5'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses['md'];
  const statusSizeClass = statusSizes[size] || statusSizes['md'];

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`
          ${currentSizeClass} 
          rounded-full 
          flex items-center justify-center 
          font-medium
          border-2 border-white dark:border-dark-bg
          shadow-soft
          transition-all duration-200
          ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-soft-lg' : ''}
        `}
        style={{ backgroundColor }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
      >
        <span className="select-none">{emoji}</span>
      </div>
      
      {/* Online status indicator */}
      {showOnlineStatus && (
        <div 
          className={`
            absolute ${statusSizeClass} 
            rounded-full border-2 border-white dark:border-dark-bg
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  );
};

// Predefined background colors
export const AVATAR_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#22C55E', // Green
  '#3730A3', // Indigo-800
  '#7C2D12', // Orange-900
];

// Popular Apple emojis for avatars
export const AVATAR_EMOJIS = [
  // Smileys & People
  '😊', '😎', '🤗', '😇', '🥳', '😍', '🤓', '😜', '😋', '🙃',
  '😁', '😄', '😆', '🤩', '😌', '☺️', '😏', '😉', '🥰', '😘',
  
  // Animals & Nature
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐸', '🐵', '🐷', '🐙', '🦄', '🐳', '🐬', '🦋', '🐝',
  
  // Food & Drink
  '🍕', '🍔', '🌮', '🍩', '🍪', '🎂', '🍰', '🧁', '🍓', '🍎',
  '🍌', '🥑', '🥨', '🥐', '☕', '🧋', '🍵', '🥤', '🍺', '🍷',
  
  // Activities & Objects
  '⚽', '🏀', '🎯', '🎮', '🎸', '🎨', '📱', '💻', '📷', '✈️',
  '🚗', '🏠', '⭐', '🌟', '💎', '🔥', '⚡', '🌙', '☀️', '🌈',
  
  // Symbols
  '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '💝', '💯',
];

export default ProfilePicture; 