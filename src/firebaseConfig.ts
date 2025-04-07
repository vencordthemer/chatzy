import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
        apiKey: "your-api-key",
        authDomain: "your-project-id.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project-id.appspot.com",
        messagingSenderId: "your-messaging-sender-id",
        appId: "your-app-id",
        measurementId: "your-measurement-id"
      
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Export the services for use in other parts of your app
export { app, auth, db }; 