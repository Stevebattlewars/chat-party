import React, { useState } from 'react';

const FileAttachment = ({ file, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!file) return null;

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on file type
  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype === 'application/pdf') return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return '📦';
    if (mimetype.startsWith('text/')) return '📄';
    return '📎';
  };

  // Handle image click to open in new tab
  const handleImageClick = () => {
    window.open(file.url, '_blank');
  };

  // Handle file download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName || file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (file.isImage && !imageError) {
    return (
      <div className={`max-w-sm ${className}`}>
        <div className="relative">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          <img
            src={file.url}
            alt={file.originalName || 'Uploaded image'}
            className={`
              max-w-full h-auto rounded-lg shadow-md cursor-pointer
              hover:shadow-lg transition-shadow duration-200
              ${imageLoading ? 'opacity-0' : 'opacity-100'}
            `}
            onClick={handleImageClick}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            style={{ maxHeight: '300px' }}
          />
        </div>
        
        {/* Image info */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span className="truncate mr-2">{file.originalName}</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Non-image files or failed image loading
  return (
    <div className={`max-w-sm ${className}`}>
      <div 
        onClick={handleDownload}
        className="
          flex items-center p-3 bg-gray-50 dark:bg-gray-800 
          rounded-lg border border-gray-200 dark:border-gray-700
          hover:bg-gray-100 dark:hover:bg-gray-700 
          cursor-pointer transition-colors duration-200
        "
      >
        {/* File icon */}
        <div className="text-2xl mr-3 flex-shrink-0">
          {getFileIcon(file.mimetype)}
        </div>
        
        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.originalName || file.filename}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between mt-1">
            <span>{formatFileSize(file.size)}</span>
            <span className="ml-2">Click to download</span>
          </div>
        </div>
        
        {/* Download icon */}
        <div className="ml-3 flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FileAttachment; 