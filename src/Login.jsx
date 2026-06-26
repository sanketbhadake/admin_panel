import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import "./Login.css";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin@123";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (sessionStorage.getItem("adminAuthenticated") === "true") {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 650));

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem("adminAuthenticated", "true");
      navigate(location.state?.from?.pathname || "/", { replace: true });
      return;
    }

    setError("Invalid username or password. Please try again.");
    setIsLoading(false);
  };

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <LockKeyhole size={28} />
          </div>
          <span>Orphan Care Management System</span>
        </div>

        <div className="login-heading">
          <p className="login-eyebrow">ADMIN PORTAL</p>
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to manage your care community.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <div className="login-input-wrap">
            <UserRound size={19} aria-hidden="true" />
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError("");
              }}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="login-input-wrap">
            <LockKeyhole size={19} aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Login...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="login-footer">
          Secure access for authorized administrators only
        </p>
      </section>

      <aside className="login-visual" aria-hidden="true">
        <div className="login-orb login-orb-one" />
        <div className="login-orb login-orb-two" />
        <div className="login-visual-content">
          <p>CARE THAT CONNECTS</p>
          <h2>
            Small actions.
            <br />
            Lasting impact.
          </h2>
          <span>
            Manage donors, volunteers, events, and every story of hope from one
            place.
          </span>
        </div>
      </aside>
    </main>
  );
}

export default Login;
