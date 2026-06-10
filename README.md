# 🧠 Tech-Associates Quiz App

An AI-powered, full-stack quiz platform built with **React 19** and **Firebase**. Create and attempt quizzes manually or let **Google Gemini AI** generate them for you — with real-time data sync, timed modes, shareable links, and a full attempt-history dashboard.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Quiz Generation** | Generate quizzes on any topic using Google Gemini 3.5 Flash |
| ✏️ **Manual Quiz Creation** | Build custom quizzes with a rich question editor |
| 🔐 **Secure Authentication** | Firebase Auth with email verification gating and custom CAPTCHA |
| ⏱️ **Timed Quizzes** | Configurable countdown timer (1–180 min) with auto-submit |
| 📅 **Deadlines** | Set a date/time deadline on any quiz |
| 🔗 **Shareable Links** | Generate a public link for others to attempt your quiz |
| 📊 **Attempt History** | Real-time dashboard of all past attempts with scores & responses |
| 🔄 **Live Data Sync** | Firestore `onSnapshot` listeners — no page refresh needed |
| ♿ **Accessible** | ARIA attributes throughout the auth flow |

---

## 🗂️ Project Structure

```
Tech-associatesapp/
├── public/                 # Static assets
├── src/
│   ├── App.js              # Root component — auth state, quiz attempt flow
│   ├── Auth.js             # Sign in / Sign up with custom CAPTCHA
│   ├── QuizCreator.js      # Create quizzes (manual or AI-generated)
│   ├── QuizList.js         # Browse and attempt your quizzes
│   ├── AttemptHistory.js   # View past attempts and scores
│   ├── firebase.js         # Firebase app initialization
│   ├── App.css             # Global styles
│   └── index.js            # React entry point
├── api/
│   └── verify-captcha.js   # Express server for CAPTCHA verification
├── server.js               # Express server entry point
├── .env                    # Environment variables (not committed)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Firebase](https://firebase.google.com/) project with **Authentication** and **Firestore** enabled
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

### 1. Clone the repository

```bash
git clone https://github.com/VHarshedh/Tech-associatesapp.git
cd Tech-associatesapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Firebase
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini AI
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

### 4. Run the development server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧩 How It Works

### Authentication Flow

1. User signs up → email verification is sent automatically.
2. User must verify email before accessing quiz features.
3. Sessions persist across page reloads via `browserLocalPersistence`.
4. A custom Canvas-rendered CAPTCHA (no third-party library) protects the login/signup form.

### Quiz Creation

**AI Mode (Gemini):**
- Enter a topic, choose question types (MCQ, MSQ, Short Answer, Numerical), and set the count.
- The app sends a structured prompt to **Gemini 3.5 Flash** via the REST API.
- The JSON response is parsed, validated, and saved to Firestore.

**Manual Mode:**
- Choose question types and count → a blank question editor appears.
- Fill in questions, options, and answers; MCQ/MSQ answers are validated against the given options before saving.

Both modes support:
- Optional **countdown timer**
- Optional **deadline**
- Optional **shareable link** generation

### Scoring

The scoring engine handles all 4 question types:
- **MCQ / Short Answer / Numerical** — case-insensitive string match
- **MSQ** — sorted array comparison (order-independent exact match)

Scores are stored as `scorePercent` (0–100) alongside full response history in Firestore.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, HTML5 Canvas API |
| **Auth & Database** | Firebase Auth, Cloud Firestore |
| **AI** | Google Gemini 3.5 Flash (REST API) |
| **Backend** | Express.js (Node.js) |
| **State** | React Hooks (`useState`, `useEffect`, `useRef`) |
| **Real-time** | Firestore `onSnapshot` listeners |
| **Libraries** | react-firebase-hooks, axios, dotenv |

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start development server at `localhost:3000` |
| `npm test` | Run tests in interactive watch mode |
| `npm run build` | Build the production bundle into `/build` |

---

## 🔐 Security Notes

- All Firebase config and Gemini API keys are stored in `.env` and injected as `REACT_APP_*` env vars — never hard-coded.
- Email verification blocks unverified users from all quiz features.
- A custom Canvas CAPTCHA prevents automated sign-up bots.
- Firestore queries are scoped to the authenticated user's UID.

---

## 🗺️ Roadmap / Future Ideas

- [ ] Firestore Security Rules for server-side data access control
- [ ] Public quiz leaderboard / score comparison
- [ ] Quiz sharing via public URL (in progress)
- [ ] Rich text / image support in questions
- [ ] TypeScript migration
- [ ] Unit & integration tests

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is for educational and portfolio purposes.
