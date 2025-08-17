import React, { useState, useRef } from "react";
import { auth } from "./firebase";
import { useCreateUserWithEmailAndPassword, useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { sendPasswordResetEmail } from "firebase/auth";
// import ReCAPTCHA from "react-google-recaptcha";
// import axios from "axios";

const Auth = ({ onAuth }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [customError, setCustomError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  // Captcha state
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  // Firebase hooks
  const [createUserWithEmailAndPassword, userSignup, loadingSignup, errorSignup] = useCreateUserWithEmailAndPassword(auth);
  const [signInWithEmailAndPassword, userSignin, loadingSignin, errorSignin] = useSignInWithEmailAndPassword(auth);

  function generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  const handleForgotPassword = async () => {
    setCustomError("");
    setResetSent(false);
    if (!validateEmail(email)) {
      setCustomError("Please enter a valid email address to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setCustomError(err.message || "Failed to send reset email.");
    }
  };

  // const handleCaptcha = (token) => {
  //   setCaptchaToken(token);
  // };

  const validateEmail = (value) => {
    // Simple email regex for validation
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCustomError("");
    setCaptchaError("");
    if (!validateEmail(email)) {
      setCustomError("Please enter a valid email address.");
      return;
    }
    if (captchaInput !== captcha) {
      setCaptchaError("Captcha does not match. Please try again.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(email, password).catch(err => {
          setCustomError(err.message || "Sign up failed. Please try again.");
        });
      } else {
        await signInWithEmailAndPassword(email, password).catch(err => {
          setCustomError(err.message || "Sign in failed. Please try again.");
        });
      }
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
    } catch (err) {
      setCustomError("An unexpected error occurred. Please try again.");
    }
  };

  React.useEffect(() => {
    if (userSignup || userSignin) {
      onAuth(userSignup?.user || userSignin?.user);
    }
  }, [userSignup, userSignin, onAuth]);

  return (
    <div className="auth-container" style={{
      maxWidth: 400,
      margin: "40px auto",
      padding: 24,
      borderRadius: 12,
      boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
      background: "#fff",
      fontFamily: "Segoe UI, Arial, sans-serif"
    }}>
    <h2 style={{textAlign: "center", color: "#2c3e50"}}>{isSignup ? "Sign Up" : "Sign In"}</h2>
  <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", gap: 16}} aria-label={isSignup ? "Sign Up Form" : "Sign In Form"}>
        {!isSignup && (
          <button
            type="button"
            onClick={handleForgotPassword}
            style={{
              background: "none",
              color: "#2980b9",
              border: "none",
              textDecoration: "underline",
              cursor: "pointer",
              marginTop: 4,
              fontSize: 15,
              alignSelf: "flex-end"
            }}
            aria-label="Forgot Password"
          >
            Forgot password?
          </button>
        )}
        <label htmlFor="email" style={{fontWeight: 500}}>Email</label>
        <input
          id="email"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => { setEmail(e.target.value); validateEmail(e.target.value); }}
          required
          aria-invalid={!!emailError}
          aria-describedby="email-error"
          style={{padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 16}}
        />
        {emailError && <span id="email-error" style={{color: "#e74c3c", fontSize: 14}}>{emailError}</span>}

        {/* Custom Captcha as Canvas Image */}
        <label htmlFor="captcha" style={{fontWeight: 500, marginTop: 8}}>Captcha</label>
        <div style={{display: "flex", alignItems: "center", gap: 12, marginBottom: 4}}>
          <canvas
            ref={el => {
              if (!el) return;
              const ctx = el.getContext('2d');
              ctx.clearRect(0, 0, 180, 40);
              ctx.fillStyle = '#eef';
              ctx.fillRect(0, 0, 180, 40);
              ctx.font = 'bold 24px Fira Mono, monospace';
              ctx.fillStyle = '#2c3e50';
              // Add some random rotation and position for each char
              for (let i = 0; i < captcha.length; i++) {
                const angle = (Math.random() - 0.5) * 0.4;
                ctx.save();
                ctx.translate(22 * i + 16, 28);
                ctx.rotate(angle);
                ctx.fillText(captcha[i], 0, 0);
                ctx.restore();
              }
              // Add some random lines for extra obfuscation
              for (let i = 0; i < 4; i++) {
                ctx.strokeStyle = '#b0c4de';
                ctx.beginPath();
                ctx.moveTo(Math.random() * 180, Math.random() * 40);
                ctx.lineTo(Math.random() * 180, Math.random() * 40);
                ctx.stroke();
              }
            }}
            width={180}
            height={40}
            style={{borderRadius: 8, background: '#eef', boxShadow: '0 1px 4px #dbeafe'}}
          />
          <button type="button" onClick={() => setCaptcha(generateCaptcha())} style={{background: '#2980b9', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 15}}>Refresh</button>
        </div>
        <input
          id="captcha"
          type="text"
          placeholder="Type the characters above"
          value={captchaInput}
          onChange={e => setCaptchaInput(e.target.value)}
          required
          maxLength={8}
          autoComplete="off"
          style={{padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 16, letterSpacing: 2}}
        />
        {captchaError && <span style={{color: "#e74c3c", fontSize: 14}}>{captchaError}</span>}

        <label htmlFor="password" style={{fontWeight: 500}}>Password</label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          style={{padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 16}}
        />

  {/* reCAPTCHA removed */}
        <button
          type="submit"
          disabled={loadingSignup || loadingSignin}
          style={{
            background: "#2c3e50",
            color: "#fff",
            padding: "12px 0",
            border: "none",
            borderRadius: 6,
            fontSize: 18,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 8
          }}
          aria-busy={loadingSignup || loadingSignin}
        >
          {isSignup ? "Sign Up" : "Sign In"}
        </button>
      </form>
      {(customError || errorSignup || errorSignin) && (
        <div role="alert" style={{color: "#e74c3c", marginTop: 12, textAlign: "center"}}>
          {customError || errorSignup?.message || errorSignin?.message}
        </div>
      )}
      {resetSent && (
        <div style={{color: "#27ae60", marginTop: 8, textAlign: "center"}}>
          Password reset email sent! Check your inbox.
        </div>
      )}
      <button
        onClick={() => setIsSignup(!isSignup)}
        style={{
          background: "none",
          color: "#2c3e50",
          border: "none",
          textDecoration: "underline",
          cursor: "pointer",
          marginTop: 18,
          fontSize: 16
        }}
        aria-label={isSignup ? "Switch to Sign In" : "Switch to Sign Up"}
      >
        {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
};

export default Auth;
