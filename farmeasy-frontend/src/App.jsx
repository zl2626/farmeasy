import { createElement, lazy, Suspense } from "react";
import "./App.css";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const HomePage = lazy(() => import("./pages/Homepage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const MarketPrices = lazy(() => import("./pages/MarketPrices.jsx"));
const AgriSchemes = lazy(() => import("./pages/AgriSchemes.jsx"));
const CropList = lazy(() => import("./pages/CropList.jsx"));
const MyDoubts = lazy(() => import("./pages/MyDoubts.jsx"));
const CreateDoubt = lazy(() => import("./pages/CreateDoubt.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const AboutUs = lazy(() => import("./pages/AboutUs.jsx"));
const Chatbot = lazy(() => import("./pages/Chatbot.jsx"));
const FeedbackForm = lazy(() => import("./pages/ContactUs.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));

const withNavbar = (PageComponent) => (
  <>
    <Navbar />
    <div style={{ paddingTop: "90px", minHeight: "100vh" }}>
      {createElement(PageComponent)}
    </div>
  </>
);

function AnimatedRoutes({ location }) {
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<div className="route-loading" role="status">正在加载页面...</div>}>
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
          <Route path="/feedback" element={withNavbar(FeedbackForm)} />
          <Route element={<ProtectedRoute />}>
            <Route path="/doubts" element={<MyDoubts />} />
            <Route path="/create/doubts" element={<CreateDoubt />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

export default function App() {
  const location = useLocation();
  return <AnimatedRoutes location={location} />;
}
