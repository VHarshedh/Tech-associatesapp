import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const QuizList = ({ user, onAttempt }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuizzes, setExpandedQuizzes] = useState(new Set());

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

  const toggleQuizExpansion = (quizId) => {
    const newExpanded = new Set(expandedQuizzes);
    if (newExpanded.has(quizId)) {
      newExpanded.delete(quizId);
    } else {
      newExpanded.add(quizId);
    }
    setExpandedQuizzes(newExpanded);
  };

  const renderQuestion = (question, index) => {
    return (
      <div
        key={index}
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            color: "white",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "700",
            flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: "600", 
              fontSize: "16px", 
              marginBottom: "8px", 
              color: "#1e293b", 
              lineHeight: "1.5" 
            }}>
              {question.question}
            </div>
            {question.type && (
              <span style={{
                display: "inline-block",
                background: "#e0f2fe",
                color: "#0369a1",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {question.type}
              </span>
            )}
          </div>
        </div>

        {/* Display options for MCQ and MSQ questions */}
        {(question.type?.toUpperCase() === 'MCQ' || question.type?.toLowerCase() === 'mcq' || question.type?.toLowerCase() === 'multiple_choice') && (
          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px", fontWeight: "500" }}>
              Options (Select one):
            </div>
            {question.options && Array.isArray(question.options) && question.options.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {question.options.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 12px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span style={{
                      background: "#3b82f6",
                      color: "white",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {String.fromCharCode(65 + idx)} {/* A, B, C, D... */}
                    </span>
                    {opt}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: "8px 12px", 
                background: "#fef2f2", 
                border: "1px solid #fecaca", 
                borderRadius: "6px",
                color: "#dc2626",
                fontSize: "13px",
                fontStyle: "italic"
              }}>
                ⚠️ No options available for this MCQ question
              </div>
            )}
          </div>
        )}

        {question.type?.toUpperCase() === 'MSQ' && question.options && Array.isArray(question.options) && (
          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px", fontWeight: "500" }}>
              Options (Select multiple):
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {question.options.map((opt, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span style={{
                    background: "#8b5cf6",
                    color: "white",
                    width: "20px",
                    height: "20px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {idx + 1}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display answer for reference */}
        {question.answer && (
          <div style={{ marginTop: "12px", padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
            <span style={{ fontSize: "13px", color: "#166534", fontWeight: "600" }}>Correct Answer: </span>
            <span style={{ fontSize: "14px", color: "#166534" }}>
              {Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}
            </span>
          </div>
        )}
      </div>
    );
  };

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

            const isExpanded = expandedQuizzes.has(qz.id);

            return (
              <li
                key={qz.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "20px",
                  marginBottom: "24px",
                  transition: "all 0.2s ease",
                  border: "1px solid #f1f5f9"
                }}
              >
                {/* Quiz Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "18px", color: "#1e293b", display: "block", marginBottom: "8px" }}>
                      {qz.topic || "Untitled Quiz"}
                    </strong>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span style={{ 
                        color: "#64748b", 
                        fontSize: "13px",
                        background: "#f1f5f9",
                        padding: "4px 8px",
                        borderRadius: "12px"
                      }}>
                        {qz.questions?.length || 0} questions
                      </span>
                      <span style={{ 
                        color: "#64748b", 
                        fontSize: "13px",
                        background: "#f1f5f9",
                        padding: "4px 8px",
                        borderRadius: "12px"
                      }}>
                        Deadline: {deadlineStr}
                      </span>
                      {qz.timed && (
                        <span style={{ 
                          color: "#64748b", 
                          fontSize: "13px",
                          background: "#f1f5f9",
                          padding: "4px 8px",
                          borderRadius: "12px"
                        }}>
                          Timer: {qz.timerDuration} min
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleQuizExpansion(qz.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: "500",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "#f8fafc";
                      e.target.style.borderColor = "#cbd5e1";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "transparent";
                      e.target.style.borderColor = "#e2e8f0";
                    }}
                  >
                    {isExpanded ? "Hide Details" : "Show Details"}
                    <span style={{ fontSize: "16px" }}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                  </button>
                </div>

                {/* Quiz Details (Expandable) */}
                {isExpanded && (
                  <div style={{ 
                    borderTop: "1px solid #e2e8f0", 
                    paddingTop: "16px",
                    animation: "slideDown 0.3s ease-out"
                  }}>
                    

                     {/* Quiz Statistics */}
                     <div style={{ 
                       display: "grid", 
                       gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
                       gap: "12px", 
                       marginBottom: "20px" 
                     }}>
                      <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                          {qz.questions?.length || 0}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>Questions</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                          {qz.questions?.filter(q => 
                            q.type?.toUpperCase() === 'MCQ' || 
                            q.type?.toLowerCase() === 'multiple_choice'
                          ).length || 0}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>MCQ</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                          {qz.questions?.filter(q => q.type?.toUpperCase() === 'MSQ').length || 0}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>MSQ</div>
                      </div>
                      <div style={{ textAlign: "center", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                          {qz.questions?.filter(q => 
                            q.type?.toLowerCase() === 'short answer' || 
                            q.type?.toLowerCase() === 'short_answer' ||
                            q.type?.toLowerCase() === 'numerical'
                          ).length || 0}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>Text/Numerical</div>
                      </div>
                    </div>

                    {/* Questions List */}
                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ margin: "0 0 16px 0", color: "#1e293b", fontSize: "16px" }}>
                        📝 Questions Preview
                      </h4>
                      {qz.questions && qz.questions.length > 0 ? (
                        <div>
                          {qz.questions.map((question, index) => renderQuestion(question, index))}
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", fontStyle: "italic" }}>No questions available</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => onAttempt(qz)}
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "10px 20px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "14px",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.2)"
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = "translateY(-1px)";
                          e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = "translateY(0)";
                          e.target.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.2)";
                        }}
                      >
                        🎯 Attempt Quiz
                      </button>
                      
                      {qz.shareEnabled && (
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/#/quiz/${qz.id}`;
                            navigator.clipboard.writeText(link);
                            alert("Share link copied to clipboard!");
                          }}
                          style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 20px",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.2)"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.2)";
                          }}
                        >
                          🔗 Copy Share Link
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions (when collapsed) */}
                {!isExpanded && (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => onAttempt(qz)}
                      style={{
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "13px"
                      }}
                    >
                      Attempt
                    </button>
                    {qz.shareEnabled && (
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/#/quiz/${qz.id}`;
                          navigator.clipboard.writeText(link);
                          alert("Link copied to clipboard");
                        }}
                        style={{
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 16px",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "13px"
                        }}
                      >
                        Copy Share Link
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default QuizList;
