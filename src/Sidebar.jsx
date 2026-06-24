import { useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";

import "@fortawesome/fontawesome-free/css/all.min.css";

const Sidebar = () => {
  const location = useLocation(); // Hook to check active route path dynamically

  const navigate = useNavigate();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");

    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Inline CSS */}

      <style>{`

  /* Sidebar styling with white background */

  .sidebar {

    width: 250px;

    height: 100vh;

    position: fixed;

    left: 0;

    top: 0;

    padding: 18px 12px 16px;

    display: flex;

    flex-direction: column;

    align-items: stretch;

    font-family: "Poppins", Arial, sans-serif;

    background-color: #ffffff;

    color: #000000;

    box-shadow: 4px 0 15px rgba(0, 0, 0, 0.1);

    box-sizing: border-box;

  }



  .sidebar h2 {

    text-align: center;

    font-size: 20px;

    font-weight: 700;

    margin: 0 0 16px;

    border-bottom: 1px solid rgba(0, 0, 0, 0.08);

    padding: 0 8px 14px;

    color: #0f172a;

    line-height: 1.3;

  }



  .sidebar ul {

    list-style: none;

    padding: 0;

    margin: 0;

    display: flex;

    flex-direction: column;

    gap: 5px;

    flex: 1;

    width: 100%;

  }



  .sidebar ul li {

    margin: 0;

  }



  .sidebar ul li a {

    display: flex;

    align-items: center;

    justify-content: flex-start;

    gap: 12px;

    width: 100%;

    min-height: 48px;

    color: #475569;

    text-decoration: none;

    font-size: 15px;

    font-weight: 500;

    padding: 12px 14px;

    border-radius: 10px;

    box-sizing: border-box;

    transition: all 0.2s ease;

    white-space: nowrap;

  }



  .sidebar ul li a i {

    width: 18px;

    text-align: center;

    flex: 0 0 auto;

  }



  /* Hover gradient effect on links */

  .sidebar ul li a:hover {

    background: linear-gradient(90deg, #3683F0, #8B56EC); /* Updated palette accents */

    color: #ffffff;

    transform: translateX(5px);

  }



  /* Active state logic styling */

  .sidebar ul li a.active {

    background: linear-gradient(90deg, #3683F0, #8B56EC);

    color: #ffffff !important;

    font-weight: 500;

  }



  .sidebar-logout {

    width: 100%;

    margin-top: auto;

    display: flex;

    align-items: center;

    justify-content: center;

    gap: 10px;

    min-height: 48px;

    padding: 12px 14px;

    border: 1px solid #e2e8f0;

    border-radius: 10px;

    background: #f8fafc;

    color: #475569;

    font-size: 14px;

    font-weight: 600;

    box-sizing: border-box;

  }



  .sidebar-logout:hover {

    border-color: #dc5669;

    background: #fff1f2;

    color: #be3048;

  }



  .logout-dialog-backdrop {

    position: fixed;

    z-index: 1000;

    inset: 0;

    display: grid;

    place-items: center;

    padding: 20px;

    background: rgba(15, 23, 42, 0.48);

    backdrop-filter: blur(4px);

  }



  .logout-dialog {

    width: min(100%, 400px);

    padding: 28px;

    border-radius: 18px;

    background: #ffffff;

    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);

    text-align: center;

  }



  .logout-dialog-icon {

    width: 54px;

    height: 54px;

    display: grid;

    place-items: center;

    margin: 0 auto 18px;

    border-radius: 50%;

    background: #fff1f2;

    color: #dc3651;

    font-size: 21px;

  }



  .logout-dialog h3 {

    margin: 0 0 8px;

    color: #172033;

    font-size: 21px;

    font-weight: 750;

  }



  .logout-dialog p {

    margin: 0;

    color: #64748b;

    font-size: 14px;

    line-height: 1.6;

  }



  .logout-dialog-actions {

    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 12px;

    margin-top: 24px;

  }



  .logout-dialog-actions button {

    min-height: 44px;

    border-radius: 9px;

    font-size: 14px;

    font-weight: 700;

  }



  .logout-cancel {

    border: 1px solid #dbe1e9;

    background: #ffffff;

    color: #475569;

  }



  .logout-cancel:hover {

    border-color: #aab3c0;

    background: #f8fafc;

  }



  .logout-confirm {

    border: 1px solid #dc3651;

    background: #dc3651;

    color: #ffffff;

  }



  .logout-confirm:hover {

    border-color: #c62d46;

    background: #c62d46;

  }

`}</style>

      {/* Sidebar JSX */}

      <div className="sidebar">
        <h2>Orphan Care Management Hub</h2>

        <ul>
          <li>
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              <i className="fa fa-chart-line"></i> Home
            </Link>
          </li>
          <li>
            <Link
              to="/donors"
              className={location.pathname === "/donors" ? "active" : ""}
            >
              <i className="fa fa-user"></i> Donors
            </Link>
          </li>
          <li>
            <Link
              to="/volunteers"
              className={location.pathname === "/volunteers" ? "active" : ""}
            >
              <i className="fa fa-users"></i> Volunteers
            </Link>
          </li>
          <li>
            <Link
              to="/announcements"
              className={location.pathname === "/announcements" ? "active" : ""}
            >
              <i className="fa fa-bullhorn"></i> Announcements
            </Link>
          </li>
          <li>
            <Link
              to="/events"
              className={location.pathname === "/events" ? "active" : ""}
            >
              <i className="fa fa-calendar"></i> Events
            </Link>
          </li>
          <li>
            <Link
              to="/reports"
              className={location.pathname === "/reports" ? "active" : ""}
            >
              <i className="fa fa-file-alt"></i> Reports
            </Link>
          </li>
          <li>
            <Link
              to="/feedback"
              className={location.pathname === "/feedback" ? "active" : ""}
            >
              <i className="fa-solid fa-comments"></i> Feedback
            </Link>
          </li>{" "}
          {/* Fixed tag */}
        </ul>

        <button
          className="sidebar-logout"
          type="button"
          onClick={() => setShowLogoutDialog(true)}
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i> Logout
        </button>
      </div>

      {showLogoutDialog && (
        <div
          className="logout-dialog-backdrop"
          onMouseDown={() => setShowLogoutDialog(false)}
        >
          <div
            className="logout-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="logout-dialog-icon" aria-hidden="true">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </div>

            <h3 id="logout-dialog-title">Are you sure?</h3>

            <p id="logout-dialog-description">
              You will need to sign in again to access the admin dashboard.
            </p>

            <div className="logout-dialog-actions">
              <button
                className="logout-cancel"
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                autoFocus
              >
                Cancel
              </button>

              <button
                className="logout-confirm"
                type="button"
                onClick={handleLogout}
              >
                Yes, logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
