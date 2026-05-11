import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

function LoginPage() {
  const { isAuthenticated, isReady, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isReady && isAuthenticated) {
    const destination = location.state?.from?.pathname ?? "/status";
    return <Navigate to={destination} replace />;
  }


  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login(form);
      const destination = location.state?.from?.pathname ?? "/status";
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <p className="eyebrow">Secure Access</p>
        <h1>Log in to the IoT dashboard</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              placeholder="Enter your username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Log in"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default LoginPage;
