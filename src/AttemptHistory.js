// AttemptHistory.js
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

function AttemptHistory({ user }) {
  const [attempts, setAttempts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user?.uid) return;
      try {
        const q = query(
          collection(db, "attempts"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log("Fetched attempts:", data); // ✅ Debug log
        setAttempts(data);
      } catch (err) {
        console.error("Failed to fetch attempts:", err);
      }
    };
    fetchAttempts();
  }, [user]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 24,
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: 20, color: "#2c3e50" }}>Your Quiz Attempts</h2>

      {attempts.length === 0 ? (
        <p style={{ color: "#888" }}>No attempts yet.</p>
      ) : (
        <form style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {attempts.map((attempt) => {
            // Safely handle timestamp
            let dateStr = "No timestamp";
            if (attempt.timestamp?.seconds) {
              dateStr = new Date(
                attempt.timestamp.seconds * 1000
              ).toLocaleString();
            }

            return (
              <label
                key={attempt.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #e0e6ed",
                  borderRadius: 8,
                  padding: "12px 16px",
                  background: selectedId === attempt.id ? "#f9fbfd" : "#fff",
                  boxShadow:
                    selectedId === attempt.id
                      ? "0 2px 8px rgba(0,0,0,0.08)"
                      : "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="radio"
                    name="attempt"
                    checked={selectedId === attempt.id}
                    onChange={() => setSelectedId(attempt.id)}
                    style={{ accentColor: "#2c3e50", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#2c3e50" }}>
                      {attempt.quizTopic || "Untitled Quiz"}
                    </div>
                    <div style={{ fontSize: 13, color: "#666" }}>{dateStr}</div>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "#27ae60",
                    }}
                  >
                    {attempt.scorePercent ?? 0}%
                  </div>
                </div>

                {selectedId === attempt.id && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid #eee",
                      fontSize: 15,
                      color: "#34495e",
                    }}
                  >
                    <strong>Responses:</strong>
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      {attempt.responses?.map((r, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          <span style={{ fontWeight: 500 }}>{r.question}</span>
                          <br />
                          <span style={{ color: "#555" }}>
                            Your Answer:{" "}
                            {Array.isArray(r.answer)
                              ? r.answer.join(", ")
                              : r.answer ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </label>
            );
          })}
        </form>
      )}
    </div>
  );
}

export default AttemptHistory;
