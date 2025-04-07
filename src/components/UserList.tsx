// packages/frontend/src/components/UserList.tsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Simple User interface for now
interface UserData {
  id: string; // Firestore document ID == Auth UID
  email: string;
  // Add displayName later
}

interface UserListProps {
  // Callback functions to be implemented later for starting chats
  onStartDm: (userId: string) => void;
}

const UserList: React.FC<UserListProps> = ({ onStartDm }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) {
          setError("Not logged in");
          setLoading(false);
          return;
      }
      setLoading(true);
      setError(null);
      try {
        const usersCollection = collection(db, 'users');
        // Query all users EXCEPT the current user
        const q = query(usersCollection, where('uid', '!=', currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: UserData[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUsers.push({
            id: doc.id, // which is the uid
            email: data.email || 'No email',
          });
        });
        setUsers(fetchedUsers);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]); // Refetch if user changes

  if (loading) return <p className="loading-text">Loading users...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;
  if (!currentUser) return <p>Please log in to see users.</p>;

  return (
    <div className="user-list-container">
      <h4>Start a Chat With:</h4>
      {users.length === 0 ? (
        <p>No other users found.</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              <span>{user.email}</span>
              {/* Simple button to start DM - Group selection UI is more complex */}
              <button onClick={() => onStartDm(user.id)}>
                DM
              </button>
              {/* TODO: Add mechanism for selecting multiple users for group chat */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList; 