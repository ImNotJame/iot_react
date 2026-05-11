import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function DashboardLayout() {
  const { logout, username } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">IoT Control</p>
          <h1>Device Dashboard</h1>
        </div>
        <div className="topbar-actions">
          <span className="welcome-pill">{username}</span>
          <button type="button" className="logout-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="main-nav" aria-label="Main navigation">
        <NavLink
          to="/status"
          className={({ isActive }) =>
            isActive ? "nav-link nav-link-active" : "nav-link"
          }
        >
          Device Status
        </NavLink>
        <NavLink
          to="/items"
          className={({ isActive }) =>
            isActive ? "nav-link nav-link-active" : "nav-link"
          }
        >
          Manage Items
        </NavLink>
      </nav>

      <main className="content-panel">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
