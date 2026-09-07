import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import Navbar from "../components/Navbar.jsx";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import {
    Users, MessageSquare, Leaf, Wheat, LogOut, Send, CheckCircle,
    Clock, Shield, Search, Mail, Phone, User, Calendar,
    Trash2, Plus, X, Edit3, Save, ChevronDown, ChevronUp,
    BookOpen, FileText,
} from "lucide-react";

/* ─────────────────────────── helper ─────────────────────────── */
const tok = () => localStorage.getItem("token");

const authFetch = (url, opts = {}) =>
    fetch(url, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tok()}`,
            ...(opts.headers || {}),
        },
    });

/* ─────────────────────────── component ─────────────────────────── */
export default function AdminDashboard() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState("queries");
    const [doubts, setDoubts] = useState([]);
    const [users, setUsers] = useState([]);
    const [crops, setCrops] = useState([]);
    const [schemes, setSchemes] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [replies, setReplies] = useState({});
    const [submitting, setSubmitting] = useState({});
    const [toast, setToast] = useState(null);

    // Modal state
    const [cropModal, setCropModal] = useState(null); // null | 'add' | crop-obj
    const [schemeModal, setSchemeModal] = useState(null);

    // Collapse query cards
    const [expanded, setExpanded] = useState({});

    /* ── Auth guard (waits for user to hydrate from localStorage) ── */
    useEffect(() => {
        if (isAuthenticated === false) { navigate("/"); return; }
        if (user !== null && !user?.is_staff) { navigate("/home"); }
    }, [isAuthenticated, user, navigate]);

    /* ── Fetch all data ── */
    const fetchAll = useCallback(async () => {
        if (!tok()) return;
        setLoading(true);
        try {
            // Admin doubts & users require the admin endpoints (is_staff check)
            // Crops & schemes use the existing public endpoints which are guaranteed to work
            const [dR, uR, cR, sR, fR] = await Promise.all([
                authFetch(`${API_BASE_URL}/education/admin/doubts/`),
                authFetch(`${API_BASE_URL}/education/admin/users/`),
                fetch(`${API_BASE_URL}/education/crops/`),
                fetch(`${API_BASE_URL}/education/agri-schemes/`),
                authFetch(`${API_BASE_URL}/education/admin/feedbacks/`),
            ]);

            if (dR.ok) {
                setDoubts(await dR.json());
            } else {
                console.error("admin/doubts failed:", dR.status, await dR.text());
            }
            if (uR.ok) {
                setUsers(await uR.json());
            } else {
                console.error("admin/users failed:", uR.status, await uR.text());
            }
            if (cR.ok) {
                setCrops(await cR.json());
            } else {
                console.error("crops fetch failed:", cR.status, await cR.text());
            }
            if (sR.ok) {
                setSchemes(await sR.json());
            } else {
                console.error("agri-schemes fetch failed:", sR.status, await sR.text());
            }
            if (fR.ok) {
                setFeedbacks(await fR.json());
            } else {
                console.error("admin/feedbacks fetch failed:", fR.status, await fR.text());
            }
        } catch (e) {
            console.error("fetchAll error:", e);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        if (user?.is_staff) fetchAll();
    }, [user, fetchAll]);

    /* ── Toast ── */
    const toast$ = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    /* ── Reply to doubt ── */
    const handleReply = async (doubtId) => {
        const reply = replies[doubtId]?.trim();
        if (!reply) return;
        setSubmitting(s => ({ ...s, [doubtId]: true }));
        const res = await authFetch(`${API_BASE_URL}/education/doubts/reply/${doubtId}/`, {
            method: "PATCH",
            body: JSON.stringify({ reply }),
        });
        if (res.ok) {
            setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, reply, status: "Answered" } : d));
            setReplies(r => ({ ...r, [doubtId]: "" }));
            toast$("回复已发送！");
        } else {
            toast$("回复发送失败。", "error");
        }
        setSubmitting(s => ({ ...s, [doubtId]: false }));
    };

    /* ── Delete helpers ── */
    const deleteDoubt = async (id) => {
        if (!confirm("确定删除该提问吗？")) return;
        const res = await authFetch(`${API_BASE_URL}/education/admin/doubts/${id}/`, { method: "DELETE" });
        if (res.ok) { setDoubts(p => p.filter(d => d.id !== id)); toast$("提问已删除。"); }
        else toast$("删除失败。", "error");
    };

    const deleteUser = async (id) => {
        if (!confirm("确定删除该用户吗？")) return;
        const res = await authFetch(`${API_BASE_URL}/education/admin/users/${id}/`, { method: "DELETE" });
        if (res.ok) { setUsers(p => p.filter(u => u.id !== id)); toast$("用户已删除。"); }
        else { const e = await res.json(); toast$(e.error || "删除失败。", "error"); }
    };

    const deleteCrop = async (id) => {
        if (!confirm("确定删除该作物吗？")) return;
        const res = await authFetch(`${API_BASE_URL}/education/admin/crops/${id}/`, { method: "DELETE" });
        if (res.ok) { setCrops(p => p.filter(c => c.id !== id)); toast$("作物已删除。"); }
        else toast$("删除失败。", "error");
    };

    const deleteScheme = async (id) => {
        if (!confirm("确定删除该政策吗？")) return;
        const res = await authFetch(`${API_BASE_URL}/education/admin/schemes/${id}/`, { method: "DELETE" });
        if (res.ok) { setSchemes(p => p.filter(s => s.id !== id)); toast$("政策已删除。"); }
        else toast$("删除失败。", "error");
    };

    const deleteFeedback = async (id) => {
        if (!confirm("确定删除该反馈吗？")) return;
        const res = await authFetch(`${API_BASE_URL}/education/admin/feedbacks/${id}/`, { method: "DELETE" });
        if (res.ok) { setFeedbacks(p => p.filter(f => f.id !== id)); toast$("反馈已删除。"); }
        else toast$("删除失败。", "error");
    };

    /* ── Save Crop (add or update) ── */
    const saveCrop = async (formData) => {
        const isEdit = formData.id;
        const url = isEdit
            ? `${API_BASE_URL}/education/admin/crops/${formData.id}/`
            : `${API_BASE_URL}/education/admin/crops/`;
        const method = isEdit ? "PUT" : "POST";

        // Parse JSON fields
        let payload;
        try {
            payload = {
                ...formData,
                soil: typeof formData.soil === "string" ? JSON.parse(formData.soil || "[]") : formData.soil,
                steps: typeof formData.steps === "string" ? JSON.parse(formData.steps || "[]") : formData.steps,
                common_mistakes: typeof formData.common_mistakes === "string" ? JSON.parse(formData.common_mistakes || "[]") : formData.common_mistakes,
            };
        } catch {
            toast$("soil / steps / common_mistakes 必须是合法的 JSON 数组。", "error");
            return;
        }

        const res = await authFetch(url, { method, body: JSON.stringify(payload) });
        if (res.ok) {
            const saved = await res.json();
            if (isEdit) setCrops(p => p.map(c => c.id === saved.id ? saved : c));
            else setCrops(p => [...p, saved]);
            setCropModal(null);
            toast$(isEdit ? "作物已更新！" : "作物已添加！");
        } else {
            const e = await res.json();
            toast$(JSON.stringify(e), "error");
        }
    };

    /* ── Save Scheme (add or update) ── */
    const saveScheme = async (formData) => {
        const isEdit = formData.id;
        const url = isEdit
            ? `${API_BASE_URL}/education/admin/schemes/${formData.id}/`
            : `${API_BASE_URL}/education/admin/schemes/`;
        const method = isEdit ? "PUT" : "POST";

        const res = await authFetch(url, { method, body: JSON.stringify(formData) });
        if (res.ok) {
            const saved = await res.json();
            if (isEdit) setSchemes(p => p.map(s => s.id === saved.id ? saved : s));
            else setSchemes(p => [...p, saved]);
            setSchemeModal(null);
            toast$(isEdit ? "政策已更新！" : "政策已添加！");
        } else {
            const e = await res.json();
            toast$(JSON.stringify(e), "error");
        }
    };

    const handleLogout = () => { logout(); navigate("/home"); };

    /* ── Derived / filtered ── */
    const q = search.toLowerCase();
    const fDoubts = doubts.filter(d => d.title?.toLowerCase().includes(q) || d.farmer?.username?.toLowerCase().includes(q));
    const fUsers = users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    const fCrops = crops.filter(c => c.name?.toLowerCase().includes(q));
    const fSchemes = schemes.filter(s => s.name?.toLowerCase().includes(q));
    const fFeedbacks = feedbacks.filter(f => f.subject?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q));

    const pending = doubts.filter(d => d.status === "Open").length;
    const answered = doubts.filter(d => d.status === "Answered").length;

    const TABS = [
        { id: "queries", icon: <MessageSquare size={18} />, label: "提问管理", chip: pending },
        { id: "users", icon: <Users size={18} />, label: "用户", chip: users.length },
        { id: "crops", icon: <Wheat size={18} />, label: "作物", chip: crops.length },
        { id: "schemes", icon: <BookOpen size={18} />, label: "政策", chip: schemes.length },
        { id: "feedback", icon: <Mail size={18} />, label: "反馈", chip: feedbacks.length },
    ];
    // Note: tab labels are used as both display text and identifiers; translate via TranslateText in JSX

    /* ─────────────────────── render ─────────────────────── */
    return (

        <div className="ad-root">
            <Navbar />
            {/* Toast */}
            {toast && <div className={`ad-toast${toast.type === "error" ? " ad-toast--err" : ""}`}>{toast.msg}</div>}

            {/* Crop Modal */}
            {cropModal !== null && (
                <CropModal
                    initial={cropModal === "add" ? null : cropModal}
                    onSave={saveCrop}
                    onClose={() => setCropModal(null)}
                />
            )}

            {/* Scheme Modal */}
            {schemeModal !== null && (
                <SchemeModal
                    initial={schemeModal === "add" ? null : schemeModal}
                    onSave={saveScheme}
                    onClose={() => setSchemeModal(null)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className="ad-sidebar">
                <div className="ad-logo">
                    <div className="ad-logo-icon"><Leaf size={20} /></div>
                    <span className="ad-logo-text">智农</span>
                    <span className="ad-badge">管理员</span>
                </div>

                <nav className="ad-nav">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`ad-nav-btn${tab === t.id ? " active" : ""}`}
                            onClick={() => { setTab(t.id); setSearch(""); }}
                        >
                            {t.icon}
                            <span><TranslateText>{t.label}</TranslateText></span>
                            {t.chip > 0 && <span className={`ad-chip${t.id === "queries" && pending > 0 ? " ad-chip--amber" : ""}`}>{t.chip}</span>}
                        </button>
                    ))}
                </nav>

                <div className="ad-sidebar-foot">
                    <div className="ad-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                    <div className="ad-foot-info">
                        <p className="ad-foot-name">{user?.username}</p>
                        <p className="ad-foot-role"><TranslateText>管理员</TranslateText></p>
                    </div>
                    <button className="ad-logout" onClick={handleLogout} title="退出登录"><LogOut size={15} /></button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="ad-main">
                {/* Header */}
                <header className="ad-header">
                    <div>
                        <h1 className="ad-h1">{TABS.find(t => t.id === tab)?.label}</h1>
                        <p className="ad-sub">
                            {tab === "queries" && `待回复 ${pending} 条 · 已回复 ${answered} 条`}
                            {tab === "users" && `已注册用户 ${users.length} 名`}
                            {tab === "crops" && `数据库中共有 ${crops.length} 种作物`}
                            {tab === "schemes" && `数据库中共有 ${schemes.length} 项政策`}
                            {tab === "feedback" && `共收到 ${feedbacks.length} 条反馈`}
                        </p>
                    </div>
                    <div className="ad-header-right">
                        <div className="ad-search-wrap">
                            <Search size={15} className="ad-search-ic" />
                            <input className="ad-search" placeholder="搜索…" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        {(tab === "crops" || tab === "schemes") && (
                            <button
                                className="ad-add-btn"
                                onClick={() => tab === "crops" ? setCropModal("add") : setSchemeModal("add")}
                            >
                                <Plus size={16} /> <TranslateText>{tab === "crops" ? "新增作物" : "新增政策"}</TranslateText>
                            </button>
                        )}
                    </div>
                </header>

                {/* Stats row (queries) */}
                {tab === "queries" && (
                    <div className="ad-stats">
                        {[
                            { label: "已回复", val: answered, color: "--green", icon: <CheckCircle size={20} /> },
                            { label: "待回复", val: pending, color: "--amber", icon: <Clock size={20} /> },
                            { label: "总计", val: doubts.length, color: "--blue", icon: <MessageSquare size={20} /> },
                        ].map(s => (
                            <div key={s.label} className={`ad-stat ad-stat${s.color}`}>
                                {s.icon}
                                <div><p className="ad-stat-num">{s.val}</p><p className="ad-stat-lbl"><TranslateText>{s.label}</TranslateText></p></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="ad-loading"><div className="ad-spin" /><p><TranslateText>加载中…</TranslateText></p></div>
                ) : (
                    <>
                        {/* ── QUERIES TAB ── */}
                        {tab === "queries" && (
                            <div className="ad-cards">
                                {fDoubts.length === 0
                                    ? <Empty icon={<MessageSquare size={40} />} text="暂无提问" />
                                    : fDoubts.map(d => {
                                        const open = expanded[d.id];
                                        return (
                                            <div key={d.id} className={`ad-card${d.status === "Answered" ? " ad-card--ans" : " ad-card--pend"}`}>
                                                <div className="ad-card-row">
                                                    <span className={`ad-pill${d.status === "Answered" ? " pill--green" : " pill--amber"}`}>
                                                        {d.status === "Answered" ? <CheckCircle size={12} /> : <Clock size={12} />} {d.status === "Answered" ? "已回复" : d.status === "Open" ? "待回复" : d.status}
                                                    </span>
                                                    <span className="ad-meta"><User size={12} />{d.farmer?.username}</span>
                                                    <span className="ad-meta"><Calendar size={12} />{new Date(d.created_at).toLocaleDateString("zh-CN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                                                        <button className="ad-icon-btn ad-icon-btn--expand" onClick={() => setExpanded(e => ({ ...e, [d.id]: !e[d.id] }))}>
                                                            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        </button>
                                                        <button className="ad-icon-btn ad-icon-btn--del" onClick={() => deleteDoubt(d.id)} title="删除"><Trash2 size={15} /></button>
                                                    </div>
                                                </div>
                                                <h3 className="ad-card-title">{d.title}</h3>
                                                {open && (
                                                    <>
                                                        <p className="ad-card-desc">{d.description}</p>
                                                        {d.image && <img src={d.image} alt="doubt" className="ad-card-img" />}
                                                        {d.reply ? (
                                                            <div className="ad-reply-sent">
                                                                <div className="ad-reply-label"><Shield size={13} /> 管理员回复</div>
                                                                <p>{d.reply}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="ad-reply-area">
                                                                <textarea
                                                                    className="ad-ta"
                                                                    placeholder="写下您的回复…"
                                                                    rows={3}
                                                                    value={replies[d.id] || ""}
                                                                    onChange={e => setReplies(r => ({ ...r, [d.id]: e.target.value }))}
                                                                />
                                                                <button
                                                                    className="ad-send-btn"
                                                                    disabled={!replies[d.id]?.trim() || submitting[d.id]}
                                                                    onClick={() => handleReply(d.id)}
                                                                >
                                                                    {submitting[d.id] ? <span className="ad-spin-sm" /> : <Send size={14} />}
                                                                    <TranslateText>发送回复</TranslateText>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}

                        {/* ── USERS TAB ── */}
                        {tab === "users" && (
                            <div className="ad-table-wrap">
                                {fUsers.length === 0
                                    ? <Empty icon={<Users size={40} />} text="暂无用户" />
                                    : (
                                        <table className="ad-table">
                                            <thead><tr>
                                                <th>#</th><th><TranslateText>用户</TranslateText></th><th><TranslateText>邮箱</TranslateText></th><th><TranslateText>手机号</TranslateText></th>
                                                <th><TranslateText>角色</TranslateText></th><th><TranslateText>注册时间</TranslateText></th><th><TranslateText>最近登录</TranslateText></th><th><TranslateText>操作</TranslateText></th>
                                            </tr></thead>
                                            <tbody>
                                                {fUsers.map((u, i) => (
                                                    <tr key={u.id} className={u.is_staff ? "ad-row--staff" : ""}>
                                                        <td className="ad-num">{i + 1}</td>
                                                        <td>
                                                            <div className="ad-user-cell">
                                                                <div className="ad-av-sm">{u.username[0].toUpperCase()}</div>
                                                                <span>{u.username}</span>
                                                                {u.is_staff && <span className="ad-admin-tag"><Shield size={10} /> 管理员</span>}
                                                            </div>
                                                        </td>
                                                        <td><span className="ad-email"><Mail size={12} />{u.email || "—"}</span></td>
                                                        <td><span className="ad-email"><Phone size={12} />{u.mobile_number || "—"}</span></td>
                                                        <td>
                                                            <span className={`ad-pill${u.role === "EXPERT" ? " pill--blue" : " pill--grey"}`}>{u.role === "EXPERT" ? "专家" : u.role === "FARMER" ? "农户" : u.role}</span>
                                                        </td>
                                                        <td className="ad-date">{new Date(u.date_joined).toLocaleDateString("zh-CN", { day: "numeric", month: "short", year: "numeric" })}</td>
                                                        <td className="ad-date">{u.last_login ? new Date(u.last_login).toLocaleDateString("zh-CN", { day: "numeric", month: "short", year: "numeric" }) : "从未登录"}</td>
                                                        <td>
                                                            {!u.is_staff && (
                                                                <button className="ad-icon-btn ad-icon-btn--del" onClick={() => deleteUser(u.id)} title="删除用户"><Trash2 size={14} /></button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                            </div>
                        )}

                        {/* ── CROPS TAB ── */}
                        {tab === "crops" && (
                            <div className="ad-grid">
                                {fCrops.length === 0
                                    ? <Empty icon={<Wheat size={40} />} text="暂无作物" />
                                    : fCrops.map(c => (
                                        <div key={c.id} className="ad-grid-card">
                                            {c.image && <img src={c.image.startsWith("http") ? c.image : `http://127.0.0.1:8000${c.image}`} alt={c.name} className="ad-grid-img" />}
                                            <div className="ad-grid-body">
                                                <h3 className="ad-grid-title">{c.name}</h3>
                                                <p className="ad-grid-sub">{c.season} · {c.duration}</p>
                                                <p className="ad-grid-info">{c.climate?.substring(0, 80)}…</p>
                                                <div className="ad-grid-actions">
                                                    <button className="ad-edit-btn" onClick={() => setCropModal(c)}><Edit3 size={14} /> <TranslateText>编辑</TranslateText></button>
                                                    <button className="ad-del-btn" onClick={() => deleteCrop(c.id)}><Trash2 size={14} /> <TranslateText>删除</TranslateText></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* ── SCHEMES TAB ── */}
                        {tab === "schemes" && (
                            <div className="ad-cards">
                                {fSchemes.length === 0
                                    ? <Empty icon={<BookOpen size={40} />} text="暂无政策" />
                                    : fSchemes.map(s => (
                                        <div key={s.id} className="ad-card ad-card--scheme">
                                            <div className="ad-card-row">
                                                <h3 className="ad-card-title" style={{ margin: 0 }}>{s.name}</h3>
                                                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                                                    <button className="ad-icon-btn ad-icon-btn--edit" onClick={() => setSchemeModal(s)}><Edit3 size={14} /></button>
                                                    <button className="ad-icon-btn ad-icon-btn--del" onClick={() => deleteScheme(s.id)}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            <p className="ad-card-desc">{s.description?.substring(0, 150)}{s.description?.length > 150 ? "…" : ""}</p>
                                            <div className="ad-scheme-meta">
                                                {s.eligibility && <span className="ad-meta"><FileText size={12} /> {s.eligibility?.substring(0, 60)}…</span>}
                                                {s.official_link && <a href={s.official_link} target="_blank" rel="noreferrer" className="ad-link"><TranslateText>官方链接</TranslateText> ↗</a>}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {/* ── FEEDBACK TAB ── */}
                        {tab === "feedback" && (
                            <div className="ad-cards">
                                {fFeedbacks.length === 0
                                    ? <Empty icon={<Mail size={40} />} text="暂无反馈" />
                                    : fFeedbacks.map(f => {
                                        const open = expanded[`fb-${f.id}`];
                                        return (
                                            <div key={f.id} className="ad-card ad-card--scheme">
                                                <div className="ad-card-row">
                                                    <span className="ad-meta"><User size={12} />{f.name}</span>
                                                    <span className="ad-meta"><Mail size={12} />{f.email}</span>
                                                    <span className="ad-meta"><Calendar size={12} />{new Date(f.created_at).toLocaleDateString("zh-CN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                                                        <button className="ad-icon-btn ad-icon-btn--expand" onClick={() => setExpanded(e => ({ ...e, [`fb-${f.id}`]: !e[`fb-${f.id}`] }))}>
                                                            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        </button>
                                                        <button className="ad-icon-btn ad-icon-btn--del" onClick={() => deleteFeedback(f.id)} title="删除"><Trash2 size={15} /></button>
                                                    </div>
                                                </div>
                                                <h3 className="ad-card-title">{f.subject}</h3>
                                                {open && (
                                                    <p className="ad-card-desc" style={{ whiteSpace: "pre-line", marginTop: "12px" }}>{f.message}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </>
                )}
            </main>

            <style>{CSS}</style>
        </div>
    );
}

/* ─────────────────────── Sub-components ─────────────────────── */

function Empty({ icon, text }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260, gap: 12, color: "#9ca3af" }}>
            {icon}<p style={{ fontWeight: 600 }}><TranslateText>{text}</TranslateText></p>
        </div>
    );
}

function CropModal({ initial, onSave, onClose }) {
    const blank = { crop_id: "", name: "", season: "", soil: "[]", duration: "", sowing_time: "", climate: "", rainfall: "", fertilizer: "", irrigation: "", yield_info: "", steps: "[]", common_mistakes: "[]" };
    const [form, setForm] = useState(initial
        ? { ...initial, soil: JSON.stringify(initial.soil || []), steps: JSON.stringify(initial.steps || []), common_mistakes: JSON.stringify(initial.common_mistakes || []) }
        : blank
    );
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <Modal title={initial ? "编辑作物" : "新增作物"} onClose={onClose}>
            <div className="ad-modal-grid">
                {[["crop_id", "作物 ID"], ["name", "名称"], ["season", "季节"], ["duration", "生长周期"], ["sowing_time", "播种时间"], ["rainfall", "降雨量"], ["fertilizer", "施肥"], ["yield_info", "产量信息"]].map(([k, lbl]) => (
                    <label key={k} className="ad-label">
                        {lbl}
                        <input className="ad-input" value={form[k] || ""} onChange={e => f(k, e.target.value)} />
                    </label>
                ))}
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    气候
                    <textarea className="ad-input" rows={2} value={form.climate || ""} onChange={e => f("climate", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    灌溉
                    <textarea className="ad-input" rows={2} value={form.irrigation || ""} onChange={e => f("irrigation", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    土壤 <span className="ad-hint">（JSON 数组，如 [&quot;Loamy&quot;,&quot;Clay&quot;]）</span>
                    <textarea className="ad-input" rows={2} value={form.soil} onChange={e => f("soil", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    种植步骤 <span className="ad-hint">（字符串 JSON 数组）</span>
                    <textarea className="ad-input" rows={3} value={form.steps} onChange={e => f("steps", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    常见错误 <span className="ad-hint">（字符串 JSON 数组）</span>
                    <textarea className="ad-input" rows={3} value={form.common_mistakes} onChange={e => f("common_mistakes", e.target.value)} />
                </label>
            </div>
            <div className="ad-modal-foot">
                <button className="ad-cancel-btn" onClick={onClose}><X size={14} /> <TranslateText>取消</TranslateText></button>
                <button className="ad-save-btn" onClick={() => onSave(form)}><Save size={14} /> <TranslateText>{initial ? "更新" : "创建"}</TranslateText></button>
            </div>
        </Modal>
    );
}

function SchemeModal({ initial, onSave, onClose }) {
    const blank = { name: "", description: "", benefits: "", eligibility: "", official_link: "" };
    const [form, setForm] = useState(initial ? { ...initial } : blank);
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

    return (
        <Modal title={initial ? "编辑政策" : "新增政策"} onClose={onClose}>
            <div className="ad-modal-grid">
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    名称
                    <input className="ad-input" value={form.name} onChange={e => f("name", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    简介
                    <textarea className="ad-input" rows={3} value={form.description} onChange={e => f("description", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    补贴内容
                    <textarea className="ad-input" rows={3} value={form.benefits} onChange={e => f("benefits", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    申请条件
                    <textarea className="ad-input" rows={2} value={form.eligibility} onChange={e => f("eligibility", e.target.value)} />
                </label>
                <label className="ad-label" style={{ gridColumn: "1/-1" }}>
                    官方链接
                    <input className="ad-input" type="url" value={form.official_link} onChange={e => f("official_link", e.target.value)} />
                </label>
            </div>
            <div className="ad-modal-foot">
                <button className="ad-cancel-btn" onClick={onClose}><X size={14} /> <TranslateText>取消</TranslateText></button>
                <button className="ad-save-btn" onClick={() => onSave(form)}><Save size={14} /> <TranslateText>{initial ? "更新" : "创建"}</TranslateText></button>
            </div>
        </Modal>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div className="ad-overlay" onClick={onClose}>
            <div className="ad-modal" onClick={e => e.stopPropagation()}>
                <div className="ad-modal-head">
                    <h2 className="ad-modal-title">{title}</h2>
                    <button className="ad-modal-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="ad-modal-body">{children}</div>
            </div>
        </div>
    );
}

/* ─────────────────────── CSS ─────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .ad-root {margin-top: 70px; display:flex; min-height:100vh; background:#f0f4f0; font-family:'Inter',sans-serif; }

  /* Toast */
  .ad-toast{position:fixed;bottom:28px;right:28px;z-index:9999;background:#166534;color:#fff;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(22,101,52,.3);animation:slideUp .3s ease;}
  .ad-toast--err{background:#b91c1c;}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

  /* Sidebar */
  .ad-sidebar{width:240px;min-height:100vh;background:linear-gradient(175deg,#14532d,#166534 55%,#15803d);display:flex;flex-direction:column;padding:24px 14px;gap:6px;position:sticky;top:0;height:100vh;overflow-y:auto;}
  .ad-logo{display:flex;align-items:center;gap:9px;padding:4px 6px 20px;color:#fff;font-size:17px;font-weight:800;letter-spacing:-.3px;}
  .ad-logo-icon{width:34px;height:34px;background:rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#bbf7d0;flex-shrink:0;}
  .ad-logo-text{flex:1;}
  .ad-badge{background:rgba(255,255,255,.18);color:#d1fae5;font-size:9px;font-weight:700;letter-spacing:.5px;padding:2px 7px;border-radius:20px;text-transform:uppercase;}
  .ad-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
  .ad-nav-btn{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:11px;border:none;cursor:pointer;background:transparent;color:rgba(255,255,255,.7);font-size:13.5px;font-weight:600;transition:.2s;text-align:left;width:100%;}
  .ad-nav-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
  .ad-nav-btn.active{background:rgba(255,255,255,.18);color:#fff;}
  .ad-chip{margin-left:auto;background:#16a34a;color:#fff;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:20px;display:flex;align-items:center;justify-content:center;padding:0 5px;}
  .ad-chip--amber{background:#d97706;}
  .ad-sidebar-foot{display:flex;align-items:center;gap:9px;padding:12px 6px 4px;border-top:1px solid rgba(255,255,255,.1);}
  .ad-avatar{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.2);color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .ad-av-sm{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .ad-foot-info{flex:1;}
  .ad-foot-name{color:#fff;font-size:12px;font-weight:700;line-height:1.3;}
  .ad-foot-role{color:rgba(255,255,255,.5);font-size:10px;}
  .ad-logout{background:rgba(255,255,255,.12);border:none;border-radius:8px;padding:7px;color:rgba(255,255,255,.7);cursor:pointer;transition:.2s;display:flex;align-items:center;}
  .ad-logout:hover{background:rgba(255,255,255,.22);color:#fff;}

  /* Main */
  .ad-main{flex:1;padding:28px 32px;overflow-y:auto;max-height:100vh;}
  .ad-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:24px;}
  .ad-h1{font-size:24px;font-weight:800;color:#14532d;letter-spacing:-.5px;margin:0;}
  .ad-sub{color:#6b7280;font-size:13px;margin:2px 0 0;}
  .ad-header-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}

  .ad-search-wrap{display:flex;align-items:center;background:#fff;border:1.5px solid #d1fae5;border-radius:11px;padding:7px 12px;gap:7px;box-shadow:0 2px 8px rgba(0,0,0,.04);min-width:220px;}
  .ad-search-ic{color:#9ca3af;flex-shrink:0;}
  .ad-search{border:none;outline:none;font-size:13px;color:#374151;background:transparent;width:100%;}
  .ad-add-btn{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:11px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;box-shadow:0 4px 14px rgba(22,163,74,.25);white-space:nowrap;}
  .ad-add-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,163,74,.35);}

  /* Stats */
  .ad-stats{display:flex;gap:14px;margin-bottom:24px;flex-wrap:wrap;}
  .ad-stat{display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:16px 20px;box-shadow:0 2px 10px rgba(0,0,0,.05);flex:1;min-width:130px;}
  .ad-stat--green{border-left:4px solid #16a34a;color:#16a34a;}
  .ad-stat--amber{border-left:4px solid #d97706;color:#d97706;}
  .ad-stat--blue{border-left:4px solid #2563eb;color:#2563eb;}
  .ad-stat-num{font-size:26px;font-weight:800;line-height:1;color:#111827;}
  .ad-stat-lbl{font-size:11px;color:#6b7280;margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;}

  /* Loading */
  .ad-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:14px;color:#6b7280;}
  .ad-spin{width:34px;height:34px;border:3px solid #d1fae5;border-top-color:#16a34a;border-radius:50%;animation:spin .7s linear infinite;}
  .ad-spin-sm{width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* Cards */
  .ad-cards{display:flex;flex-direction:column;gap:16px;}
  .ad-card{background:#fff;border-radius:18px;padding:20px 24px;box-shadow:0 2px 14px rgba(0,0,0,.06);border:1.5px solid #f3f4f6;transition:box-shadow .2s;}
  .ad-card:hover{box-shadow:0 6px 28px rgba(0,0,0,.1);}
  .ad-card--pend{border-color:#fef3c7;}
  .ad-card--ans{border-color:#dcfce7;}
  .ad-card--scheme{border-color:#e0e7ff;}
  .ad-card-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;}
  .ad-card-title{font-size:16px;font-weight:800;color:#111827;margin:0 0 8px;}
  .ad-card-desc{color:#4b5563;font-size:13.5px;line-height:1.7;margin:0 0 14px;}
  .ad-card-img{max-width:340px;width:100%;border-radius:10px;margin-bottom:14px;border:1px solid #f3f4f6;object-fit:cover;max-height:220px;}

  /* Pills */
  .ad-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.4px;}
  .pill--green{background:#dcfce7;color:#166534;}
  .pill--amber{background:#fef3c7;color:#92400e;}
  .pill--blue{background:#dbeafe;color:#1e40af;}
  .pill--grey{background:#f3f4f6;color:#374151;}

  /* Meta */
  .ad-meta{display:flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;font-weight:500;}

  /* Icon buttons */
  .ad-icon-btn{display:flex;align-items:center;justify-content:center;border:none;border-radius:8px;padding:6px;cursor:pointer;transition:.2s;}
  .ad-icon-btn--del{background:#fee2e2;color:#b91c1c;}
  .ad-icon-btn--del:hover{background:#fecaca;}
  .ad-icon-btn--edit{background:#e0e7ff;color:#3730a3;}
  .ad-icon-btn--edit:hover{background:#c7d2fe;}
  .ad-icon-btn--expand{background:#f3f4f6;color:#374151;}
  .ad-icon-btn--expand:hover{background:#e5e7eb;}

  /* Reply */
  .ad-reply-sent{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:11px;padding:14px 16px;margin-top:4px;}
  .ad-reply-label{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#16a34a;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px;}
  .ad-reply-sent p{color:#374151;font-size:13.5px;line-height:1.7;margin:0;}
  .ad-reply-area{margin-top:8px;}
  .ad-ta{width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:13.5px;color:#374151;resize:vertical;font-family:inherit;outline:none;transition:.2s;box-sizing:border-box;}
  .ad-ta:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08);}
  .ad-send-btn{margin-top:9px;display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:9px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;box-shadow:0 4px 12px rgba(22,163,74,.25);}
  .ad-send-btn:hover:not(:disabled){transform:translateY(-1px);}
  .ad-send-btn:disabled{opacity:.55;cursor:not-allowed;}
  .ad-scheme-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:4px;}
  .ad-link{font-size:12px;color:#2563eb;font-weight:600;text-decoration:none;}
  .ad-link:hover{text-decoration:underline;}

  /* Users table */
  .ad-table-wrap{background:#fff;border-radius:18px;box-shadow:0 2px 14px rgba(0,0,0,.06);overflow:hidden;border:1.5px solid #f3f4f6;}
  .ad-table{width:100%;border-collapse:collapse;font-size:13.5px;}
  .ad-table thead{background:linear-gradient(90deg,#f0fdf4,#dcfce7);}
  .ad-table th{padding:13px 16px;text-align:left;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:#166534;border-bottom:1.5px solid #d1fae5;}
  .ad-table td{padding:12px 16px;border-bottom:1px solid #f9fafb;color:#374151;vertical-align:middle;}
  .ad-table tr:last-child td{border-bottom:none;}
  .ad-table tr:hover td{background:#f9fafb;}
  .ad-row--staff td{background:#f0fdf4;}
  .ad-row--staff:hover td{background:#dcfce7;}
  .ad-num{color:#9ca3af;font-size:12px;font-weight:600;}
  .ad-date{color:#9ca3af;font-size:12px;}
  .ad-user-cell{display:flex;align-items:center;gap:8px;font-weight:600;color:#111827;}
  .ad-admin-tag{display:inline-flex;align-items:center;gap:3px;background:#fef3c7;color:#92400e;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:20px;text-transform:uppercase;}
  .ad-email{display:flex;align-items:center;gap:4px;color:#6b7280;font-size:12.5px;}

  /* Grid (crops) */
  .ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;}
  .ad-grid-card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);border:1.5px solid #f3f4f6;transition:box-shadow .2s;}
  .ad-grid-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);}
  .ad-grid-img{width:100%;height:160px;object-fit:cover;}
  .ad-grid-body{padding:16px;}
  .ad-grid-title{font-size:15px;font-weight:800;color:#111827;margin:0 0 4px;}
  .ad-grid-sub{font-size:12px;color:#6b7280;font-weight:600;margin:0 0 8px;}
  .ad-grid-info{font-size:12.5px;color:#4b5563;line-height:1.6;margin:0 0 12px;}
  .ad-grid-actions{display:flex;gap:8px;}
  .ad-edit-btn{display:flex;align-items:center;gap:5px;background:#e0e7ff;color:#3730a3;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;}
  .ad-edit-btn:hover{background:#c7d2fe;}
  .ad-del-btn{display:flex;align-items:center;gap:5px;background:#fee2e2;color:#b91c1c;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;}
  .ad-del-btn:hover{background:#fecaca;}

  /* Modal overlay */
  .ad-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;}
  .ad-modal{background:#fff;border-radius:20px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.2);}
  .ad-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #f3f4f6;}
  .ad-modal-title{font-size:18px;font-weight:800;color:#111827;margin:0;}
  .ad-modal-close{background:#f3f4f6;border:none;border-radius:8px;padding:6px;cursor:pointer;color:#6b7280;display:flex;align-items:center;transition:.2s;}
  .ad-modal-close:hover{background:#e5e7eb;color:#111827;}
  .ad-modal-body{padding:20px 24px;}
  .ad-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}
  .ad-label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.4px;}
  .ad-hint{text-transform:none;font-weight:400;color:#9ca3af;letter-spacing:0;}
  .ad-input{border:1.5px solid #e5e7eb;border-radius:9px;padding:9px 11px;font-size:13.5px;font-family:inherit;color:#374151;outline:none;transition:.2s;resize:vertical;}
  .ad-input:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08);}
  .ad-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding-top:6px;}
  .ad-cancel-btn{display:flex;align-items:center;gap:6px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;}
  .ad-cancel-btn:hover{background:#e5e7eb;}
  .ad-save-btn{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:10px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;box-shadow:0 4px 12px rgba(22,163,74,.25);}
  .ad-save-btn:hover{transform:translateY(-1px);}

  /* Responsive */
  @media(max-width:768px){
    .ad-sidebar{width:60px;padding:14px 8px;}
    .ad-logo-text,.ad-badge,.ad-nav-btn span,.ad-chip,.ad-foot-name,.ad-foot-role{display:none;}
    .ad-nav-btn{justify-content:center;padding:11px;}
    .ad-main{padding:18px 14px;}
    .ad-modal-grid{grid-template-columns:1fr;}
  }
`;
