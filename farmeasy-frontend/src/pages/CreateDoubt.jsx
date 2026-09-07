import { useState, useEffect } from "react";
import API_BASE_URL from "../services/api";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import TranslateText from "../components/TranslateText";

function CreateDoubt() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            // stay consistent with profile/chatbot: send to home, navbar will handle login
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setImage(null);
            setPreview(null);
        }
    };

    const removeImage = () => {
        setImage(null);
        setPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        const token = localStorage.getItem("token");

        if (!token) {
            setError("请先登录。");
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        if (image) formData.append("image", image);

        try {
            const response = await fetch(
                `${API_BASE_URL}/education/doubts/create/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (response.ok) {
                setMessage("疑问提交成功！");
                setTitle("");
                setDescription("");
                setImage(null);
                setPreview(null);
                // Optional: navigate to My Doubts after delay
                setTimeout(() => navigate("/doubts"), 1500);
            } else {
                if (response.status === 401) {
                    setError("登录已过期，请重新登录。");
                } else {
                    setError(data.detail || "出错了，请稍后再试。");
                }
            }
        } catch (err) {
            console.error(err);
            setError("网络错误，请检查您的网络连接。");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#fcfcfc] font-sans selection:bg-green-200 text-gray-800">
            <Navbar />

            <div className="container mx-auto px-4 py-8 pt-28 max-w-2xl">
                <div className="bg-white rounded-2xl shadow-xl shadow-green-900/5 border border-green-50 overflow-hidden">
                    <div className="p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                            🧑‍🌾 <TranslateText>提交疑问</TranslateText>
                        </h2>
                        <p className="text-gray-500 mb-6 text-sm">
                            <TranslateText>描述您遇到的种植问题，我们的专家会帮您解答。</TranslateText>
                        </p>

                        {message && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl flex items-center gap-2">
                                <CheckCircle size={20} />
                                <span>{message}</span>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-2">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <TranslateText>标题</TranslateText>
                                </label>
                                <input
                                    type="text"
                                    placeholder="例如：番茄叶片发黄是怎么回事"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <TranslateText>问题描述</TranslateText>
                                </label>
                                <textarea
                                    placeholder="请补充更多关于问题的细节…"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    rows="5"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <TranslateText>上传图片（可选）</TranslateText>
                                </label>

                                {!preview ? (
                                    <label htmlFor="file-upload" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-400 hover:bg-green-50 transition-colors cursor-pointer relative block w-full">
                                        <div className="space-y-1 text-center">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <span className="relative cursor-pointer rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none">
                                                    <TranslateText>选择文件</TranslateText>
                                                </span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageChange} accept="image/*" />
                                                <p className="pl-1"><TranslateText>或拖拽到此处</TranslateText></p>
                                            </div>
                                            <p className="text-xs text-gray-500"><TranslateText>支持 PNG、JPG、GIF，最大 5MB</TranslateText></p>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-200 group">
                                        <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={removeImage}
                                                className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 px-4 rounded-xl font-semibold text-white shadow-lg shadow-green-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed ${loading ? 'bg-gray-400' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-green-600/30'}`}
                            >
                                {loading ? <TranslateText>提交中…</TranslateText> : <TranslateText>提交疑问</TranslateText>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateDoubt;
