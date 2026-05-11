import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="auth-screen">
        <div className="auth-card auth-card-compact">
          <p className="status-text">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
