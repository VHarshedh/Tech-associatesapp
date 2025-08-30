# QuizMaster Pro

QuizMaster Pro is a full-stack web application that allows users to create, share, and take quizzes. It's built with React for the frontend and uses Firebase for authentication and database services.

## Features

- **User Authentication:** Secure user sign-up and login using Firebase Authentication with email verification.
- **Quiz Creation:** An intuitive interface for creating quizzes with various question types:
  - Multiple Choice Questions (MCQ)
  - Multiple Select Questions (MSQ)
  - Short Answer
  - Numerical
- **Quiz Management:** Users can view, edit, and delete their created quizzes from a personal dashboard.
- **Public Sharing:** Share quizzes with a public URL, allowing anyone to take them without needing an account.
- **Timed Quizzes:** Set a time limit for quizzes to challenge participants.
- **Quiz Deadlines:** Assign a deadline for quiz submissions.
- **Attempt History:** Logged-in users can view their past quiz attempts and scores.
- **reCAPTCHA Verification:** Protects against spam and bots on forms.

## Tech Stack

- **Frontend:**
  - React
  - `react-firebase-hooks` for easy integration with Firebase.
  - `axios` for making HTTP requests.
- **Backend:**
  - Node.js with Express (for local development).
  - Serverless function for reCAPTCHA verification (compatible with platforms like Vercel/Netlify).
- **Database & Authentication:**
  - Firebase Authentication
  - Firestore Database
- **Styling:**
  - Inline CSS

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js and npm (or yarn)
- A Firebase project

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/your_username/harshedh.git
    ```
2.  **Navigate to the project directory**
    ```sh
    cd harshedh
    ```
3.  **Install NPM packages**
    ```sh
    npm install
    ```

### Running the Application

1.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Firebase project configuration and reCAPTCHA keys. See the [Environment Variables](#environment-variables) section for more details.

2.  **Start the React development server:**
    ```sh
    npm start
    ```
    The application will be available at `http://localhost:3000`.

3.  **Start the Express server (for local reCAPTCHA verification):**
    ```sh
    node server.js
    ```
    The server will run on `http://localhost:5000`.

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

`REACT_APP_FIREBASE_API_KEY`
`REACT_APP_FIREBASE_AUTH_DOMAIN`
`REACT_APP_FIREBASE_PROJECT_ID`
`REACT_APP_FIREBASE_STORAGE_BUCKET`
`REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
`REACT_APP_FIREBASE_APP_ID`
`REACT_APP_RECAPTCHA_SITE_KEY`
`RECAPTCHA_SECRET_KEY`

You can get the Firebase configuration values from your Firebase project settings. The reCAPTCHA keys can be obtained from the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin/).

## Project Structure

```
.
├── api/
│   └── verify-captcha.js  # Serverless function for reCAPTCHA
├── public/                # Public assets
├── src/
│   ├── components/        # (Optional) For smaller, reusable components
│   ├── App.css
│   ├── App.js             # Main application component
│   ├── App.test.js
│   ├── AttemptHistory.js  # Component to show quiz attempt history
│   ├── Auth.js            # Authentication component
│   ├── QuizCreator.js     # Component for creating quizzes
│   ├── QuizList.js        # Component to list user's quizzes
│   ├── firebase.js        # Firebase configuration
│   └── index.js           # Entry point of the React app
├── .gitignore
├── package.json
├── README.md
└── server.js              # Express server for local development
```
