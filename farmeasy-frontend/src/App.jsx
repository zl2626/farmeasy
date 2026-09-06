import "./App.css";
import { Routes, Route, useLocation } from "react-router-dom"; // ✅ FIX 1
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";

import LandingPage from "./pages/LandingPage.jsx";
import HomePage from "./pages/Homepage.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Register from "./pages/Register.jsx";
import MarketPrices from "./pages/MarketPrices.jsx";
import AgriSchemes from "./pages/AgriSchemes.jsx";
import CropList from "./pages/CropList.jsx";
import MyDoubts from "./pages/MyDoubts.jsx";
import CreateDoubt from "./pages/CreateDoubt.jsx";
import Profile from "./pages/Profile.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import Chatbot from "./pages/Chatbot.jsx";
import FeedbackForm from "./pages/ContactUs.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

const withNavbar = (Page) => (
  <>
    <Navbar />
    <div style={{ paddingTop: "90px", minHeight: "100vh" }}>
      <Page />
    </div>
  </>
);

// ✅ FIX 2: accept location as prop
function AnimatedRoutes({ location }) {
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/about" element={withNavbar(AboutUs)} />
        <Route path="/login" element={withNavbar(Login)} />
        <Route path="/register" element={withNavbar(Register)} />
        <Route path="/forgot-password" element={withNavbar(ForgotPassword)} />
        <Route
          path="/reset-password/:uid/:token"
          element={withNavbar(ResetPassword)}
        />
        <Route path="/market-prices" element={<MarketPrices />} />
        <Route path="/agri-schemes" element={<AgriSchemes />} />
        <Route path="/crops" element={<CropList />} />
        <Route path="/doubts" element={<MyDoubts />} />
        <Route path="/create/doubts" element={<CreateDoubt />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/feedback" element={withNavbar(FeedbackForm)} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const location = useLocation(); // ✅ valid here
  return <AnimatedRoutes location={location} />;
}
