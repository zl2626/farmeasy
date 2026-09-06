import { useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import { Mail, ArrowRight, Loader, AlertCircle } from "lucide-react";
import { Snackbar, Alert } from "@mui/material";

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const text = await response.text();
      let data = {};

      try {
        data = JSON.parse(text);
      } catch {
        setError("服务器错误，请稍后再试。");
        setLoading(false);
        return;
      }

      if (response.ok) {
        setSnackbar({ open: true, message: "重置链接已发送到您的邮箱。", severity: "success" });
        setEmail("");
      } else {
        setError(data.error || "出错了，请稍后再试。");
      }
    } catch (err) {
      console.error(err);
      setError("网络错误，请重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-2">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 font-poppins">
          <TranslateText>忘记密码？</TranslateText>
        </h1>
        <p className="text-gray-500 text-sm">
          <TranslateText>输入您的邮箱以接收重置链接</TranslateText>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
              autoComplete="email"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <ArrowRight className="w-5 h-5 absolute left-4 " />
              <span><TranslateText>发送链接</TranslateText></span>

            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center pt-4 border-t border-gray-100">
        <span
          onClick={onBackToLogin}
          className="text-sm text-green-600 hover:text-green-700 font-bold cursor-pointer transition-colors"
        >
          <TranslateText>返回登录</TranslateText>
        </span>
      </div>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '12px', fontWeight: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default ForgotPassword;
