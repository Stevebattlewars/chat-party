import React, { useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, onSnapshot, where, doc, updateDoc, arrayUnion, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../App';

const DMManager = () => {
  const { user, currentDM, setCurrentDM } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Load user's DM conversations
  useEffect(() => {
    if (!user) return;

    console.log('💬 Loading DM conversations for user:', user.uid);

    const conversationsRef = collection(db, 'conversations');
    
    // Query for conversations where the current user is a participant
    const q = query(
      conversationsRef, 
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('💬 DM conversations snapshot received:', snapshot.docs.length, 'conversations');
      
      const conversationList = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('💬 Conversation data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      });
      
      console.log('✅ Successfully loaded conversations for user:', conversationList.length);
      setConversations(conversationList);
      
      // Set first conversation as current if none selected and we're on DMs tab
      if (!currentDM && conversationList.length > 0) {
        console.log('🎯 Auto-selecting first DM conversation:', conversationList[0].id);
        setCurrentDM(conversationList[0]);
      }
    }, (error) => {
      console.error('❌ DM conversations Firestore error:', error.message);
      
      // Try fallback query without orderBy
      console.log('🔄 Attempting conversations fallback query...');
      const fallbackQ = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid)
      );
      
      onSnapshot(fallbackQ, (snapshot) => {
        console.log('💬 Fallback conversations query - received:', snapshot.docs.length, 'conversations');
        
        const conversationList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort manually by lastMessageAt
        conversationList.sort((a, b) => {
          const aTime = a.lastMessageAt?.toDate?.() || new Date(a.lastMessageAt || 0);
          const bTime = b.lastMessageAt?.toDate?.() || new Date(b.lastMessageAt || 0);
          return bTime - aTime; // Descending order
        });
        
        console.log('✅ Fallback conversations query successful:', conversationList.length);
        setConversations(conversationList);
        
        if (!currentDM && conversationList.length > 0) {
          console.log('🎯 Auto-selecting first DM from fallback:', conversationList[0].id);
          setCurrentDM(conversationList[0]);
        }
      });
    });

    return () => unsubscribe();
  }, [user, currentDM, setCurrentDM]);

  // Load all users for search
  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== user.uid); // Exclude current user
      
      setAllUsers(usersList);
    } catch (error) {
      console.error('❌ Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start a new DM conversation
  const startDMConversation = async (otherUser) => {
    try {
      setLoading(true);
      
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => 
        conv.participants.includes(otherUser.id) && conv.participants.includes(user.uid)
      );
      
      if (existingConversation) {
        setCurrentDM(existingConversation);
        setShowUserSearch(false);
        return;
      }

      // Create new conversation
      const conversationData = {
        participants: [user.uid, otherUser.id],
        participantNames: [user.displayName || user.email.split('@')[0], otherUser.displayName || otherUser.username || otherUser.email.split('@')[0]],
        participantEmails: [user.email, otherUser.email],
        createdAt: new Date(),
        lastMessageAt: new Date(),
        lastMessage: null,
        unreadCount: { [user.uid]: 0, [otherUser.id]: 0 }
      };

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      
      const newConversation = {
        id: docRef.id,
        ...conversationData
      };
      
      setCurrentDM(newConversation);
      setShowUserSearch(false);
      setSearchTerm('');
      
      alert(`✅ Started conversation with ${otherUser.displayName || otherUser.username}!`);
      
    } catch (error) {
      console.error('Error starting DM conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get the other participant in a conversation
  const getOtherParticipant = (conversation) => {
    const otherUserId = conversation.participants.find(id => id !== user.uid);
    const otherUserIndex = conversation.participants.indexOf(otherUserId);
    return {
      id: otherUserId,
      name: conversation.participantNames[otherUserIndex],
      email: conversation.participantEmails[otherUserIndex]
    };
  };

  // Filter users based on search term
  const filteredUsers = allUsers.filter(u => 
    (u.displayName || u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-discord-darker text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Direct Messages</h2>
          <button
            onClick={() => {
              setShowUserSearch(!showUserSearch);
              if (!showUserSearch) loadUsers();
            }}
            className="bg-discord-green hover:bg-green-600 text-white p-2 rounded-full transition-colors"
            title="Start new conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* User Search */}
      {showUserSearch && (
        <div className="p-4 border-b border-gray-600 bg-discord-dark">
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full px-3 py-2 bg-discord-darker border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
              />
            </div>
            
            {loading ? (
              <div className="text-center text-discord-light">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-discord-blurple mx-auto"></div>
                <p className="text-sm mt-2">Loading users...</p>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-discord-light text-sm text-center">
                    {searchTerm ? 'No users found' : 'No other users available'}
                  </p>
                ) : (
                  filteredUsers.map((otherUser) => (
                    <button
                      key={otherUser.id}
                      onClick={() => startDMConversation(otherUser)}
                      className="w-full p-3 bg-discord-darker hover:bg-gray-600 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-discord-blurple rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {(otherUser.displayName || otherUser.username || otherUser.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">
                            {otherUser.displayName || otherUser.username || otherUser.email.split('@')[0]}
                          </p>
                          <p className="text-discord-light text-xs">{otherUser.email}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            
            <button
              onClick={() => {
                setShowUserSearch(false);
                setSearchTerm('');
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-discord-light">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs opacity-75 mt-1">Click the + button to start chatting with someone!</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isActive = currentDM?.id === conversation.id;
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => setCurrentDM(conversation)}
                  className={`w-full p-3 rounded-lg transition-colors text-left ${
                    isActive 
                      ? 'bg-discord-blurple text-white' 
                      : 'hover:bg-discord-dark text-discord-light'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      isActive ? 'bg-white/20' : 'bg-discord-blurple'
                    }`}>
                      {otherParticipant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${
                        isActive ? 'text-white' : 'text-white'
                      }`}>
                        {otherParticipant.name}
                      </p>
                      <p className={`text-xs truncate ${
                        isActive ? 'text-gray-200' : 'text-discord-light'
                      }`}>
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                    {conversation.unreadCount?.[user.uid] > 0 && (
                      <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unreadCount[user.uid]}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DMManager; 