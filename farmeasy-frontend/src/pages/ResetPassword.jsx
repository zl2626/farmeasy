import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { publicRequest } from "../services/api";
import TranslateText from "../components/TranslateText";
import { Lock, ArrowRight, Loader, AlertCircle } from "lucide-react";
import { Snackbar, Alert } from "@mui/material";

function ResetPassword({ onBackToLogin }) {
  const navigate = useNavigate();
  const { uid, token } = useParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    try {
      const { ok, data } = await publicRequest("/auth/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          token,
          new_password: password,
        }),
      });

      if (ok) {
        setSnackbar({ open: true, message: "密码重置成功，现在可以登录了。", severity: "success" });
        setPassword("");
        setConfirm("");

        setTimeout(() => {
          if (typeof onBackToLogin === "function") {
            onBackToLogin();
          } else {
            navigate("/login");
          }
        }, 2000);
      } else {
        setError(data.error || data.detail || "重置链接无效或已过期");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-2">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 font-poppins">
          <TranslateText>重置密码</TranslateText>
        </h1>
        <p className="text-gray-500 text-sm">
          <TranslateText>在下方输入您的新密码</TranslateText>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              type="password"
              placeholder="新密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-1">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
            </div>
            <input
              type="password"
              placeholder="确认密码"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-medium"
              required
              autoComplete="new-password"
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
          className="auth-submit relative w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
        >
          {loading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <ArrowRight className="w-5 h-5 absolute left-4" color="#ffffff" />
              <span style={{ color: "#ffffff" }}><TranslateText>重置密码</TranslateText></span>
            </>
          )}
        </button>
      </form>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', borderRadius: '12px', fontWeight: 500 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default ResetPassword;

