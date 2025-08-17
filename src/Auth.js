import React, { useState } from "react";
import { auth } from "./firebase";
import { useCreateUserWithEmailAndPassword, useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import ReCAPTCHA from "react-google-recaptcha";

const Auth = ({ onAuth }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState(false);

  const [createUserWithEmailAndPassword, userSignup, loadingSignup, errorSignup] = useCreateUserWithEmailAndPassword(auth);
  const [signInWithEmailAndPassword, userSignin, loadingSignin, errorSignin] = useSignInWithEmailAndPassword(auth);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!captcha) return;
    if (isSignup) {
      createUserWithEmailAndPassword(email, password);
    } else {
      signInWithEmailAndPassword(email, password);
    }
  };

  React.useEffect(() => {
    if (userSignup || userSignin) {
      onAuth(userSignup?.user || userSignin?.user);
    }
  }, [userSignup, userSignin, onAuth]);

  return (
    <div className="auth-container">
      <h2>{isSignup ? "Sign Up" : "Sign In"}</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <ReCAPTCHA sitekey="YOUR_RECAPTCHA_SITE_KEY" onChange={() => setCaptcha(true)} />
        <button type="submit" disabled={loadingSignup || loadingSignin || !captcha}>{isSignup ? "Sign Up" : "Sign In"}</button>
      </form>
      {errorSignup && <p style={{color:'red'}}>{errorSignup.message}</p>}
      {errorSignin && <p style={{color:'red'}}>{errorSignin.message}</p>}
      <button onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
};

export default Auth;
