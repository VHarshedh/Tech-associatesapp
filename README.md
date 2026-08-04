# 🧠 Tech-Associates Quiz App

An AI-powered, full-stack quiz platform built with **React** and **Firebase**. Create and attempt quizzes manually or let **Google Gemini AI** generate them for you — with real-time data sync, timed modes, shareable public links, AI-graded answers, and a full attempt-history dashboard.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Quiz Generation** | Generate quizzes on any topic using Google Gemini 2.5 Flash via a secure backend proxy |
| 🧑‍💻 **Coding Questions** | Add coding challenges; submissions are graded live by Gemini AI with per-question scores and feedback |
| ✍️ **AI-Graded Short Answers** | Open-ended text answers are evaluated by Gemini — not exact-match — for fair scoring |
| ✏️ **Manual Quiz Creation** | Build custom quizzes with a rich question editor supporting MCQ, MSQ, Short Answer, Numerical, and Coding |
| 🔐 **Secure Authentication** | Firebase Auth with email verification gating and a custom Canvas-rendered CAPTCHA |
| ⏱️ **Timed Quizzes** | Configurable countdown timer (1–180 min) |
| 📅 **Deadlines** | Set a date/time deadline on any quiz |
| 🔗 **Shareable Public Links** | Generate a `#/quiz/:id` link for anyone to attempt your quiz |
| 📊 **Attempt History** | Real-time dashboard of all past attempts with AI and exact-match scores, and expandable response cards |
| 🔄 **Live Data Sync** | Firestore `onSnapshot` listeners — no page refresh needed |
| 🛡️ **Backend API Proxy** | Gemini API key lives only on the Express server — never exposed to the browser |
| 🚦 **Rate Limiting** | Server-side per-IP rate limiter (20 req/min) on all `/api/*` routes |

---

## 🗂️ Project Structure

