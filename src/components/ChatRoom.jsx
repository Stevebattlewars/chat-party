import React, { useState, useEffect, useContext, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../App';
import io from 'socket.io-client';
import MessageActions from './MessageActions';
import ChatActions from './ChatActions';
import ProfilePicture from './ProfilePicture';
import { FileUploadButton } from './FileUpload';
import FileAttachment from './FileAttachment';

const ChatRoom = () => {
  const { user, currentGroup, currentDM, activeTab, setCurrentGroup, setCurrentDM } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const messagesEndRef = useRef(null);

  // Determine current conversation (group or DM)
  const currentConversation = activeTab === 'groups' ? currentGroup : currentDM;
  const isGroupChat = activeTab === 'groups' && currentGroup;
  const isDMChat = activeTab === 'dms' && currentDM;

  // Debug conversation changes
  useEffect(() => {
    if (activeTab === 'dms' && currentDM) {
      console.log('🔄 ChatRoom - DM conversation changed to:', {
        id: currentDM.id,
        participants: currentDM.participants,
        participantNames: currentDM.participantNames
      });
    } else if (activeTab === 'groups' && currentGroup) {
      console.log('🔄 ChatRoom - Group conversation changed to:', {
        id: currentGroup.id,
        name: currentGroup.name
      });
    } else {
      console.log('🔄 ChatRoom - No conversation selected. ActiveTab:', activeTab);
    }
  }, [currentConversation, activeTab, currentDM, currentGroup]);

  // Backend server URL (now running on port 3000)
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Join current conversation room (group or DM)
    if (currentConversation) {
      newSocket.emit('join-room', currentConversation.id);
    }

    // Listen for incoming messages
    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for message edits
    newSocket.on('message-edited', (editData) => {
      setMessages(prev => prev.map(msg => 
        msg.id === editData.messageId 
          ? { ...msg, text: editData.newText, editedAt: editData.editedAt, isEdited: true }
          : msg
      ));
    });

    // Listen for message deletions
    newSocket.on('message-deleted', (deleteData) => {
      setMessages(prev => prev.map(msg => 
        msg.id === deleteData.messageId 
          ? { ...msg, text: '[Message deleted]', isDeleted: true }
          : msg
      ));
    });

    // Listen for user leaving group
    newSocket.on('user-left-group', (leaveData) => {
      console.log(`👋 ${leaveData.username} left the group`);
      // Could add a system message here if desired
    });

    // Listen for chat deletion
    newSocket.on('chat-deleted', (deleteData) => {
      console.log('🗑️ Chat was deleted:', deleteData);
      // Clear current conversation if it was deleted
      if (deleteData.chatId === currentConversation?.id) {
        if (deleteData.chatType === 'group') {
          setCurrentGroup(null);
        } else {
          setCurrentDM(null);
        }
      }
    });

    return () => {
      newSocket.close();
    };
  }, [currentConversation, SOCKET_URL]);

  // Load messages from Firestore (Firebase) or REST API (MySQL)
  useEffect(() => {
    if (!currentConversation) {
      setMessages([]);
      return;
    }

    console.log('🔍 Loading messages for conversation:', currentConversation.id, 'Type:', activeTab);
    setLoading(true);
    setMessages([]); // Clear previous messages immediately
    
    let unsubscribe = () => {};

    const setupMessageListener = () => {
      const messagesRef = collection(db, 'messages');
      
      // Try primary query with orderBy first
      let primaryQuery;
      if (isGroupChat) {
        primaryQuery = query(
          messagesRef,
          where('groupId', '==', currentGroup.id),
          orderBy('timestamp', 'asc')
        );
      } else if (isDMChat) {
        primaryQuery = query(
          messagesRef,
          where('conversationId', '==', currentDM.id),
          orderBy('timestamp', 'asc')
        );
      } else {
        setLoading(false);
        return;
      }

      console.log('📡 Setting up primary query listener...');
      
      unsubscribe = onSnapshot(primaryQuery, 
        (snapshot) => {
          console.log('📨 Primary query - Firestore snapshot received:', snapshot.docs.length, 'messages');
          
          const messageList = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('📝 Message data:', data);
            return {
              id: doc.id,
              ...data
            };
          });
          
          console.log('✅ Successfully loaded messages:', messageList.length);
          setMessages(messageList);
          setLoading(false);
        },
        (error) => {
          console.error('❌ Primary query failed:', error.message);
          console.log('🔄 Attempting fallback query without orderBy...');
          
          // Set up fallback query without orderBy
          let fallbackQuery;
          if (isGroupChat) {
            fallbackQuery = query(messagesRef, where('groupId', '==', currentGroup.id));
          } else if (isDMChat) {
            fallbackQuery = query(messagesRef, where('conversationId', '==', currentDM.id));
          }
          
          if (fallbackQuery) {
            unsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
              console.log('📨 Fallback query - messages received:', snapshot.docs.length);
              
              const messageList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              
              // Sort locally if orderBy fails
              messageList.sort((a, b) => {
                const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp || 0);
                const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp || 0);
                return aTime - bTime;
              });
              
              console.log('✅ Fallback query successful:', messageList.length, 'messages');
              setMessages(messageList);
              setLoading(false);
            }, (fallbackError) => {
              console.error('❌ Both primary and fallback queries failed:', fallbackError);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }
      );
    };

    try {
      setupMessageListener();
    } catch (error) {
      console.error('❌ Error setting up Firebase listener:', error);
      setLoading(false);
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up message listener for:', currentConversation.id);
      unsubscribe();
    };
  }, [currentConversation, isGroupChat, isDMChat, currentGroup, currentDM, activeTab]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function (supports both text and file attachments)
  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachedFile) || !currentConversation || !user) return;

    let messageData;
    
    if (isGroupChat) {
      messageData = {
        text: newMessage.trim() || null,
        file: attachedFile || null,
        userId: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        groupId: currentGroup.id,
        timestamp: new Date().toISOString(),
        // TODO: Add encryption here when implementing E2E encryption
      };
    } else if (isDMChat) {
      messageData = {
        text: newMessage.trim() || null,
        file: attachedFile || null,
        userId: user.uid,
        username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        conversationId: currentDM.id,
        timestamp: new Date().toISOString(),
        // TODO: Add encryption here when implementing E2E encryption
      };
    } else {
      return; // No valid conversation
    }

    try {
      // Emit message via Socket.IO for real-time delivery
      if (socket) {
        socket.emit('send-message', messageData);
      }

      // Save to Firebase Firestore (for local development)
      await addDoc(collection(db, 'messages'), {
        ...messageData,
        timestamp: new Date()
      });

      // Update conversation's last message (for DMs)
      if (isDMChat) {
        const { updateDoc, doc: docRef } = await import('firebase/firestore');
        const lastMessageText = newMessage.trim() || (attachedFile ? `📎 ${attachedFile.originalName}` : 'Attachment');
        await updateDoc(docRef(db, 'conversations', currentDM.id), {
          lastMessage: lastMessageText,
          lastMessageAt: new Date()
        });
      }

      // Clear input fields
      setNewMessage('');
      setAttachedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle file upload
  const handleFileUpload = (fileData) => {
    setAttachedFile(fileData);
  };

  // Remove attached file
  const removeAttachedFile = () => {
    setAttachedFile(null);
  };

  // Edit message function
  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setEditText(message.text);
  };

  // Save edited message
  const saveEditedMessage = async () => {
    if (!editText.trim() || !editingMessage) return;

    try {
      // Update in Firestore
      const messageRef = doc(db, 'messages', editingMessage.id);
      await updateDoc(messageRef, {
        text: editText.trim(),
        editedAt: new Date(),
        isEdited: true
      });

      // Emit via Socket.IO for real-time updates
      if (socket) {
        socket.emit('edit-message', {
          messageId: editingMessage.id,
          text: editText.trim(),
          userId: user.uid,
          groupId: isGroupChat ? currentGroup.id : null,
          conversationId: isDMChat ? currentDM.id : null
        });
      }

      // Reset editing state
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Delete message function
  const handleDeleteMessage = async (message) => {
    try {
      // Soft delete in Firestore (mark as deleted)
      const messageRef = doc(db, 'messages', message.id);
      await updateDoc(messageRef, {
        text: '[Message deleted]',
        isDeleted: true,
        deletedAt: new Date()
      });

      // Emit via Socket.IO for real-time updates
      if (socket) {
        socket.emit('delete-message', {
          messageId: message.id,
          userId: user.uid,
          groupId: isGroupChat ? currentGroup.id : null,
          conversationId: isDMChat ? currentDM.id : null
        });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Leave group function
  const handleLeaveGroup = async (group) => {
    try {
      // Remove user from group in Firestore (in real app, this would be handled server-side)
      console.log('Leaving group:', group.name);

      // Emit via Socket.IO
      if (socket) {
        socket.emit('leave-group', {
          groupId: group.id,
          userId: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'Anonymous'
        });
      }

      // Clear current group
      setCurrentGroup(null);
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  // Delete chat function
  const handleDeleteChat = async (conversation) => {
    try {
      if (isGroupChat) {
        // Delete group and all messages (in real app, only group creator can do this)
        console.log('Deleting group:', conversation.name);
      } else {
        // Delete DM conversation
        console.log('Deleting conversation');
        
        // Remove conversation from Firestore
        await deleteDoc(doc(db, 'conversations', conversation.id));
      }

      // Emit via Socket.IO
      if (socket) {
        socket.emit('delete-chat', {
          groupId: isGroupChat ? conversation.id : null,
          conversationId: isDMChat ? conversation.id : null,
          userId: user.uid
        });
      }

      // Clear current conversation
      if (isGroupChat) {
        setCurrentGroup(null);
      } else {
        setCurrentDM(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center chat-container h-full max-h-screen overflow-hidden">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-6 animate-bounce-gentle">💬</div>
          <h2 className="text-2xl font-semibold text-light-text dark:text-dark-text mb-3">Welcome to Chat Party</h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md">
            {activeTab === 'groups' 
              ? 'Select a group from the sidebar to start chatting with your team'
              : 'Select a conversation or start a new DM to begin your private chat'
            }
          </p>
        </div>
      </div>
    );
  }

  // Helper function to get conversation display info
  const getConversationInfo = () => {
    if (isGroupChat) {
      return {
        name: currentGroup.name,
        description: currentGroup.description || 'Group chat',
        avatar: currentGroup.name.charAt(0).toUpperCase()
      };
    } else if (isDMChat) {
      const otherUserId = currentDM.participants.find(id => id !== user.uid);
      const otherUserIndex = currentDM.participants.indexOf(otherUserId);
      const otherUserName = currentDM.participantNames[otherUserIndex];
      return {
        name: otherUserName,
        description: 'Direct message',
        avatar: otherUserName.charAt(0).toUpperCase()
      };
    }
    return { name: '', description: '', avatar: '' };
  };

  const conversationInfo = getConversationInfo();

  return (
    <div className="flex-1 flex flex-col chat-container h-full max-h-screen overflow-hidden">
      {/* Chat Header */}
      <div className="chat-header px-6 py-4 flex-shrink-0">
        <div className="flex items-center">
          <div className="mr-4">
            <ProfilePicture
              emoji={isGroupChat ? '👥' : (user.avatar?.emoji || '😊')}
              backgroundColor={isGroupChat ? '#6366F1' : (user.avatar?.backgroundColor || '#3B82F6')}
              size="lg"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">{conversationInfo.name}</h2>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{conversationInfo.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            {isDMChat && (
              <span className="badge badge-primary">💬 DM</span>
            )}
            <div className="status-online"></div>
            <ChatActions
              currentConversation={currentConversation}
              activeTab={activeTab}
              currentUser={user}
              onLeaveGroup={handleLeaveGroup}
              onDeleteChat={handleDeleteChat}
            />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="text-4xl mb-4">🚀</div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`group flex ${message.userId === user.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`chat-message relative ${
                  message.userId === user.uid
                    ? 'chat-message-sent'
                    : 'chat-message-received'
                }`}
              >
                {(isGroupChat || message.userId !== user.uid) && (
                  <div className="text-xs font-semibold mb-2 opacity-75">
                    {message.username}
                  </div>
                )}
                
                {/* Message content - either editing or normal view */}
                {editingMessage?.id === message.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 border border-light-border dark:border-dark-border rounded bg-light-bg-primary dark:bg-dark-bg-primary text-light-text dark:text-dark-text resize-none"
                      rows="2"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={saveEditedMessage}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Text content */}
                    {message.text && (
                      <div className="break-words leading-relaxed">
                        {message.text}
                        {message.isEdited && (
                          <span className="text-xs opacity-50 ml-2">(edited)</span>
                        )}
                      </div>
                    )}
                    
                    {/* File attachment */}
                    {message.file && (
                      <FileAttachment file={message.file} />
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs opacity-60">
                    {formatTimestamp(message.timestamp)}
                  </div>
                  
                  {/* Message Actions */}
                  {!editingMessage && (
                    <MessageActions
                      message={message}
                      currentUserId={user.uid}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                      className="ml-2"
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="message-input-area px-6 py-5 flex-shrink-0">
        {/* Show attached file preview */}
        {attachedFile && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {attachedFile.isImage ? '🖼️' : '📎'}
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {attachedFile.originalName}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">
                    {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button
                onClick={removeAttachedFile}
                className="text-blue-600 dark:text-blue-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Remove attachment"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-end space-x-4">
          <div className="flex items-end space-x-2">
            <FileUploadButton
              onFileUpload={handleFileUpload}
              disabled={!!attachedFile}
            />
          </div>
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${conversationInfo.name}...`}
              className="input-field resize-none min-h-[48px] max-h-[120px] py-3"
              rows="1"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() && !attachedFile}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 min-h-[48px] flex items-center space-x-2"
          >
            <span>Send</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-light-text-muted dark:text-dark-text-muted mt-3">
          Press <kbd className="px-1 py-0.5 bg-light-bg-tertiary dark:bg-dark-bg-tertiary rounded text-xs">Enter</kbd> to send, 
          <kbd className="px-1 py-0.5 bg-light-bg-tertiary dark:bg-dark-bg-tertiary rounded text-xs ml-1">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};

export default ChatRoom; 