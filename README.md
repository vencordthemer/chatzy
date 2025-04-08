# Chatzy 

A simple real-time chat app built with [Vite](https://vitejs.dev), Firebase, and React.

---

## 🚀 Getting Started

Follow these steps to get Chatzy up and running on your local machine.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chatzy.git
cd chatzy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

Chatzy uses [Firebase](https://firebase.google.com/) for authentication and real-time data via Firestore.

#### 🔧 Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** (Email/Password or any provider you want).
3. Enable **Cloud Firestore** (Start in test mode for dev).
4. Go to **Project Settings → General → Web App** and register a new web app.
5. Copy the Firebase config and replace the placeholder in `src/firebase-config.ts` :

```ts
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

> ⚠️ Do **not** commit your actual Firebase keys if the repo is public unless you're okay with it being used for testing only.

---

### 4. Start the Project

```bash
npm run dev
```

Then visit `http://localhost:5173` in your browser to start chatting!

---

## 🛠 Tech Stack

- ⚡️ [Vite](https://vitejs.dev) — Lightning-fast frontend tooling
- ⚛️ React — UI Library
- 🔥 Firebase — Auth & Firestore for backend
- 💅 Styled Components (or Tailwind, if used)

---

## 🤝 Contributing

Pull requests are welcome! Feel free to fork this project, submit issues, or suggest new features.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
