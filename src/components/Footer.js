import React from 'react';

/**
 * Shared page footer rendered in both the main layout (App.js)
 * and the public quiz attempt view (PublicQuizAttempt.js).
 * Centralising it here removes the previous duplication.
 */
export default function Footer() {
  return (
    <footer
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        padding: '40px 20px',
        marginTop: '60px',
        textAlign: 'center',
        borderTop: '1px solid #475569',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700' }}>🎯 QuizMaster Pro</div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Create, Share &amp; Take Quizzes</div>

          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px',
                color: '#fbbf24',
              }}
            >
              📞 Need Help?
            </div>
            <div style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.9 }}>
              If you encounter any issues or need assistance, please contact us:
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#10b981',
                padding: '12px',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              📱 Contact: 9363615853
            </div>
          </div>

          <div
            style={{
              fontSize: '14px',
              opacity: 0.6,
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.2)',
              width: '100%',
            }}
          >
            © {new Date().getFullYear()} QuizMaster Pro. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
