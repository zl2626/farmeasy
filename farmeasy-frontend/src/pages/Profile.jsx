import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Shield, LogOut } from "lucide-react";
import TranslateText from "../components/TranslateText";

const ROLE_LABELS = { FARMER: "农户", EXPERT: "专家", ADMIN: "管理员" };
const roleLabel = (role) => ROLE_LABELS[role] || role;

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      // We can't easily open the Navbar modal from here without context or props.
      // So we will redirect to home which might trigger login if we set a flag, 
      // OR we can just assume the user needs to click login.
      // But the user requested "redirected to profile->login immediately".
      // Since the Navbar handles login modal, and we are ON the profile page (which requires auth),
      // we should probably redirect to Home and maybe show an alert or let the user click login.

      // BETTER APPROACH: Since we are in the Profile Component, 
      // we can check if we are unauthenticated and if so,
      // we can navigate to "/" or display a "Please Login" message.
      // But the user said "redirect to profile -> login". 
      // If the Chatbot redirects to /profile, and /profile sees no user, it should show login.

      // Since we don't have direct control of Navbar's `setOpenLogin` here, 
      // we will redirect to "/" where the user can log in, OR show a visual Login prompt here.

      // However, looking at Navbar.jsx, it has logic: 
      // if (isAuthenticated) handleNavClick("/profile") else setOpenLogin(true)
      // So hitting /profile directly via URL means we bypassed that.

      const timer = setTimeout(() => {
        navigate("/"); // Redirect to home so they can use the Navbar login
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/home");
  };

  if (!user) {
    // If we have verified we are not authenticated (and not just loading status), redirect
    // Assuming useAuth provides an 'loading' state, if it doesn't we might need to check token presence
    // For now, if no user and we are effectively "mounted", we should redirect.
    // However, to be safe against flicker if auth is restoring, we can check localStorage but useAuth is cleaner.

    // Check if we should redirect
    // const token = localStorage.getItem("token"); // Simple check
    // if(!token) {
    //    window.location.href = "/"; // Force redirect or use navigate
    // }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 animate-pulse"><TranslateText>正在跳转到登录页…</TranslateText></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] font-sans selection:bg-green-200 text-gray-800">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-32 max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 overflow-hidden">

          {/* Header Banner */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 h-32 relative">
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                <div className="w-full h-full rounded-full bg-green-100 flex items-center justify-center text-4xl">
                  🌱
                </div>
              </div>
            </div>
          </div>

          <div className="pt-16 pb-8 px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{user.username}</h2>
            <span className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100 uppercase tracking-wide">
              {roleLabel(user.role)}
            </span>
          </div>

          <div className="px-8 pb-8 space-y-4">
            {/* Details List */}
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors">
                <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm">
                  <Mail size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider"><TranslateText>邮箱地址</TranslateText></p>
                  <p className="text-sm font-medium text-gray-700 truncate">{user.email || "未填写"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors">
                <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm">
                  <Phone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider"><TranslateText>手机号</TranslateText></p>
                  <p className="text-sm font-medium text-gray-700">{user.mobile_number || "未填写"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-green-200 transition-colors">
                <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm">
                  <Shield size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider"><TranslateText>账号角色</TranslateText></p>
                  <p className="text-sm font-medium text-gray-700">{roleLabel(user.role || "FARMER")}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors group"
              >
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                <TranslateText>退出登录</TranslateText>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
