import React, { useState, useRef } from "react";
import { auth } from "./firebase";
import { useCreateUserWithEmailAndPassword, useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import ReCAPTCHA from "react-google-recaptcha";
import axios from "axios";

const Auth = ({ onAuth }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const recaptchaRef = useRef();

  const [createUserWithEmailAndPassword, userSignup, loadingSignup, errorSignup] = useCreateUserWithEmailAndPassword(auth);
  const [signInWithEmailAndPassword, userSignin, loadingSignin, errorSignin] = useSignInWithEmailAndPassword(auth);
  const [customError, setCustomError] = useState("");

  const handleCaptcha = (token) => {
    setCaptchaToken(token);
  };

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
    if (!validateEmail(email)) {
      setCustomError("Please enter a valid email address.");
      return;
    }
    if (!captchaToken) {
      recaptchaRef.current.execute();
      return;
    }
    try {
      const res = await axios.post("/api/verify-captcha", { token: captchaToken });
      if (!res.data.success) {
        setCustomError("Captcha verification failed. Please try again.");
        return;
      }
      if (isSignup) {
        await createUserWithEmailAndPassword(email, password).catch(err => {
          setCustomError(err.message || "Sign up failed. Please try again.");
        });
      } else {
        await signInWithEmailAndPassword(email, password).catch(err => {
          setCustomError(err.message || "Sign in failed. Please try again.");
        });
      }
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

        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
          size="invisible"
          onChange={handleCaptcha}
        />
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
