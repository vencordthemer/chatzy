import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig'; // Import db
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification, // Import sendEmailVerification
  signOut, // Import signOut
  User, // Import User type
  sendPasswordResetEmail // Import sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Import Firestore functions and serverTimestamp

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
  const [message, setMessage] = useState<string | null>(null); // For success/info messages
  const [needsVerification, setNeedsVerification] = useState(false); // State to show resend button
  const [currentUserForResend, setCurrentUserForResend] = useState<User | null>(null); // Store user if verification needed

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setMessage(null);
    setNeedsVerification(false);
    setCurrentUserForResend(null);

    try {
      if (isLogin) {
        // Attempt Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
          alert('Please verify your email address before logging in.');
          setNeedsVerification(true); // Show the resend button
          setCurrentUserForResend(user); // Keep user object to allow resend
          await signOut(auth); // Sign the user out immediately
          console.log('User signed out because email is not verified.');
        } else {
          console.log('User logged in successfully (email verified).');
          // Let onAuthStateChanged in App.tsx handle navigation
        }
      } else {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (user) {
          // Send verification email first
          await sendEmailVerification(user);
          
          // Create user document in Firestore
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp()
          });
          console.log('User document created and verification email sent.');

          // **Sign the user out immediately after sign up**
          await signOut(auth);
          console.log('User signed out after sign up, pending verification.');

          // Update message to instruct user to verify and then log in
          alert('Sign up successful! Please verify your email via the link sent, then log in.');
        }
      }
      // Clear form - might not be needed if component unmounts on success
      // setEmail('');
      // setPassword('');
    } catch (err: any) {
      console.error("Authentication error:", err);
      // Handle specific errors like wrong password, user not found, etc.
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
          setError('Too many login attempts. Please try again later.');
      } else if (err.code === 'auth/email-already-in-use') { // Handle existing email on sign up
          setError('This email address is already in use.');
      } else {
          setError(err.message || 'Failed to authenticate');
      }
      setNeedsVerification(false); // Reset verification flag on error
      setCurrentUserForResend(null);
    }
  };

  // Function to resend verification email
  const handleResendVerification = async () => {
    if (!currentUserForResend) {
      setError("Cannot resend verification: user data missing.");
      return;
    }
    try {
      await sendEmailVerification(currentUserForResend);
      setMessage("Verification email sent again. Please check your inbox.");
      setError(null); // Clear the initial error
      setNeedsVerification(false); // Hide resend button after sending
      setCurrentUserForResend(null);
    } catch (error) {
      console.error("Error resending verification email:", error);
      setError("Failed to resend verification email. Please try again later.");
    }
  };

  // --- Handle Password Reset --- 
  const handlePasswordReset = async () => {
      if (!email) {
          setError('Please enter your email address first.');
          return;
      }
      setError(null);
      setMessage(null);
      setNeedsVerification(false); // Hide verification button if shown
      try {
          await sendPasswordResetEmail(auth, email);
          setMessage(`Password reset email sent to ${email}. Check your inbox (and spam folder).`);
      } catch (err: any) {
          console.error("Error sending password reset email:", err);
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
              setError('Could not send reset email. Is the email address correct?');
          } else {
              setError('Failed to send password reset email. Please try again later.');
          }
      }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleAuthAction}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isLogin} // Password required for sign up, handled by submit for login
            disabled={false} // Keep enabled visually
          />
        </div>
        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p className="error-text">{error}</p>}
        {needsVerification && (
            <button type="button" onClick={handleResendVerification} style={{marginTop: '10px', backgroundColor: '#ff9800'}}>
                Resend Verification Email
            </button>
        )}
        <button type="submit" style={{marginTop: needsVerification ? '5px' : '15px'}}>
            {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
            onClick={handlePasswordReset} 
            className="toggle-button" 
            type="button" // Prevent form submission
            style={{ textDecoration:'none', marginRight: '10px'}} // Adjust style
            disabled={!isLogin} // Only enable forgot password on login screen
            title={!isLogin ? "Switch to Login to reset password" : "Send password reset email"}
        >
            Forgot Password?
        </button>
        <button 
            onClick={() => { 
                setIsLogin(!isLogin); 
                setError(null); // Clear errors/messages when switching modes
                setMessage(null);
                setNeedsVerification(false); 
                setCurrentUserForResend(null);
            }} 
            className="toggle-button"
        >
            {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
        </button>
      </div>
      {/* We can add a separate logout button elsewhere when logged in */}
    </div>
  );
};

export default Auth; 