import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PureMultimodalInput } from '../components/ui/multimodal-ai-chat-input';
import { useAuth } from '../context/AuthContext';
import TranslateText from '../components/TranslateText';
import {
    MessageSquare, Plus, Trash2, Menu, X, Copy, Check,
    ChevronDown, Loader2, Pencil, FileText, Image
} from 'lucide-react';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API = 'http://localhost:8000/api';

// 带 401 自动刷新 token 重试的 axios 实例：
// access token 有效期 60 分钟，过期后用 refresh token 换新并重放原请求
const apiAxios = axios.create();

apiAxios.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        const refreshToken = localStorage.getItem('refresh');
        if (
            error.response?.status === 401 &&
            refreshToken &&
            original &&
            !original._retried &&
            !original.url.includes('/auth/')
        ) {
            original._retried = true;
            try {
                const r = await axios.post(`${API}/auth/refresh/`, { refresh: refreshToken });
                const newAccess = r.data.access;
                localStorage.setItem('token', newAccess);
                original.headers.Authorization = `Bearer ${newAccess}`;
                return apiAxios(original);
            } catch {
                // refresh token 也过期了，清除凭证让用户重新登录
                localStorage.removeItem('token');
                localStorage.removeItem('refresh');
            }
        }
        return Promise.reject(error);
    }
);

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Chatbot() {
    const navigate = useNavigate();
    const chatContainerRef = useRef(null);
    const { isAuthenticated, user } = useAuth();

    const [chatSessions, setChatSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [expandedSources, setExpandedSources] = useState({});
    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (!isAuthenticated) navigate('/');
    }, [isAuthenticated, navigate]);

    // Load sessions on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get(`${API}/chat/sessions/`, { headers: authHeaders() })
            .then(res => {
                setChatSessions(res.data);
                if (res.data.length > 0) loadSession(res.data[0].session_id);
            })
            .catch(() => { });
    }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const loadSession = useCallback(async (sessionId) => {
        setCurrentSessionId(sessionId);
        setMessages([]);
        setEditingMessageId(null);
        setLoadingHistory(true);
        try {
            const res = await apiAxios.get(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            // Map backend structured fields onto message objects so visual
            // indicators (image thumbnail, PDF badge) survive session reloads.
            const mapped = res.data.messages.map(msg => {
                const m = { ...msg };
                if (msg.isImageUpload) {
                    m.isImageUpload = true;
                    m.imageName = msg.imageName || '';
                    if (msg.imagePreviewUrl) {
                        // Convert relative media path to absolute URL
                        m.imagePreviewUrl = msg.imagePreviewUrl.startsWith('http')
                            ? msg.imagePreviewUrl
                            : `http://localhost:8000${msg.imagePreviewUrl}`;
                    }
                }
                if (msg.isPdfUpload) {
                    m.isPdfUpload = true;
                    m.pdfName = msg.pdfName || '';
                }
                return m;
            });
            setMessages(mapped);
        } catch {
            setMessages([]);
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    const handleNewChat = useCallback(() => {
        setCurrentSessionId(null);
        setMessages([]);
        setEditingMessageId(null);
    }, []);

    const handleSwitchChat = useCallback((sessionId) => {
        if (sessionId === currentSessionId) return;
        loadSession(sessionId);
    }, [currentSessionId, loadSession]);

    const handleDeleteChat = useCallback(async (sessionId, e) => {
        e.stopPropagation();
        try {
            await apiAxios.delete(`${API}/chat/sessions/${sessionId}/`, {
                headers: authHeaders(),
            });
            setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
            if (sessionId === currentSessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch { }
    }, [currentSessionId]);

    const handleCopyMessage = useCallback((content, messageId) => {
        navigator.clipboard.writeText(content);
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
    }, []);

    // ── Edit message ──────────────────────────────────────────────────────────
    const startEdit = useCallback((message) => {
        setEditingMessageId(message.id);
        setEditText(message.content);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditText('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editText.trim()) return;
        const msgIndex = messages.findIndex(m => m.id === editingMessageId);
        if (msgIndex === -1) return;

        // Keep only messages up to (not including) the edited one, replace with edited version
        const trimmed = messages.slice(0, msgIndex);
        const editedUserMsg = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: editText,
            timestamp: new Date().toISOString(),
        };
        setMessages([...trimmed, editedUserMsg]);
        setEditingMessageId(null);
        setEditText('');
        setIsGenerating(true);

        try {
            const res = await apiAxios.post(`${API}/chat/`, {
                question: editText,
                session_id: currentSessionId,
            }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

            const { answer, retrieved, confidence } = res.data;
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: answer,
                retrieved,
                confidence,
                timestamp: new Date().toISOString(),
            }]);
        } catch (err) {
            const expired = err.response?.status === 401;
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: expired ? '登录已过期，请退出后重新登录再试。' : '抱歉，我遇到了一些问题，请重试。',
                isError: true,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsGenerating(false);
        }
    }, [editText, editingMessageId, messages, currentSessionId]);

    // ── Send message (with PDF detection) ─────────────────────────────────────
    const handleSendMessage = useCallback(async ({ input, attachments: msgAttachments }) => {
        if (!input.trim() && msgAttachments.length === 0) return;

        // Classify attachments
        const pdfAttachments = msgAttachments.filter(a =>
            a.name?.toLowerCase().endsWith('.pdf') || a.contentType === 'application/pdf'
        );
        const imageAttachments = msgAttachments.filter(a =>
            a.contentType?.startsWith('image/')
        );
        const otherAttachments = msgAttachments.filter(a =>
            !a.name?.toLowerCase().endsWith('.pdf') &&
            a.contentType !== 'application/pdf' &&
            !a.contentType?.startsWith('image/')
        );

        // ── Case: PDF uploaded ─────────────────────────────────────────────
        if (pdfAttachments.length > 0) {
            for (const pdfAtt of pdfAttachments) {
                const userMsg = {
                    id: `msg-${Date.now()}`,
                    role: 'user',
                    content: input || `请分析并总结这份文档。`,
                    attachments: [pdfAtt],
                    isPdfUpload: true,
                    pdfName: pdfAtt.name,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, userMsg]);
                setIsGenerating(true);

                try {
                    const blobRes = await fetch(pdfAtt.url);
                    const blob = await blobRes.blob();
                    const file = new File([blob], pdfAtt.name, { type: 'application/pdf' });

                    const formData = new FormData();
                    formData.append('file', file);
                    if (input.trim()) formData.append('prompt', input.trim());
                    if (currentSessionId) formData.append('session_id', currentSessionId);

                    const res = await apiAxios.post(`${API}/chat/analyze-pdf/`, formData, {
                        headers: { ...authHeaders() },
                    });

                    const { summary, filename, pages, truncated, used_ocr, session_id, title } = res.data;

                    if (!currentSessionId) {
                        setCurrentSessionId(session_id);
                        setChatSessions(prev => [{
                            session_id, title,
                            last_message: summary.substring(0, 80),
                            updated_at: new Date().toISOString(),
                        }, ...prev]);
                    }

                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-pdf-ai`,
                        role: 'assistant',
                        content: summary,
                        confidence: 'HIGH',
                        isPdfSummary: true,
                        pdfFilename: filename,
                        pdfPages: pages,
                        pdfTruncated: truncated,
                        pdfUsedOcr: used_ocr,
                        timestamp: new Date().toISOString(),
                    }]);
                } catch (err) {
                    const errMsg = err.response?.data?.error || '无法分析 PDF，请重试。';
                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-pdf-error`,
                        role: 'assistant',
                        content: errMsg,
                        isError: true,
                        timestamp: new Date().toISOString(),
                    }]);
                } finally {
                    setIsGenerating(false);
                }
            }
            if (!input.trim() && imageAttachments.length === 0 && otherAttachments.length === 0) return;
        }

        // ── Case: Image uploaded ───────────────────────────────────────────
        if (imageAttachments.length > 0) {
            for (const imgAtt of imageAttachments) {
                const userMsg = {
                    id: `msg-${Date.now()}-img`,
                    role: 'user',
                    content: input || '分析这张图片。',
                    attachments: [imgAtt],
                    isImageUpload: true,
                    imageName: imgAtt.name,
                    imagePreviewUrl: imgAtt.url,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, userMsg]);
                setIsGenerating(true);

                try {
                    const blobRes = await fetch(imgAtt.url);
                    const blob = await blobRes.blob();
                    const file = new File([blob], imgAtt.name, { type: imgAtt.contentType || 'image/jpeg' });

                    const formData = new FormData();
                    formData.append('image', file);
                    if (input.trim()) formData.append('prompt', input.trim());
                    if (currentSessionId) formData.append('session_id', currentSessionId);

                    const res = await apiAxios.post(`${API}/chat/analyze-image/`, formData, {
                        headers: { ...authHeaders() },
                    });

                    const { summary, filename, session_id, title } = res.data;

                    if (!currentSessionId) {
                        setCurrentSessionId(session_id);
                        setChatSessions(prev => [{
                            session_id, title,
                            last_message: summary.substring(0, 80),
                            updated_at: new Date().toISOString(),
                        }, ...prev]);
                    } else {
                        setChatSessions(prev => prev.map(s =>
                            s.session_id === session_id
                                ? { ...s, last_message: summary.substring(0, 80), updated_at: new Date().toISOString() }
                                : s
                        ));
                    }

                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-img-ai`,
                        role: 'assistant',
                        content: summary,
                        confidence: 'HIGH',
                        isImageAnalysis: true,
                        imageFilename: filename,
                        timestamp: new Date().toISOString(),
                    }]);
                } catch (err) {
                    const errMsg = err.response?.data?.error || '无法分析图片，请重试。';
                    setMessages(prev => [...prev, {
                        id: `msg-${Date.now()}-img-error`,
                        role: 'assistant',
                        content: errMsg,
                        isError: true,
                        timestamp: new Date().toISOString(),
                    }]);
                } finally {
                    setIsGenerating(false);
                }
            }
            if (!input.trim() && otherAttachments.length === 0) return;
        }

        // ── Case: Normal text message ──────────────────────────────────────
        if (input.trim() || otherAttachments.length > 0) {
            const tempId = `msg-${Date.now()}`;
            setMessages(prev => [...prev, {
                id: tempId,
                role: 'user',
                content: input,
                attachments: otherAttachments,
                timestamp: new Date().toISOString(),
            }]);
            setIsGenerating(true);

            try {
                const res = await apiAxios.post(`${API}/chat/`, {
                    question: input,
                    session_id: currentSessionId,
                }, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });

                const { answer, retrieved, confidence, session_id, title } = res.data;

                if (!currentSessionId) {
                    setCurrentSessionId(session_id);
                    setChatSessions(prev => [{
                        session_id,
                        title: title || input.substring(0, 60),
                        last_message: answer.substring(0, 80),
                        updated_at: new Date().toISOString(),
                    }, ...prev]);
                } else {
                    setChatSessions(prev => prev.map(s =>
                        s.session_id === session_id
                            ? { ...s, last_message: answer.substring(0, 80), updated_at: new Date().toISOString() }
                            : s
                    ));
                }

                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-ai`,
                    role: 'assistant',
                    content: answer,
                    retrieved,
                    confidence,
                    timestamp: new Date().toISOString(),
                }]);
            } catch (err) {
                const expired = err.response?.status === 401;
                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}-error`,
                    role: 'assistant',
                    content: expired ? '登录已过期，请退出后重新登录再试。' : '抱歉，我遇到了一些问题，请重试。',
                    isError: true,
                    timestamp: new Date().toISOString(),
                }]);
            } finally {
                setIsGenerating(false);
            }
        }
    }, [currentSessionId]);

    const handleStopGenerating = useCallback(() => setIsGenerating(false), []);

    if (!isAuthenticated) return null;

    return (
        <>
            <Navbar />
            <div style={{ paddingTop: '72px', height: '100vh', backgroundColor: '#ffffc5', display: 'flex', overflow: 'hidden' }}>

                {/* ── Sidebar ── */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="w-70 bg-white border-r-2 flex flex-col"
                            style={{ borderColor: '#4ade80', height: 'calc(100vh - 72px)' }}
                        >
                            <div className="p-4 border-b-2" style={{ borderColor: '#e5e7eb' }}>
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors"
                                    style={{ backgroundColor: '#16a34a', color: 'white' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                >
                                    <Plus size={20} /> <TranslateText>新对话</TranslateText>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {chatSessions.length === 0 && (
                                    <p className="text-xs text-center mt-6" style={{ color: '#9ca3af' }}><TranslateText>暂无历史对话</TranslateText></p>
                                )}
                                {chatSessions.map(chat => (
                                    <motion.div
                                        key={chat.session_id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => handleSwitchChat(chat.session_id)}
                                        className="group relative p-3 mb-2 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            backgroundColor: chat.session_id === currentSessionId ? '#f0fdf4' : 'transparent',
                                            border: chat.session_id === currentSessionId ? '1px solid #4ade80' : '1px solid transparent',
                                        }}
                                        onMouseEnter={e => { if (chat.session_id !== currentSessionId) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                                        onMouseLeave={e => { if (chat.session_id !== currentSessionId) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <div className="flex items-start gap-2">
                                            <MessageSquare size={16} className="mt-1 flex-shrink-0" style={{ color: '#16a34a' }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate" style={{ color: '#1f2937' }}>{chat.title}</div>
                                                {chat.last_message && (
                                                    <div className="text-xs truncate mt-1" style={{ color: '#6b7280' }}>{chat.last_message}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={e => handleDeleteChat(chat.session_id, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100"
                                                style={{ color: '#dc2626' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="p-4 border-t-2" style={{ borderColor: '#e5e7eb' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#16a34a' }}>
                                        {user?.username?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="text-sm font-medium" style={{ color: '#1f2937' }}>{user?.username || '用户'}</div>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main Chat Area ── */}
                <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 72px)' }}>
                    <div className="flex items-center gap-3 p-4 bg-white border-b-2" style={{ borderColor: '#e5e7eb' }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <h2 className="text-lg font-semibold" style={{ color: '#15803d' }}>🌾 <TranslateText>智农 AI 助手</TranslateText></h2>
                    </div>

                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto"
                        style={{
                            backgroundColor: '#ffffc5',
                            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(74,222,128,0.05) 0%,transparent 50%), radial-gradient(circle at 80% 70%, rgba(22,163,74,0.05) 0%,transparent 50%)',
                        }}
                    >
                        <div className="max-w-4xl mx-auto px-4 py-6">
                            {loadingHistory && (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a' }} />
                                </div>
                            )}

                            {!loadingHistory && messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center justify-center text-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <div>
                                        <div className="text-8xl mb-6">🌱</div>
                                        <h3 className="text-2xl font-bold mb-3" style={{ color: '#15803d' }}><TranslateText>欢迎</TranslateText>, {user?.username || '农户'}!</h3>
                                        <p className="text-gray-700 max-w-md mx-auto">
                                            <TranslateText>我熟悉小麦、水稻、玉米、蔬菜、果树等中国常见作物，种植管理、病虫害防治、土壤施肥的问题都可以问我！</TranslateText>
                                            {" "}<TranslateText>你还可以</TranslateText> <strong><TranslateText>上传 PDF</TranslateText></strong> <TranslateText>获取即时摘要，或</TranslateText> <strong><TranslateText>上传作物照片</TranslateText></strong> <TranslateText>让 AI 帮你诊断病虫害。</TranslateText>
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {!loadingHistory && messages.length > 0 && (
                                <div className="space-y-6 pb-4">
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((message, index) => (
                                            <motion.div
                                                key={message.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {/* ── User message ─────────────────── */}
                                                {message.role === 'user' && (
                                                    <div className="group relative max-w-[85%] flex flex-col items-end gap-1">
                                                        {/* Edit mode */}
                                                        {editingMessageId === message.id ? (
                                                            <div className="w-full" style={{ minWidth: '320px' }}>
                                                                <textarea
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    className="w-full rounded-2xl px-4 py-3 text-sm resize-none border-2 focus:outline-none"
                                                                    style={{ borderColor: '#16a34a', minHeight: '80px', color: '#1f2937' }}
                                                                    autoFocus
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                                                        if (e.key === 'Escape') cancelEdit();
                                                                    }}
                                                                />
                                                                <div className="flex gap-2 mt-1 justify-end">
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        className="text-xs px-3 py-1 rounded-lg border"
                                                                        style={{ borderColor: '#d1d5db', color: '#6b7280' }}
                                                                    ><TranslateText>取消</TranslateText></button>
                                                                    <button
                                                                        onClick={saveEdit}
                                                                        className="text-xs px-3 py-1 rounded-lg text-white"
                                                                        style={{ backgroundColor: '#16a34a' }}
                                                                    ><TranslateText>保存并重发</TranslateText></button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    className="rounded-3xl px-5 py-3 shadow-md"
                                                                    style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                                                                >
                                                                    {/* PDF badge */}
                                                                    {message.isPdfUpload && (
                                                                        <div className="flex items-center gap-1 mb-2 text-xs opacity-80">
                                                                            <FileText size={12} /> {message.pdfName}
                                                                        </div>
                                                                    )}
                                                                    {/* Image badge */}
                                                                    {message.isImageUpload && (
                                                                        <div className="flex items-center gap-1 mb-2 text-xs opacity-80">
                                                                            <Image size={12} /> {message.imageName}
                                                                        </div>
                                                                    )}
                                                                    {/* Image thumbnail */}
                                                                    {message.isImageUpload && message.imagePreviewUrl && (
                                                                        <img
                                                                            src={message.imagePreviewUrl}
                                                                            alt={message.imageName}
                                                                            className="rounded-lg mb-2 max-w-[200px] max-h-[150px] object-cover border border-white/30"
                                                                        />
                                                                    )}
                                                                    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                                        {message.content}
                                                                    </div>
                                                                    <div className="text-xs opacity-60 mt-1">
                                                                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                                {/* Edit button — only for non-PDF messages */}
                                                                {!message.isPdfUpload && (
                                                                    <button
                                                                        onClick={() => startEdit(message)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                                                                        title="编辑消息"
                                                                        style={{ color: '#6b7280' }}
                                                                    >
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ── Assistant message ────────────── */}
                                                {message.role === 'assistant' && (
                                                    <div
                                                        className={`group relative max-w-[85%] rounded-2xl px-5 py-4 shadow-lg`}
                                                        style={{
                                                            backgroundColor: message.isError ? '#fee2e2' : '#ffffff',
                                                            color: '#1f2937',
                                                            border: !message.isError ? '1px solid #e5e7eb' : 'none',
                                                        }}
                                                    >
                                                        {/* Header: name + confidence */}
                                                        {!message.isError && (
                                                            <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: '#f3f4f6' }}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                                                                        {message.isPdfSummary
                                                                            ? <FileText size={14} style={{ color: '#16a34a' }} />
                                                                            : message.isImageAnalysis
                                                                                ? <Image size={14} style={{ color: '#16a34a' }} />
                                                                                : <span className="text-sm">🤖</span>}
                                                                    </div>
                                                                    <span className="font-semibold text-sm" style={{ color: '#15803d' }}>
                                                                        {message.isPdfSummary ? 'PDF 摘要'
                                                                            : message.isImageAnalysis ? '📷 图像分析'
                                                                                : '智农 AI'}
                                                                    </span>
                                                                    {message.isPdfSummary && (
                                                                        <span className="text-xs" style={{ color: '#6b7280' }}>
                                                                            · {message.pdfFilename} ({message.pdfPages} 页{message.pdfTruncated ? '，已截断' : ''})
                                                                        </span>
                                                                    )}
                                                                    {message.isImageAnalysis && (
                                                                        <span className="text-xs" style={{ color: '#6b7280' }}>
                                                                            · {message.imageFilename}
                                                                        </span>
                                                                    )}
                                                                    {message.pdfUsedOcr && (
                                                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                                                                            🔍 OCR
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Message text */}
                                                        <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                                                            {message.content}
                                                        </div>

                                                        {/* Sources panel removed by user request (only keeping confidence badge) */}

                                                        {/* Timestamp + copy */}
                                                        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                            <div className="text-xs opacity-60">
                                                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            {!message.isError && (
                                                                <button
                                                                    onClick={() => handleCopyMessage(message.content, message.id)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-100"
                                                                    title="复制消息"
                                                                >
                                                                    {copiedMessageId === message.id
                                                                        ? <Check size={14} style={{ color: 'white' }} />
                                                                        : <Copy size={14} style={{ color: 'white' }} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {isGenerating && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                            <div className="rounded-2xl px-5 py-4 shadow-lg bg-white">
                                                <div className="flex gap-2">
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '0ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '150ms' }} />
                                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#16a34a', animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="bg-white border-t-2 p-4" style={{ borderColor: '#e5e7eb' }}>
                        <div className="max-w-4xl mx-auto">
                            <PureMultimodalInput
                                chatId={currentSessionId || 'new'}
                                messages={messages}
                                attachments={attachments}
                                setAttachments={setAttachments}
                                onSendMessage={handleSendMessage}
                                onStopGenerating={handleStopGenerating}
                                isGenerating={isGenerating}
                                canSend={!isGenerating}
                                selectedVisibilityType="private"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
