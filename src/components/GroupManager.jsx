import React, { useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, onSnapshot, where, doc, updateDoc, arrayUnion, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../App';

const GroupManager = () => {
  const { user, currentGroup, setCurrentGroup } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Utility functions for permissions
  const isAdmin = () => user?.role === 'admin';
  const canCreateRooms = () => user?.permissions?.includes('create_rooms') || isAdmin();

  // Load user's groups
  useEffect(() => {
    if (!user) return;

    console.log('🔍 Loading groups for user:', user.uid);

    // Load both user groups and public admin-created groups
    const groupsRef = collection(db, 'groups');
    
    // Query for groups where user is a member OR public admin-created groups
    const q = query(
      groupsRef, 
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('👥 Groups snapshot received:', snapshot.docs.length, 'groups');
      
      const allGroups = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📁 Group data:', data);
        return {
          id: doc.id,
          ...data
        };
      });

      // Filter groups based on membership or public access
      const userGroups = allGroups.filter(group => 
        group.members?.includes(user.uid) || 
        (group.type === 'public' && group.isAdminCreated)
      );
      
      console.log('✅ Processed groups for user:', userGroups);
      setGroups(userGroups);
      
      // Set first group as current if none selected
      if (!currentGroup && userGroups.length > 0) {
        console.log('🎯 Setting current group to:', userGroups[0].name);
        setCurrentGroup(userGroups[0]);
      }
    }, (error) => {
      console.error('❌ Groups Firestore error:', error);
    });

    return () => unsubscribe();
  }, [user, currentGroup, setCurrentGroup]);

  // Create new group
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const groupData = {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        createdBy: user.uid,
        createdAt: new Date(),
        members: [user.uid],
        type: isAdmin() ? 'public' : 'private', // Admins create public groups by default
        isAdminCreated: isAdmin(),
        moderators: isAdmin() ? [user.uid] : []
      };

      const docRef = await addDoc(collection(db, 'groups'), groupData);
      
      // Set the new group as current
      setCurrentGroup({
        id: docRef.id,
        ...groupData
      });

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateForm(false);
      
      const groupType = isAdmin() ? 'public room' : 'private group';
      alert(`✅ ${groupType.charAt(0).toUpperCase() + groupType.slice(1)} "${newGroupName.trim()}" created successfully!`);
      
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Join group by ID (for public groups)
  const joinGroup = async (groupId) => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid)
      });
      console.log('✅ Joined group:', groupId);
    } catch (error) {
      console.error('Error joining group:', error);
      setError('Failed to join group. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createGroup();
    }
  };

  return (
    <div className="h-full bg-discord-dark text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-discord-darker">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Groups</h2>
            {isAdmin() && (
              <p className="text-xs text-yellow-400 mt-1">👑 Admin - Can create public rooms</p>
            )}
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-8 h-8 bg-discord-blurple hover:bg-blue-600 rounded-full flex items-center justify-center text-lg font-semibold transition-colors"
            title={isAdmin() ? "Create Public Room" : "Create Private Group"}
          >
            +
          </button>
        </div>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="p-4 bg-discord-darker border-b border-gray-600">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-300">
                Creating: 
              </span>
              <span className={`text-sm px-2 py-1 rounded ${
                isAdmin() 
                  ? 'bg-yellow-600 text-yellow-100' 
                  : 'bg-blue-600 text-blue-100'
              }`}>
                {isAdmin() ? '🏠 Public Room' : '👥 Private Group'}
              </span>
            </div>
            
            {error && (
              <div className="bg-red-500 text-white px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            
            <div>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAdmin() ? "Public room name" : "Group name"}
                className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-discord-blurple"
                disabled={loading}
              />
            </div>
            
            <div>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-discord-blurple resize-none"
                rows="2"
                disabled={loading}
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={createGroup}
                disabled={loading || !newGroupName.trim()}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isAdmin()
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-discord-green hover:bg-green-600 text-white'
                }`}
              >
                {loading ? 'Creating...' : (isAdmin() ? 'Create Room' : 'Create Group')}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setError('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="p-4 text-center text-discord-light">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-sm">No groups yet</p>
            <p className="text-xs opacity-75">
              {isAdmin() ? 'Create a public room to start' : 'Create a group to start chatting'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {groups.map((group) => (
              <div key={group.id} className="relative">
                <button
                  onClick={() => setCurrentGroup(group)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentGroup?.id === group.id
                      ? 'bg-discord-blurple text-white'
                      : 'hover:bg-discord-darker text-discord-light hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold mr-3 text-sm ${
                      group.isAdminCreated 
                        ? 'bg-yellow-600' 
                        : 'bg-discord-blurple'
                    }`}>
                      {group.isAdminCreated ? '🏠' : group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium truncate">{group.name}</div>
                        {group.isAdminCreated && (
                          <span className="text-xs bg-yellow-600 text-yellow-100 px-1.5 py-0.5 rounded">
                            PUBLIC
                          </span>
                        )}
                        {group.type === 'private' && (
                          <span className="text-xs bg-gray-600 text-gray-100 px-1.5 py-0.5 rounded">
                            PRIVATE
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <div className="text-xs opacity-75 truncate">
                          {group.description}
                        </div>
                      )}
                      {group.isAdminCreated && (
                        <div className="text-xs text-yellow-400 mt-1">
                          👑 Admin Room
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                
                {/* Join button for public groups user isn't a member of */}
                {group.type === 'public' && 
                 group.isAdminCreated && 
                 !group.members?.includes(user.uid) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      joinGroup(group.id);
                    }}
                    className="absolute right-2 top-2 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                  >
                    Join
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-discord-darker">
        <div className="text-xs text-discord-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-discord-blurple rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">
                {user?.displayName || user?.email?.split('@')[0]}
              </span>
            </div>
            {isAdmin() && (
              <span className="text-yellow-400 text-xs">👑</span>
            )}
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs opacity-75">
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManager; 