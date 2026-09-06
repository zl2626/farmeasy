import { useEffect, useState } from "react";
import { api, mediaUrl } from "../services/api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react";
import TranslateText from "../components/TranslateText";

function MyDoubts() {
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            // behave like profile/chatbot: send user to home, navbar will handle login modal
            navigate("/");
            return;
        }

        api.get("/education/doubts/my/")
            .then((data) => {
                setDoubts(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError("加载疑问列表失败，请重试。");
                setLoading(false);
            });
    }, [isAuthenticated, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fcfcfc]">
                <Navbar />
                <div className="flex items-center justify-center h-screen pt-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] font-sans selection:bg-green-200 text-gray-800">
            <Navbar />

            <main className="container mx-auto px-4 py-8 pt-32 max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        📋 <TranslateText>我的疑问</TranslateText>
                    </h2>
                    <button
                        onClick={() => navigate("/create/doubts")}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-600/20 text-sm font-medium"
                    >
                        + <TranslateText>提交疑问</TranslateText>
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-center">
                        {error}
                    </div>
                )}

                {doubts.length === 0 && !error ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2"><TranslateText>暂无疑问</TranslateText></h3>
                        <p className="text-gray-500 mb-6"><TranslateText>您还没有提交过任何问题。</TranslateText></p>
                        <button
                            onClick={() => navigate("/create/doubts")}
                            className="px-6 py-2.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 transition font-medium"
                        >
                            <TranslateText>咨询专家</TranslateText>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {doubts.map((doubt) => (
                            <div key={doubt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <h3 className="text-xl font-bold text-gray-800 leading-tight">{doubt.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${doubt.status === 'Answered'
                                                ? 'bg-green-50 text-green-700 border-green-100'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                            }`}>
                                            {doubt.status === "Answered" ? "已回复" : doubt.status === "Open" ? "待回复" : doubt.status || "待回复"}
                                        </span>
                                    </div>

                                    <p className="text-gray-600 mb-4 leading-relaxed">{doubt.description}</p>

                                    {doubt.image && (
                                        <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 w-full max-w-md">
                                            <img
                                                src={mediaUrl(doubt.image)}
                                                alt="doubt"
                                                className="w-full h-auto object-cover max-h-64"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-50 pt-4 mt-2">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {doubt.created_at ? new Date(doubt.created_at).toLocaleDateString("zh-CN") : "日期未知"}
                                        </span>
                                    </div>

                                    {doubt.reply && (
                                        <div className="mt-6 bg-green-50/50 rounded-xl p-5 border border-green-100">
                                            <div className="flex items-center gap-2 mb-2 text-green-800 font-semibold text-sm">
                                                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-green-700 text-xs">✓</div>
                                                <TranslateText>专家回复</TranslateText>
                                            </div>
                                            <p className="text-gray-700 leading-relaxed text-sm">
                                                {doubt.reply}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default MyDoubts;
