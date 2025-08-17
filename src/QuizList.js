import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const QuizList = ({ user, onAttempt }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuizzes() {
      setLoading(true);
      const q = query(collection(db, "quizzes"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }
    fetchQuizzes();
  }, [user]);

  return (
    <div style={{marginTop: 32}}>
      <h2 style={{color: "#2c3e50"}}>Your Quizzes</h2>
      {loading ? <p>Loading...</p> : quizzes.length === 0 ? <p>No quizzes found.</p> : (
        <ul style={{listStyle: "none", padding: 0}}>
          {quizzes.map(qz => (
            <li key={qz.id} style={{background: "#fff", borderRadius: 8, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", padding: 16, marginBottom: 18}}>
              <strong>{qz.topic}</strong> <span style={{color: "#888"}}>[{qz.types?.join(", ")}]</span><br />
              Deadline: {qz.deadline ? new Date(qz.deadline).toLocaleString() : "None"}<br />
              <button onClick={() => onAttempt(qz)} style={{marginTop: 8, background: "#2c3e50", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer"}}>Attempt</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuizList;
