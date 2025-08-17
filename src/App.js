
import React, { useState } from 'react';
import './App.css';

import Auth from './Auth';
import QuizCreator from './QuizCreator';

function App() {
  const [user, setUser] = useState(null);

  return (
    <div className="App">
      {!user ? (
        <Auth onAuth={setUser} />
      ) : (
        <div>
          <h2>Welcome, {user.email}</h2>
          <QuizCreator user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
