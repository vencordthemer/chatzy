import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';

// Interface for Chat metadata
interface ChatMeta {
  id: string;
  type: 'DM' | 'GROUP';
  members: string[];
  groupName?: string; // Optional group name
  // Add lastMessageTimestamp later for sorting
}

// Props for ChatList, including a callback for when a chat is selected
interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null; // Add selectedChatId prop
}

const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedChatId }) => {
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmailMap, setUserEmailMap] = useState<{ [userId: string]: string }>({}); // Map UID to Email
  const [loadingEmails, setLoadingEmails] = useState(false); // Separate loading state for emails
  const currentUser = auth.currentUser;

  // Fetch user email function
  const fetchUserEmail = useCallback(async (userId: string): Promise<string | null> => {
      // Avoid fetching if already known
      if (userEmailMap[userId]) {
          return userEmailMap[userId];
      }
      try {
          const userDocRef = doc(db, 'users', userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
              return userDocSnap.data().email || null;
          } else {
              console.warn(`User document not found for UID: ${userId}`);
              return null;
          }
      } catch (err) {
          console.error(`Error fetching email for user ${userId}:`, err);
          return null; // Return null on error
      }
  }, [userEmailMap]); // Dependency on the map to avoid re-fetching known emails

  // Effect to fetch chats
  useEffect(() => {
    if (!currentUser) {
      setLoadingChats(false);
      setLoadingEmails(false);
      setError("Not logged in");
      setChats([]);
      setUserEmailMap({}); // Clear map on logout
      return;
    }

    setError(null);
    setLoadingChats(true);
    setLoadingEmails(true); // Start loading emails too
    setUserEmailMap({}); // Clear map on user change

    const chatsCollection = collection(db, 'chats');
    const q = query(chatsCollection, where('members', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => { // Make callback async
      const fetchedChats: ChatMeta[] = [];
      const otherMemberIds = new Set<string>(); // Collect unique IDs of DM partners

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type && data.members) {
          const chat: ChatMeta = {
            id: doc.id,
            type: data.type as 'DM' | 'GROUP',
            members: data.members as string[],
            groupName: data.groupName,
          };
          fetchedChats.push(chat);

          // If it's a DM, find the other member's ID
          if (chat.type === 'DM' && chat.members.length === 2) {
            const otherMemberId = chat.members.find(uid => uid !== currentUser.uid);
            if (otherMemberId) {
              otherMemberIds.add(otherMemberId);
            }
          }
        } else {
            console.warn("Skipping chat document with missing fields:", doc.id, data);
        }
      });

      setChats(fetchedChats);
      setLoadingChats(false); // Chats are loaded

      // Now fetch emails for the other members if there are any
      if (otherMemberIds.size > 0) {
        console.log("Fetching emails for UIDs:", Array.from(otherMemberIds));
        const emailPromises = Array.from(otherMemberIds).map(uid => fetchUserEmail(uid));
        const emails = await Promise.all(emailPromises);
        
        const newEmailMap: { [userId: string]: string } = {};
        Array.from(otherMemberIds).forEach((uid, index) => {
            if (emails[index]) { // Only add if email was found
                newEmailMap[uid] = emails[index]!;
            }
        });
        
        setUserEmailMap(prevMap => ({ ...prevMap, ...newEmailMap })); // Merge new emails into map
        console.log("Updated email map:", { ...userEmailMap, ...newEmailMap });
      } else {
        console.log("No other DM members found to fetch emails for.");
      }
      setLoadingEmails(false); // Email loading finished (or wasn't needed)

    }, (err) => {
      console.error("Error fetching chat list: ", err);
      setError("Failed to load chats.");
      setLoadingChats(false);
      setLoadingEmails(false);
    });

    return () => unsubscribe();
  }, [currentUser]); // <-- REMOVED fetchUserEmail from here

  const getChatDisplayName = (chat: ChatMeta): string => {
    if (chat.type === 'GROUP') {
        return chat.groupName || `Group (${chat.members.length})`;
    } else { // DM
        const otherMemberId = chat.members.find(uid => uid !== currentUser?.uid);
        if (otherMemberId && userEmailMap[otherMemberId]) {
            return `DM with ${userEmailMap[otherMemberId]}`; // Use fetched email
        } else if (otherMemberId) {
            return `DM with ${otherMemberId.substring(0, 6)}...`; // Fallback to UID if email not loaded/found
        } else {
            return "Direct Message (Unknown)"; // Fallback if member ID not found
        }
    }
  };

  if (loadingChats) return <p className="loading-text">Loading chats...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;
  if (!currentUser) return <p>Please log in.</p>;

  return (
    <div className="chat-list-container" style={{ borderRight: '1px solid #ccc', padding: '10px', height: '100vh', overflowY: 'auto' }}>
      <h3>Your Chats</h3>
      {chats.length === 0 && !loadingChats && !loadingEmails ? (
        <p>No chats yet. Start a new one!</p>
      ) : (
        <ul>
          {chats.map((chat) => (
            <li 
              key={chat.id} 
              onClick={() => onSelectChat(chat.id)} 
              className={chat.id === selectedChatId ? 'selected' : ''}
            >
              {getChatDisplayName(chat)}
            </li>
          ))}
        </ul>
      )}
      {/* Add button/mechanism to start new chats here later */}
    </div>
  );
};

export default ChatList; 