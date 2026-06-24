import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Sidebar from "./Sidebar";
import Login from "./Login";
import Home from "./Home";
import Donors from "./donars";
import Volunteers from "./volunteers";
import Announcements from "./Announcements";
import Events from "./events";
import Reports from "./reports";
import Feedback from "./Feedback"; // 1. Import your newly separated Feedback Page component
import "./App.css";

function ProtectedLayout() {
  const location = useLocation();

  if (sessionStorage.getItem("adminAuthenticated") !== "true") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div>
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/donors" element={<Donors />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/events" element={<Events />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<ProtectedLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
