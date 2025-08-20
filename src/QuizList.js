import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const QuizList = ({ user, onAttempt }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(collection(db, "quizzes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched quizzes:", data);
        setQuizzes(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching quizzes:", err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ color: "#2c3e50" }}>Your Quizzes</h2>

      {loading ? (
        <p>Loading...</p>
      ) : quizzes.length === 0 ? (
        <p>No quizzes found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {quizzes.map((qz) => {
            // 🔹 Handle Firestore Timestamp or plain Date
            let deadlineStr = "None";
            if (qz.deadline) {
              try {
                const date =
                  qz.deadline.toDate?.() || new Date(qz.deadline);
                deadlineStr = date.toLocaleString();
              } catch (e) {
                deadlineStr = "Invalid date";
              }
            }

            return (
              <li
                key={qz.id}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
                  padding: 16,
                  marginBottom: 18,
                  transition: "transform 0.2s ease",
                }}
              >
                <strong style={{ fontSize: 16, color: "#2c3e50" }}>
                  {qz.topic || "Untitled Quiz"}
                </strong>{" "}
                <span style={{ color: "#888", fontSize: 13 }}>
                  [{Array.isArray(qz.types) ? qz.types.join(", ") : "N/A"}]
                </span>
                <br />
                <span style={{ fontSize: 14, color: "#555" }}>
                  Deadline: {deadlineStr}
                </span>
                <br />
                <button
                  onClick={() => onAttempt(qz)}
                  style={{
                    marginTop: 10,
                    background: "#2c3e50",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Attempt
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default QuizList;
