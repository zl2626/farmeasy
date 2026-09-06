import { useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import { User, Mail, Lock, Phone, ArrowRight, Loader } from "lucide-react";
import { Snackbar, Alert } from "@mui/material";

function Register({ onBackToLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    mobile_number: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
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
        setErrors({ detail: "服务器响应异常，请确认后端服务已启动。" });
        return;
      }

      if (response.ok) {
        setSnackbar({ open: true, message: "注册成功！", severity: "success" });
        setTimeout(() => {
          onBackToLogin();
        }, 1500);
      } else {
        setErrors(data);
      }
    } catch (err) {
      console.error("Network error:", err);
      setErrors({ detail: "无法连接服务器，请确认后端服务已启动（127.0.0.1:8000）。" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-2">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 font-poppins">
          <TranslateText>创建账号</TranslateText>
        </h1>
        <p className="text-gray-500 text-sm">
          <TranslateText>今天加入 智农 农户社区</TranslateText>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              name="username"
              placeholder="用户名"
              value={formData.username}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
            />
          </div>
          {errors.username && <p className="text-red-500 text-xs pl-1">{errors.username[0]}</p>}
        </div>

        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              type="email"
              name="email"
              placeholder="邮箱"
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs pl-1">{errors.email[0]}</p>}
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
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
            />
          </div>
          {errors.password && <p className="text-red-500 text-xs pl-1">{errors.password[0]}</p>}
        </div>

        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              name="mobile_number"
              placeholder="手机号"
              value={formData.mobile_number}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
            />
          </div>
          {errors.mobile_number && <p className="text-red-500 text-xs pl-1">{errors.mobile_number[0]}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="relative w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <ArrowRight className="w-5 h-5 absolute left-4" />
              <span><TranslateText>注册</TranslateText></span>

            </>
          )}
        </button>
      </form>

      <div className="mt-5 pt-3 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          <TranslateText>已有账号？</TranslateText>{" "}
          <span
            onClick={onBackToLogin}
            className="text-green-600 hover:text-green-700 font-bold cursor-pointer transition-colors ml-1"
          >
            <TranslateText>登录</TranslateText>
          </span>
        </p>
      </div>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '12px', fontWeight: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Register;
