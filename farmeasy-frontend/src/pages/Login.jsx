import { useNavigate } from "react-router-dom";
import { useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import { useAuth } from "../context/AuthContext";
import { User, Lock, ArrowRight, Loader } from "lucide-react";
import { Snackbar, Alert } from "@mui/material";

function Login({ OnRegisterClick, onForgotClick, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const { login } = useAuth();

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const text = await response.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Server returned HTML:", text);
        setErrors({ detail: "服务器错误，请重试。" });
        setLoading(false);
        return;
      }

      if (response.ok) {
        const accessToken = data.access;
        const refreshToken = data.refresh;

        const profileResp = await fetch(`${API_BASE_URL}/education/profile/`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });

        if (profileResp.ok) {
          const userData = await profileResp.json();
          login(userData, accessToken);
          localStorage.setItem("refresh", refreshToken);
          setSnackbar({ open: true, message: "登录成功！", severity: "success" });

          setTimeout(() => {
            if (onLoginSuccess) onLoginSuccess();

            // Redirect admin to admin dashboard, regular users to home
            if (userData.is_staff) {
              navigate("/admin-dashboard");
            } else {
              navigate("/home");
            }
            setFormData({ username: "", password: "" });
          }, 1500);
        } else {
          setErrors({ detail: "加载用户信息失败。" });
        }

      } else {
        setErrors(data);
      }
    } catch (err) {
      console.error("Network error:", err);
      setErrors({ detail: "网络错误，请检查您的网络连接。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-2">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 font-poppins">
          <TranslateText>欢迎回来</TranslateText>
        </h1>
        <p className="text-gray-500 text-sm">
          <TranslateText>登录以继续使用 智农</TranslateText>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              type="text"
              name="username"
              placeholder="用户名"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
            />
          </div>
          {errors.username && <p className="text-red-500 text-xs pl-1">{errors.username[0]}</p>}
        </div>

        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              type="password"
              name="password"
              placeholder="密码"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
            />
          </div>
          {errors.password && <p className="text-red-500 text-xs pl-1">{errors.password[0]}</p>}
        </div>

        {errors.detail && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-red-600 text-sm text-center">{errors.detail}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="relative w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {/* Left Arrow */}
              <ArrowRight className="w-5 h-5 absolute left-4" />

              {/* Centered Text */}
              <span className="mx-auto">
                <TranslateText>登录</TranslateText>
              </span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center space-y-3">
        <p
          onClick={onForgotClick}
          className="text-sm text-green-600 hover:text-green-700 cursor-pointer transition-colors font-medium"
        >
          <TranslateText>忘记密码？</TranslateText>
        </p>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            <TranslateText>还没有账号？</TranslateText>{" "}
            <span
              onClick={OnRegisterClick}
              className="text-green-600 hover:text-green-700 font-bold cursor-pointer transition-colors ml-1"
            >
              <TranslateText>注册</TranslateText>
            </span>
          </p>
        </div>
      </div>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '12px', fontWeight: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Login;
