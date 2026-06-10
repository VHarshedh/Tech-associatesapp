// AttemptHistory.js
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

function AttemptHistory({ user }) {
  const [attempts, setAttempts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    
    setLoading(true);
    setError(null);
    console.log("user", user.uid);
    const ownQuery = query(collection(db, "attempts"), where("userId", "==", user.uid));
    const ownerQuery = query(collection(db, "publicAttempts"), where("ownerId", "==", user.uid));
    console.log("ownerQuery", ownerQuery);
    const mergeAndSet = (ownSnap, ownerSnap) => {
      try {
        const own = ownSnap ? ownSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        const received = ownerSnap ? ownerSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
        const map = new Map();
        [...own, ...received].forEach(a => map.set(a.id, a));
        const merged = Array.from(map.values()).sort((a, b) => {
          const aMs = a.timestamp?.toMillis?.() || (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
          const bMs = b.timestamp?.toMillis?.() || (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
          return bMs - aMs;
        });
        console.log("Fetched attempts:", merged);
        setAttempts(merged);
        setLoading(false);
      } catch (err) {
        console.error("Error processing attempts:", err);
        setError("Failed to process attempts");
        setLoading(false);
      }
    };

    let ownSnapCache = null;
    let ownerSnapCache = null;

    const unsubOwn = onSnapshot(
      ownQuery,
      (snap) => {
        ownSnapCache = snap;
        mergeAndSet(ownSnapCache, ownerSnapCache);
      },
      (err) => {
        console.error("Error fetching own attempts:", err);
        setError("Failed to fetch your attempts");
        setLoading(false);
      }
    );
    console.log("Successfully fetched own attempts");
    const unsubOwner = onSnapshot(
      ownerQuery,
      (snap) => {
        ownerSnapCache = snap;
        mergeAndSet(ownSnapCache, ownerSnapCache);
      },
      (err) => {
        console.error("Error fetching public attempts:", err);
        setError("Failed to fetch public attempts");
        setLoading(false);
      }
    );
    console.log("Successfully fetched public attempts");
    return () => {
      unsubOwn();
      unsubOwner();
    };
  }, [user]);

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <p>Loading attempts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <p style={{ color: "#e74c3c" }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px" }}>
          Retry
        </button>
      </div>
    );
  }

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
                    <div style={{ fontSize: 13, color: "#666" }}>
                      Submitted by: {attempt.participantName || (attempt.email ? attempt.email : "You")}
                    </div>
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
