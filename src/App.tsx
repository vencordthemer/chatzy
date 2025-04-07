import { useState, useEffect } from 'react';
import './index.css';
import { auth, db } from './firebaseConfig'; // Import db
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  limit // Import limit
} from 'firebase/firestore';
import Auth from './components/Auth';
import Chat from './components/Chat';
import ChatList from './components/ChatList';
import UserList from './components/UserList'; // Import UserList

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showUserList, setShowUserList] = useState(false); // State to show/hide UserList
  const [chatCreationError, setChatCreationError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for changes in authentication state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setSelectedChatId(null); // Clear selected chat on logout
        setShowUserList(false); // Hide user list on logout
      }
      setLoading(false); // Auth check finished
      console.log('Auth state changed:', currentUser);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out successfully!');
      // selectedChatId will be cleared by the onAuthStateChanged listener
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Callback function for ChatList to update selected chat
  const handleSelectChat = (chatId: string) => {
    console.log("Selected chat:", chatId);
    setSelectedChatId(chatId);
    setShowUserList(false); // Hide user list when a chat is selected
    setChatCreationError(null);
  };

  // --- Chat Creation Logic ---
  const handleStartDm = async (otherUserId: string) => {
    if (!user) return;
    setChatCreationError(null);
    console.log(`Attempting to start DM with ${otherUserId}`);

    const chatsRef = collection(db, 'chats');
    const currentUserUid = user.uid;

    // Create a canonical DM ID (sorted UIDs) to prevent duplicates
    const members = [currentUserUid, otherUserId].sort();

    // Query for existing DM chat between these two users
    // Note: Firestore doesn't directly support querying equality on array *order*,
    // so we query for type DM and membership of both users.
    const q = query(
      chatsRef,
      where('type', '==', 'DM'),
      where('members', 'array-contains', currentUserUid),
      limit(10) // Limit results for safety, expecting at most 1
    );

    try {
      const querySnapshot = await getDocs(q);
      let existingChatId: string | null = null;

      // Iterate through potential matches to find the exact one
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Check if this chat has exactly the two members we want (regardless of order initially checked by array-contains)
        if (data.members && data.members.length === 2 && data.members.includes(otherUserId)) {
            existingChatId = doc.id;
            console.log(`Found existing DM chat: ${existingChatId}`);
        }
      });


      if (existingChatId) {
        // Select the existing chat
        handleSelectChat(existingChatId);
      } else {
        // Create a new DM chat
        console.log("No existing DM found, creating new one...");
        const newChatRef = await addDoc(chatsRef, {
          type: 'DM',
          members: members, // Use the sorted array
          createdAt: serverTimestamp(),
        });
        console.log(`New DM chat created: ${newChatRef.id}`);
        handleSelectChat(newChatRef.id); // Select the newly created chat
      }
      setShowUserList(false); // Hide user list after action
    } catch (error) {
      console.error("Error starting/finding DM chat:", error);
      setChatCreationError("Failed to start DM. Check console.");
    }
  };

  if (loading) {
    return <div className="loading-text">Loading...</div>;
  }

  return (
    <div className="App">
      {user ? (
        <>
          <div className="sidebar">
            <div className="sidebar-header">
              <p>Welcome, {user.email || user.uid}!</p>
              <button onClick={handleLogout} style={{ marginRight: '10px' }}>Logout</button>
              <button onClick={() => setShowUserList(!showUserList)}>
                {showUserList ? 'Hide Users' : 'New Chat'}
              </button>
              {chatCreationError && <p className="error-text" style={{ fontSize: '0.9em', padding: '5px 0 0 0', margin: '5px 0 0 0'}}>{chatCreationError}</p>}
            </div>

            <div className="sidebar-content">
                {showUserList ? (
                    <UserList onStartDm={handleStartDm} />
                ) : (
                    <ChatList onSelectChat={handleSelectChat} selectedChatId={selectedChatId} />
                )}
            </div>
          </div>
          <div className="main-chat-area">
            {selectedChatId ? (
              <Chat chatId={selectedChatId} />
            ) : (
              <div className="welcome-message">
                <h2>Welcome to Firebase Chat!</h2>
                <p>Select a chat from the list on the left, or click 'New Chat' to start a conversation.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="App-auth-container">
          <Auth />
        </div>
      )}
    </div>
  );
}

export default App;
