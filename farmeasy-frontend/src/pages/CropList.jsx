import { useEffect, useState } from "react";
import { API_BASE_URL, mediaUrl } from "../services/api";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";
import { searchLocalCrops } from "../data/cropKnowledge";
import { getCropEmoji, getCategoryGradient } from "../data/cropEmoji";
import cropImages from "../data/cropImages.json";



// 响应式：窄屏时分栏布局切换为上下结构
function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
    );
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [breakpoint]);
    return isMobile;
}

function publicAsset(path) {
    const base = import.meta.env.BASE_URL || "/";
    const relative = String(path || "").replace(/^\//, "");
    return `${base}${relative}`;
}

// DB crops have relative paths like /media/..., scraped crops have full URLs
function getImageSrc(imagePath, cropName) {
    if (cropImages[cropName]) return publicAsset(cropImages[cropName]);
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
    }
    if (imagePath.startsWith("/crops/")) {
        return publicAsset(imagePath);
    }
    return mediaUrl(imagePath);
}

// 本地作物图片：专属 emoji + 类别渐变底色（后端返回真实图片时优先用真实图片）
function PlaceholderImage({ name, emoji, category }) {
    return (
        <div style={{
            width: "100%",
            height: "160px",
            background: getCategoryGradient(category),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px 10px 0 0",
            color: "#388e3c",
        }}>
            <span style={{ fontSize: "52px", lineHeight: 1.1 }}>
                {emoji || getCropEmoji(name)}
            </span>
            <span style={{ fontSize: "12px", marginTop: "6px", fontWeight: 600, letterSpacing: "0.5px", color: "#33691e" }}>
                {name}
            </span>
        </div>
    );
}