```
Tech-associatesapp/
├── public/                     # Static assets
├── src/
│   ├── App.js                  # Root component — routing, auth state, dashboard
│   ├── Auth.js                 # Sign in / Sign up with custom CAPTCHA
│   ├── QuizCreator.js          # Create quizzes (manual or AI-generated)
│   ├── QuizList.js             # Browse, preview, and attempt your quizzes
│   ├── QuizAttempt.js          # In-app quiz-taking view (logged-in users)
│   ├── PublicQuizAttempt.js    # Public quiz-taking view (shareable link)
│   ├── AttemptHistory.js       # View past attempts, scores, and responses
│   ├── firebase.js             # Firebase app initialization
│   ├── index.css               # Global design system (CSS variables, utilities)
│   ├── index.js                # React entry point (wrapped in ToastProvider)
│   ├── components/
│   │   ├── Toast.js            # Context-based toast notification system
│   │   ├── Spinner.js          # Animated loading spinner
│   │   ├── EmptyState.js       # Reusable empty state card
│   │   └── Footer.js           # Shared footer
│   └── utils/
│       └── scoring.js          # Shared scoring utilities (getScore, isCorrect, needsAIValidation)
├── server.js                   # Express backend — API proxy with validation & rate limiting
├── .env                        # Environment variables (not committed)
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
# Firebase (client-side — required by the Firebase SDK)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Gemini AI — SERVER SIDE ONLY (never exposed to the browser)
GEMINI_API_KEY=your_gemini_api_key

# reCAPTCHA — SERVER SIDE ONLY
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.
>
> 🔒 `GEMINI_API_KEY` and `RECAPTCHA_SECRET_KEY` are read only by the Express server (`server.js`) and are **never sent to the browser**.

### 4. Start the backend server

```bash
node server.js
```

The API proxy runs on **http://localhost:5000**.

### 5. Start the React development server

In a separate terminal:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The CRA dev server proxies `/api/*` requests to `localhost:5000` automatically (configured via `"proxy"` in `package.json`).

---

## 🧩 How It Works

### Authentication Flow

1. User signs up → email verification is sent automatically.
2. User must verify email before accessing quiz features.
3. Sessions persist across page reloads via `browserLocalPersistence`.
4. A custom Canvas-rendered CAPTCHA (no third-party library) protects the login/signup form.

### Quiz Creation

**AI Mode (Gemini):**
- Enter a topic, choose question types (MCQ, MSQ, Short Answer, Numerical, **Coding**), and set the count.
- The frontend calls `POST /api/generate-quiz` on the Express backend.
- The server builds a structured prompt and calls **Gemini 2.5 Flash** — the API key never leaves the server.
- The JSON response is validated and saved to Firestore.

**Manual Mode:**
- Choose question types and count → a blank question editor appears.
- MCQ/MSQ answers are validated against the options before saving.
- Coding questions get a language selector and a dark code editor for the reference solution.
- Short Answer questions store an ideal answer used for AI grading.

Both modes support:
- Optional **countdown timer**
- Optional **deadline**
- Optional **shareable public link**

### Scoring

The scoring engine (`src/utils/scoring.js`) handles all question types:

| Type | How it's graded |
|---|---|
| **MCQ** | Exact string match against the correct option |
| **MSQ** | Sorted array comparison (order-independent exact match) |
| **Numerical** | String match (tolerant of leading zeros) |
| **Short Answer** | 🤖 Sent to Gemini AI — returns a score (0–100) and written feedback |
| **Coding** | 🤖 Sent to Gemini AI — graded on logic, correctness, and code quality |

After submission, the app calls `POST /api/validate-answers` for any AI-graded questions. Gemini returns per-question feedback and a score. The final quiz score is a weighted average across all question types. Results and per-question feedback are shown inline immediately.

### Backend API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/generate-quiz` | POST | Generates quiz questions via Gemini AI |
| `/api/validate-answers` | POST | Grades Coding & Short Answer responses via Gemini AI |
| `/api/verify-captcha` | POST | Verifies reCAPTCHA tokens server-side |

All endpoints include:
- **Input validation & sanitisation** (type checks, max lengths, allowed values)
- **Per-IP rate limiting** (20 requests/minute)
- **CORS headers**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, HTML5 Canvas API |
| **Styling** | Vanilla CSS with custom design system (CSS variables, Inter font) |
| **Auth & Database** | Firebase Auth, Cloud Firestore |
| **AI** | Google Gemini 2.5 Flash (via backend proxy) |
| **Backend** | Express.js (Node.js) |
| **State** | React Hooks (`useState`, `useEffect`, `useContext`) |
| **Real-time** | Firestore `onSnapshot` listeners |
| **Notifications** | Custom `ToastProvider` context (no external library) |
| **Libraries** | react-firebase-hooks, axios, dotenv |

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the React dev server at `localhost:3000` |
| `node server.js` | Start the Express API proxy at `localhost:5000` |
| `npm test` | Run tests in interactive watch mode |
| `npm run build` | Build the production bundle into `/build` |

---

## 🔐 Security Notes

- **Gemini API key** is stored only in `.env` and read only by `server.js` — it is never included in the React bundle or sent to the browser.
- **Firebase config** keys (`REACT_APP_*`) are browser-safe public identifiers; actual data access is controlled by Firestore security rules.
- **Email verification** blocks unverified users from all quiz features.
- **Custom Canvas CAPTCHA** protects the auth form from bots.
- **Input sanitisation** on all backend endpoints prevents prompt injection and oversized payloads.
- **Rate limiting** (20 req/min per IP) prevents API abuse.
- Firestore queries are scoped to the authenticated user's UID.

---

## 🗺️ Roadmap / Future Ideas

- [x] Coding question type with AI grading
- [x] AI-graded Short Answer questions
- [x] Backend proxy for all sensitive API keys
- [x] Shareable public quiz links
- [ ] Firestore Security Rules for server-side data access control
- [ ] Public quiz leaderboard / score comparison
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
