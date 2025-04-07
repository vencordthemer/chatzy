import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebaseConfig'; // Import Firestore DB and Auth
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp, // Import Timestamp type
  doc,      // Import doc
  getDoc    // Import getDoc
} from 'firebase/firestore';

// Define the structure of a message document
interface Message {
  id: string;
  text: string;
  uid: string; // User ID of the sender
  createdAt: Timestamp; // Firestore Timestamp
  // Add displayName or photoURL later if needed
}

// Add props interface to accept chatId
interface ChatProps {
  chatId: string;
}

const Chat: React.FC<ChatProps> = ({ chatId }) => { // Destructure chatId from props
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null); // For scrolling to bottom
  const [error, setError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [chatUserEmailMap, setChatUserEmailMap] = useState<{ [userId: string]: string }>({}); // Map UID to Email for this chat
  const currentUser = auth.currentUser; // Get current user for checking sent/received

  // --- Fetch User Email Helper --- 
  const fetchUserEmail = useCallback(async (userId: string): Promise<string | null> => {
    // Avoid fetching if already known in this chat's map
    if (chatUserEmailMap[userId]) {
        return chatUserEmailMap[userId];
    }
    // Avoid fetching self if logged in (should know own email)
    if (currentUser && userId === currentUser.uid) {
      return currentUser.email; 
    }

    console.log(`Chat: Fetching email for UID: ${userId}`);
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            return userDocSnap.data().email || null;
        } else {
            console.warn(`Chat: User document not found for UID: ${userId}`);
            return null;
        }
    } catch (err) {
        console.error(`Chat: Error fetching email for user ${userId}:`, err);
        return null; // Return null on error
    }
  }, [chatUserEmailMap, currentUser]); // Re-create if map or current user changes
  // --- End Helper --- 

  // Fetch messages for the selected chat
  useEffect(() => {
    if (!chatId) {
        setMessages([]); // Clear messages if no chat is selected
        setLoadingMessages(false);
        setChatUserEmailMap({}); // Clear map if no chat selected
        return; 
    }
    
    setLoadingMessages(true);
    setError(null);
    setChatUserEmailMap({}); // Clear map when chat changes

    console.log(`Fetching messages for chat: ${chatId}`);

    // Reference the messages subcollection within the specific chat document
    const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesCollectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      const senderIds = new Set<string>(); // Collect unique sender IDs

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Add better timestamp handling if needed
        if (data.text && data.uid && data.createdAt) {
            const message = {
                id: doc.id,
                text: data.text,
                uid: data.uid,
                createdAt: data.createdAt as Timestamp,
            };
            fetchedMessages.push(message);
            senderIds.add(message.uid); // Add sender UID to the set
        } else {
            console.warn("Skipping message with missing fields:", doc.id, data);
        }
      });
      
      setMessages(fetchedMessages);
      setLoadingMessages(false);

      // Fetch emails for senders if needed
      const idsToFetch = Array.from(senderIds).filter(uid => !chatUserEmailMap[uid] && uid !== currentUser?.uid);
      if (idsToFetch.length > 0) {
          console.log(`Chat: Fetching emails for UIDs:`, idsToFetch);
          const emailPromises = idsToFetch.map(uid => fetchUserEmail(uid));
          const emails = await Promise.all(emailPromises);

          const newEmailMap: { [userId: string]: string } = {};
          idsToFetch.forEach((uid, index) => {
              if (emails[index]) { // Only add if email was found
                  newEmailMap[uid] = emails[index]!;
              }
          });
          
          // Add own email to map if logged in
          if (currentUser?.email && !chatUserEmailMap[currentUser.uid]) {
              newEmailMap[currentUser.uid] = currentUser.email;
          }
          
          setChatUserEmailMap(prevMap => ({ ...prevMap, ...newEmailMap }));
          console.log("Chat: Updated email map:", { ...chatUserEmailMap, ...newEmailMap });
      } else {
          console.log("Chat: No new sender emails to fetch or only self.");
          // Ensure own email is in map if not fetched
          if (currentUser?.email && !chatUserEmailMap[currentUser.uid]) {
             setChatUserEmailMap(prevMap => ({ ...prevMap, [currentUser.uid]: currentUser.email! }));
          }
      }

    }, (err) => {
      console.error(`Error fetching messages for chat ${chatId}: `, err);
      setError(`Failed to load messages for chat ${chatId}.`);
      setLoadingMessages(false);
    });

    // Cleanup listener on unmount or when chatId changes
    return () => unsubscribe();
  }, [chatId, currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler - now sends to the specific chat's subcollection
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser || !chatId) {
      return;
    }

    setError(null); // Clear error before sending
    try {
      // Reference the specific chat's messages subcollection
      const messagesCollectionRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesCollectionRef, {
        text: newMessage,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
      console.log(`Message sent to chat ${chatId} successfully!`);
    } catch (err) {
      console.error(`Error sending message to chat ${chatId}: `, err);
      setError(`Failed to send message. Please try again.`); // Display send errors
    }
  };

  if (loadingMessages) return <p className="loading-text">Loading messages...</p>;

  // Function to get sender display name (email or fallback)
  const getSenderDisplayName = (uid: string): string => {
      if (currentUser && uid === currentUser.uid) {
          return "You";
      }
      if (chatUserEmailMap[uid]) {
          return chatUserEmailMap[uid];
      }
      // Optionally show loading state while emails load?
      // if (loadingChatEmails) { return "Loading..."; } 
      return `User (${uid.substring(0, 6)}...)`; // Fallback
  };

  return (
    <div className="chat-container">
      <h4>Chat ID: {chatId}</h4> {/* Display current chat ID for debugging */} 
      <div className="message-list">
        {messages.length === 0 && !loadingMessages && <p className="loading-text">No messages yet. Send one!</p>} 
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`message ${msg.uid === currentUser?.uid ? 'sent' : 'received'}`}
          >
            <p><strong>{getSenderDisplayName(msg.uid)}</strong>: {msg.text}</p>
            <span className="timestamp">
              {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={!chatId}
        />
        <button type="submit" disabled={!newMessage.trim() || !chatId}>Send</button>
      </form>
      {error && <p className="error-text" style={{padding: '5px', margin: 0, background: 'var(--sidebar-bg)'}}>{error}</p>}
    </div>
  );
};

export default Chat; 