import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LandingPage from "./components/LandingPage";
import DailyMode from "./components/DailyMode";
import StreakMode from "./components/StreakMode";
import Leaderboard from "./pages/Leaderboard";
import AdminPanelNew from "./pages/AdminPanelNew";
import "@progress/kendo-theme-default/dist/all.css";
import "./style.css";

type Page = "home" | "daily-mode" | "streak-mode" | "leaderboard" | "admin";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>("home");

  const renderPage = () => {
    switch (currentPage) {
      case "daily-mode":
        return <DailyMode onNavigate={setCurrentPage} />;
      case "streak-mode":
        return <StreakMode onNavigate={setCurrentPage} />;
      case "leaderboard":
        return <Leaderboard onNavigate={setCurrentPage} />;
      case "admin":
        return <AdminPanelNew onNavigate={setCurrentPage} />;
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };

  // return <div className="app">{renderPage()}</div>;

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={ <div className="app"><AdminPanelNew onNavigate={setCurrentPage} /></div>} />

        <Route
          path="*"
          element={<div className="app">{renderPage()}</div>}
        />
      </Routes>
    </Router>
  );

};

export default App;