function CropList() {
    const [crops, setCrops] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [imgErrors, setImgErrors] = useState({});


    const fetchCrops = (query = "") => {
        setLoading(true);
        const url = query
            ? `${API_BASE_URL}/education/crops/?search=${encodeURIComponent(query)}`
            : `${API_BASE_URL}/education/crops/`;

        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error("API unavailable");
                return res.json();
            })
            .then((data) => {
                // 后端有数据则使用后端，否则回退到本地知识库
                if (Array.isArray(data) && data.length > 0) {
                    setCrops(data);
                } else {
                    setCrops(searchLocalCrops(query));
                }
            })
            .catch(() => {
                // 后端不可用时使用本地作物知识库
                setCrops(searchLocalCrops(query));
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        let cancelled = false;
        const loadInitialCrops = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/education/crops/`);
                if (!response.ok) throw new Error(`API unavailable`);
                const data = await response.json();
                if (!cancelled) setCrops(Array.isArray(data) && data.length > 0 ? data : searchLocalCrops(""));
            } catch {
                if (!cancelled) setCrops(searchLocalCrops(""));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadInitialCrops();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestions([]);
        fetchCrops(search.trim());
    };

    const handleImgError = (key) => {
        setImgErrors((prev) => ({ ...prev, [key]: true }));
    };

    const pageStyle = {
        minHeight: "100vh",
        background: "#f7faf7",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: "#1a2e1a",
    };

    const containerStyle = {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "28px 24px",
        paddingTop: "96px",
    };

    return (
        <div style={pageStyle}>
            <Navbar />
            <div style={containerStyle}>
                {/* ── Header ── */}
                <div style={{ marginBottom: "32px", padding: "28px 32px", borderRadius: "20px", background: "linear-gradient(135deg, #f1f9f1 0%, #eaf6ec 50%, #f7faf7 100%)", border: "1px solid #d8e8d8" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "100px", background: "#ffffff", border: "1px solid #d8e8d8", marginBottom: "14px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4caf50", display: "inline-block" }} />
                        <span style={{ fontSize: "12px", color: "#388e3c", fontWeight: 500 }}>
                            <TranslateText>作物知识库</TranslateText>
                        </span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 800, color: "#1b5e20", letterSpacing: "-0.5px" }}>
                        <TranslateText>作物百科</TranslateText>
                    </h1>
                    <p style={{ margin: "8px 0 0", fontSize: "15px", color: "#5f8a5f", lineHeight: 1.6 }}>
                        <TranslateText>浏览或搜索作物，了解种植详情</TranslateText>
                    </p>
                </div>
                {/* ── Search Bar ── */}
                <form onSubmit={handleSearch} style={{ marginBottom: "32px", position: "relative", maxWidth: "480px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <span style={{
                                position: "absolute", left: "14px", top: "50%",
                                transform: "translateY(-50%)", fontSize: "16px", color: "#4caf50"
                            }}>🔍</span>
                            <input
                                type="text"
                                placeholder="搜索作物（如小麦、番茄…）"
                                value={search}
                                autoComplete="off"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearch(value);
                                    if (value.length > 0) {
                                        fetch(`${API_BASE_URL}/education/crops/?search=${encodeURIComponent(value)}`)
                                            .then((res) => (res.ok ? res.json() : Promise.reject()))
                                            .then((data) => {
                                                // 后端无结果时用本地知识库补全
                                                const list = Array.isArray(data) && data.length > 0
                                                    ? data
                                                    : searchLocalCrops(value);
                                                setSuggestions(list);
                                                setShowSuggestions(true);
                                            })
                                            .catch(() => {
                                                setSuggestions(searchLocalCrops(value));
                                                setShowSuggestions(true);
                                            });
                                    } else {
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                    }
                                }}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                style={{
                                    width: "100%", padding: "11px 14px 11px 40px",
                                    borderRadius: "12px",
                                    border: "1.5px solid #c8e6c9",
                                    background: "#fff",
                                    fontSize: "14px",
                                    color: "#1a2e1a",
                                    outline: "none",
                                    boxSizing: "border-box",
                                    boxShadow: "0 2px 8px rgba(76,175,80,0.08)",
                                    transition: "border-color 0.2s",
                                }}
                                onFocusCapture={(e) => e.target.style.borderColor = "#4caf50"}
                                onBlurCapture={(e) => e.target.style.borderColor = "#c8e6c9"}
                            />

                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div style={{
                                    position: "absolute", top: "calc(100% + 6px)", left: 0,
                                    width: "100%", background: "#fff",
                                    border: "1.5px solid #c8e6c9", borderRadius: "12px",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                                    zIndex: 1000, overflow: "hidden",
                                }}>
                                    {suggestions.slice(0, 6).map((crop) => (
                                        <div
                                            key={crop.id}
                                            style={{
                                                padding: "10px 16px", cursor: "pointer",
                                                fontSize: "14px", color: "#1a2e1a",
                                                borderBottom: "1px solid #f1f8f1",
                                                display: "flex", alignItems: "center", gap: "8px",
                                                transition: "background 0.15s",
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = "#f1f8f1"}
                                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                            onMouseDown={() => {
                                                setSelectedCrop(crop);
                                                setSearch(crop.name);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <span style={{ color: "#4caf50" }}>🌿</span>
                                            {crop.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            style={{
                                padding: "11px 20px",
                                background: "linear-gradient(135deg, #4caf50, #2e7d32)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "12px",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                boxShadow: "0 4px 12px rgba(76,175,80,0.35)",
                                transition: "opacity 0.2s, transform 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                            <TranslateText>搜索</TranslateText>
                        </button>
                    </div>
                </form>

                {/* ── Loading ── */}
                {loading && (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#4caf50" }}>
                        <div style={{ fontSize: "36px", marginBottom: "12px", animation: "spin 1.5s linear infinite" }}>⟳</div>
                        <p style={{ fontWeight: 500 }}><TranslateText>正在加载作物…</TranslateText></p>
                        <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
                    </div>
                )}

                {/* ── Empty state ── */}
                {!loading && crops.length === 0 && (
                    <div style={{
                        textAlign: "center", padding: "60px 20px",
                        border: "2px dashed #c8e6c9", borderRadius: "16px",
                        background: "#fff",
                    }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>🌿</div>
                        <p style={{ fontWeight: 600, color: "#388e3c", fontSize: "16px" }}>
                            <TranslateText>未找到作物</TranslateText>
                        </p>
                        <p style={{ color: "#789a78", fontSize: "13px" }}>
                            <TranslateText>换个作物名称试试，或清除搜索条件</TranslateText>
                        </p>
                    </div>
                )}

                {/* ── Crop Grid ── */}
                {!loading && crops.length > 0 && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: "20px",
                    }}>
                        {crops.map((crop) => {
                            const imgKey = crop.id ?? crop.name;
                            const imgSrc = getImageSrc(crop.image, crop.name);
                            const hasImgError = imgErrors[imgKey];

                            return (
                                <div
                                    key={imgKey}
                                    style={{
                                        background: "#fff",
                                        borderRadius: "14px",
                                        border: "1.5px solid #e8f5e9",
                                        overflow: "hidden",
                                        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                                        transition: "transform 0.2s, box-shadow 0.2s",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-4px)";
                                        e.currentTarget.style.boxShadow = "0 10px 28px rgba(76,175,80,0.15)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
                                    }}
                                    onClick={() => setSelectedCrop(crop)}
                                >
                                    {/* Image */}
                                    {imgSrc && !hasImgError ? (
                                        <img
                                            src={imgSrc}
                                            alt={crop.name}
                                            style={{ width: "100%", height: "160px", objectFit: "cover" }}
                                            onError={() => handleImgError(imgKey)}
                                        />
                                    ) : (
                                        <PlaceholderImage name={crop.name} emoji={crop.emoji} category={crop.category} />
                                    )}

                                    {/* Content */}
                                    <div style={{ padding: "14px 16px 16px" }}>
                                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" }}>
                                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#1b5e20" }}>
                                                {crop.name}
                                            </h3>
                                            {crop.scraped && (
                                                <span style={{
                                                    fontSize: "10px", fontWeight: 600,
                                                    background: "#fff8e1", color: "#f57f17",
                                                    border: "1px solid #ffe082",
                                                    borderRadius: "20px", padding: "2px 7px",
                                                    whiteSpace: "nowrap", marginLeft: "6px",
                                                }}>
                                                    🔍 <TranslateText>网络</TranslateText>
                                                </span>
                                            )}
                                        </div>

                                        {crop.season && (
                                            <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#555" }}>
                                                <span style={{ color: "#4caf50", fontWeight: 600 }}><TranslateText>季节：</TranslateText> </span>
                                                <TranslateText>{crop.season}</TranslateText>
                                            </p>
                                        )}
                                        {crop.soil && (
                                            <p style={{
                                                margin: "0 0 12px", fontSize: "12px", color: "#555",
                                                display: "-webkit-box", WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical", overflow: "hidden",
                                            }}>
                                                <span style={{ color: "#4caf50", fontWeight: 600 }}><TranslateText>土壤：</TranslateText> </span>
                                                <TranslateText>{Array.isArray(crop.soil) ? crop.soil.join(", ") : crop.soil}</TranslateText>
                                            </p>
                                        )}

                                        <button
                                            style={{
                                                width: "100%", padding: "8px",
                                                background: "linear-gradient(135deg, #4caf50, #388e3c)",
                                                color: "#fff", border: "none",
                                                borderRadius: "9px", fontWeight: 600,
                                                fontSize: "13px", cursor: "pointer",
                                                transition: "opacity 0.2s",
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                                        >
                                            <TranslateText>查看详情</TranslateText>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Detail Panel: 左侧分栏布局（参考全国农产品成本收益资料汇编样式） ── */}
                {selectedCrop && (
                    <CropDetailPanel crop={selectedCrop} onClose={() => setSelectedCrop(null)} imgErrors={imgErrors} onImgError={handleImgError} />
                )}
            </div>
        </div>
    );
}

/**
 * 作物详情面板 —— 左侧分栏导航 + 右侧内容
 * 布局参考 https://ncpscxx.moa.gov.cn/product-web/#/sing
 * 信息内容完全来自原数据，不做修改
 */
function CropDetailPanel({ crop, onClose, imgErrors, onImgError }) {
    // 根据可用字段构建左侧分栏目录（内容不变，仅重新组织呈现）
    const sections = [
        {
            id: "basic",
            icon: "🌿",
            label: "基本信息",
            visible: !!(crop.season || crop.soil || crop.climate || crop.water || crop.duration || crop.sowing_time),
        },
        { id: "intro", icon: "📖", label: "作物简介", visible: !!crop.description },
        {
            id: "cultivation",
            icon: "🧑‍🌾",
            label: "栽培管理",
            visible: !!(crop.fertilizer || crop.irrigation || crop.yield_info),
        },
        { id: "steps", icon: "🌱", label: "种植步骤", visible: Array.isArray(crop.steps) && crop.steps.length > 0 },
        {
            id: "mistakes",
            icon: "⚠️",
            label: "常见错误",
            visible: Array.isArray(crop.common_mistakes) && crop.common_mistakes.length > 0,
        },
    ].filter((s) => s.visible);

    const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "basic");
    const isMobile = useIsMobile(640);

    const scrollToSection = (id) => {
        setActiveSection(id);
        const el = document.getElementById(`crop-section-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const imgSrc = getImageSrc(crop.image, crop.name);
    const imgKey = crop.id ?? crop.name;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "18px",
                    width: "92%",
                    maxWidth: "900px",
                    height: "min(640px, 88vh)",
                    position: "relative",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── 顶部标题栏 ── */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px 24px",
                    borderBottom: "1px solid #e8f5e9",
                    background: "linear-gradient(135deg, #f4fbf1 0%, #e8f5e9 100%)",
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: "28px" }}>{crop.emoji || getCropEmoji(crop.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ margin: 0, color: "#1b5e20", fontSize: "20px", fontWeight: 800, lineHeight: 1.2 }}>
                            {crop.name}
                        </h2>
                        <span style={{
                            display: "inline-block",
                            marginTop: "4px",
                            fontSize: "11px", fontWeight: 600,
                            background: crop.scraped ? "#fff8e1" : "#e8f5e9",
                            color: crop.scraped ? "#f57f17" : "#2e7d32",
                            border: `1px solid ${crop.scraped ? "#ffe082" : "#a5d6a7"}`,
                            borderRadius: "20px", padding: "2px 10px",
                        }}>
                            {crop.source === "database"
                                ? <TranslateText>📚 本地数据库</TranslateText>
                                : crop.scraped
                                    ? <><TranslateText>🔍 网络抓取：</TranslateText> {crop.source}</>
                                    : <TranslateText>{crop.source || "📚 本地知识库"}</TranslateText>}
                        </span>
                    </div>
                    <button style={closeBtnStyle} onClick={onClose} aria-label="关闭">✖</button>
                </div>

                {/* ── 主体：左侧分栏 + 右侧内容 ── */}
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: 1, minHeight: 0 }}>

                    {/* 左侧分栏导航 */}
                    <aside style={{
                        width: "188px",
                        flexShrink: 0,
                        borderRight: "1px solid #e8f5e9",
                        background: "#fbfef9",
                        display: "flex",
                        flexDirection: "column",
                        padding: "14px 10px",
                        gap: "6px",
                        overflowY: "auto",
                    }}>
                        {/* 作物缩略图 */}
                        {imgSrc && !imgErrors[imgKey] ? (
                            <img
                                src={imgSrc}
                                alt={crop.name}
                                style={{
                                    width: "100%", height: "110px", objectFit: "cover",
                                    borderRadius: "10px", marginBottom: "10px",
                                    boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
                                }}
                                onError={() => onImgError(imgKey)}
                            />
                        ) : (
                            <div style={{
                                width: "100%", height: "90px", borderRadius: "10px",
                                background: getCategoryGradient(crop.category),
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "40px", marginBottom: "10px",
                            }}>
                                {crop.emoji || getCropEmoji(crop.name)}
                            </div>
                        )}

                        <p style={{
                            margin: "0 0 8px 6px", fontSize: "11px", fontWeight: 700,
                            color: "#81a581", letterSpacing: "1px",
                        }}>
                            <TranslateText>目录</TranslateText>
                        </p>

                        {sections.map((s, idx) => {
                            const active = activeSection === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => scrollToSection(s.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        width: "100%",
                                        padding: "9px 12px",
                                        border: "none",
                                        borderRadius: "9px",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "13px",
                                        fontWeight: active ? 700 : 500,
                                        color: active ? "#fff" : "#2e4a2e",
                                        background: active
                                            ? "linear-gradient(135deg, #4caf50, #2e7d32)"
                                            : "transparent",
                                        boxShadow: active ? "0 3px 10px rgba(76,175,80,0.3)" : "none",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!active) e.currentTarget.style.background = "#eef8ee";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!active) e.currentTarget.style.background = "transparent";
                                    }}
                                >
                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        width: "20px",
                                        height: "20px",
                                        borderRadius: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: active ? "rgba(255,255,255,0.22)" : "#e8f5e9",
                                        color: active ? "#fff" : "#4caf50",
                                        flexShrink: 0,
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <span style={{ flex: 1 }}>{s.icon} <TranslateText>{s.label}</TranslateText></span>
                                </button>
                            );
                        })}
                    </aside>

                    {/* 右侧内容区 */}
                    <main style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "20px 26px 28px",
                        scrollBehavior: "smooth",
                    }}>
                        {/* 基本信息 */}
                        {sections.some((s) => s.id === "basic") && (
                            <section id="crop-section-basic" style={{ scrollMarginTop: "8px" }}>
                                <SectionHeading icon="🌿" title="基本信息" />
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "8px" }}>
                                    {crop.season && <DetailRow icon="📅" label="季节" value={crop.season} />}
                                    {crop.soil && (
                                        <DetailRow
                                            icon="🌱"
                                            label="土壤"
                                            value={Array.isArray(crop.soil) ? crop.soil.join(", ") : crop.soil}
                                        />
                                    )}
                                    {crop.climate && <DetailRow icon="🌤️" label="气候" value={crop.climate} />}
                                    {crop.water && <DetailRow icon="💧" label="需水量" value={crop.water} />}
                                    {crop.duration && <DetailRow icon="⏱️" label="生长周期" value={crop.duration} />}
                                    {crop.sowing_time && <DetailRow icon="🗓️" label="播种时间" value={crop.sowing_time} />}
                                </div>
                            </section>
                        )}

                        {/* 作物简介 */}
                        {crop.description && (
                            <section id="crop-section-intro" style={{ scrollMarginTop: "8px" }}>
                                <SectionHeading icon="📖" title="作物简介" />
                                <p style={{ margin: 0, fontSize: "13px", color: "#444", lineHeight: 1.8 }}>
                                    <TranslateText>{crop.description}</TranslateText>
                                </p>
                            </section>
                        )}

                        {/* 栽培管理 */}
                        {(crop.fertilizer || crop.irrigation || crop.yield_info) && (
                            <section id="crop-section-cultivation" style={{ scrollMarginTop: "8px" }}>
                                <SectionHeading icon="🧑‍🌾" title="栽培管理" />
                                <div style={{ display: "grid", gap: "8px" }}>
                                    {crop.fertilizer && <DetailRow icon="🧪" label="施肥" value={crop.fertilizer} />}
                                    {crop.irrigation && <DetailRow icon="🚿" label="灌溉" value={crop.irrigation} />}
                                    {crop.yield_info && <DetailRow icon="📦" label="预期产量" value={crop.yield_info} />}
                                </div>
                            </section>
                        )}

                        {/* 种植步骤 */}
                        {crop.steps && crop.steps.length > 0 && (
                            <section id="crop-section-steps" style={{ scrollMarginTop: "8px" }}>
                                <SectionHeading icon="🌱" title="种植步骤" />
                                <ol style={{ margin: 0, paddingLeft: "22px", color: "#333", lineHeight: 1.9, fontSize: "13px" }}>
                                    {crop.steps.map((step, idx) => <li key={idx}><TranslateText>{step}</TranslateText></li>)}
                                </ol>
                            </section>
                        )}

                        {/* 常见错误 */}
                        {crop.common_mistakes && crop.common_mistakes.length > 0 && (
                            <section id="crop-section-mistakes" style={{ scrollMarginTop: "8px" }}>
                                <SectionHeading icon="⚠️" title="常见错误" color="#e65100" />
                                <ul style={{ margin: 0, paddingLeft: "22px", color: "#333", lineHeight: 1.9, fontSize: "13px" }}>
                                    {crop.common_mistakes.map((m, idx) => <li key={idx}><TranslateText>{m}</TranslateText></li>)}
                                </ul>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

// 分栏标题
function SectionHeading({ icon, title, color = "#2e7d32" }) {
    return (
        <h3 style={{
            color,
            margin: "22px 0 10px",
            fontSize: "15px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingBottom: "8px",
            borderBottom: `2px solid ${color === "#e65100" ? "#ffcc80" : "#c8e6c9"}`,
        }}>
            <span>{icon}</span>
            <TranslateText>{title}</TranslateText>
        </h3>
    );
}
// Small helper component for detail rows in the modal
function DetailRow({ icon, label, value }) {
    return (
        <div style={{
            display: "flex", gap: "10px", alignItems: "flex-start",
            background: "#f7faf7", borderRadius: "8px", padding: "8px 12px",
        }}>
            <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
            <p style={{ margin: 0, fontSize: "13px", color: "#333", lineHeight: 1.6 }}>
                <b style={{ color: "#1b5e20" }}><TranslateText>{label}:</TranslateText></b>{" "}
                {value}
            </p>
        </div>
    );
}

const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
};

const closeBtnStyle = {
    padding: "0",
    flexShrink: 0,
    backgroundColor: "#ef5350",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
};

export default CropList;



