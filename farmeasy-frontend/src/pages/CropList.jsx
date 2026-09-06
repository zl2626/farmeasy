import { useEffect, useState } from "react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";
import { searchLocalCrops } from "../data/cropKnowledge";
import { getCropEmoji, getCategoryGradient } from "../data/cropEmoji";

const API_IMAGE_BASE = "http://127.0.0.1:8000";

// DB crops have relative paths like /media/..., scraped crops have full URLs
function getImageSrc(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
    }
    return `${API_IMAGE_BASE}${imagePath}`;
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

    useEffect(() => {
        fetchCrops();
    }, []);

    const fetchCrops = (query = "") => {
        setLoading(true);
        const url = query
            ? `${API_BASE_URL}/education/crops/?search=${query}`
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
                <div style={{ marginBottom: "32px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "6px" }}>
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "14px",
                            background: "linear-gradient(135deg, #4caf50, #2e7d32)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "22px", boxShadow: "0 4px 12px rgba(76,175,80,0.3)"
                        }}>
                            🌾
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#1b5e20", letterSpacing: "-0.3px" }}>
                                <TranslateText>作物百科</TranslateText>
                            </h1>
                            <p style={{ margin: 0, fontSize: "13px", color: "#6a9a6a", marginTop: "2px" }}>
                                <TranslateText>浏览或搜索作物，了解种植详情</TranslateText>
                            </p>
                        </div>
                    </div>
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
                                        fetch(`${API_BASE_URL}/education/crops/?search=${value}`)
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
                            const imgSrc = getImageSrc(crop.image);
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

                {/* ── Detail Modal (UNCHANGED FUNCTIONALITY, refined styles) ── */}
                {selectedCrop && (
                    <div style={overlayStyle}>
                        <div style={modalStyle}>
                            <button style={closeBtnStyle} onClick={() => setSelectedCrop(null)}>✖</button>

                            <h2 style={{ margin: "0 0 4px", color: "#1b5e20", fontSize: "22px", fontWeight: 700 }}>
                                {selectedCrop.name}
                            </h2>

                            {/* Source badge */}
                            <div style={{ marginBottom: "16px" }}>
                                <span style={{
                                    fontSize: "11px", fontWeight: 600,
                                    background: selectedCrop.scraped ? "#fff8e1" : "#e8f5e9",
                                    color: selectedCrop.scraped ? "#f57f17" : "#2e7d32",
                                    border: `1px solid ${selectedCrop.scraped ? "#ffe082" : "#a5d6a7"}`,
                                    borderRadius: "20px", padding: "3px 10px",
                                }}>
                                    {selectedCrop.source === "database"
                                        ? <TranslateText>📚 本地数据库</TranslateText>
                                        : selectedCrop.scraped
                                            ? <><TranslateText>🔍 网络抓取：</TranslateText> {selectedCrop.source}</>
                                            : <TranslateText>{selectedCrop.source || "📚 本地知识库"}</TranslateText>}
                                </span>
                            </div>

                            {/* IMAGES */}
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                                {selectedCrop.image && !imgErrors[selectedCrop.id ?? selectedCrop.name] ? (
                                    <img
                                        src={getImageSrc(selectedCrop.image)}
                                        alt={selectedCrop.name}
                                        style={{ width: "220px", height: "160px", objectFit: "cover", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                                        onError={() => handleImgError(selectedCrop.id ?? selectedCrop.name)}
                                    />
                                ) : (
                                    <div style={{
                                        width: "220px", height: "160px", borderRadius: "12px",
                                        background: getCategoryGradient(selectedCrop.category),
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <span style={{ fontSize: "56px" }}>{getCropEmoji(selectedCrop.name)}</span>
                                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#33691e", marginTop: "4px" }}>{selectedCrop.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Detail fields */}
                            <div style={{ display: "grid", gap: "8px" }}>
                                {selectedCrop.category && <DetailRow icon="🏷️" label="类别" value={selectedCrop.category} />}
                                {selectedCrop.season && <DetailRow icon="📅" label="季节" value={selectedCrop.season} />}
                                {selectedCrop.soil && (
                                    <DetailRow icon="🪱" label="土壤"
                                        value={Array.isArray(selectedCrop.soil) ? selectedCrop.soil.join(", ") : selectedCrop.soil}
                                    />
                                )}
                                {selectedCrop.climate && <DetailRow icon="🌤️" label="气候" value={selectedCrop.climate} />}
                                {selectedCrop.water && <DetailRow icon="💧" label="需水量" value={selectedCrop.water} />}
                                {selectedCrop.duration && <DetailRow icon="⏱️" label="生长周期" value={selectedCrop.duration} />}
                                {selectedCrop.sowing_time && <DetailRow icon="🗓️" label="播种时间" value={selectedCrop.sowing_time} />}
                            </div>

                            {selectedCrop.description && (
                                <>
                                    <hr style={{ margin: "16px 0", borderColor: "#e8f5e9" }} />
                                    <p style={{ margin: 0, fontSize: "13px", color: "#444", lineHeight: 1.7 }}>
                                        <b style={{ color: "#1b5e20" }}><TranslateText>简介：</TranslateText></b>{" "}
                                        <TranslateText>{selectedCrop.description}</TranslateText>
                                    </p>
                                </>
                            )}

                            {(selectedCrop.fertilizer || selectedCrop.irrigation || selectedCrop.yield_info) && (
                                <hr style={{ margin: "16px 0", borderColor: "#e8f5e9" }} />
                            )}
                            {selectedCrop.fertilizer && <DetailRow icon="🧪" label="施肥" value={selectedCrop.fertilizer} />}
                            {selectedCrop.irrigation && <DetailRow icon="🚿" label="灌溉" value={selectedCrop.irrigation} />}
                            {selectedCrop.yield_info && <DetailRow icon="📦" label="预期产量" value={selectedCrop.yield_info} />}

                            {selectedCrop.steps && selectedCrop.steps.length > 0 && (
                                <>
                                    <h3 style={{ color: "#2e7d32", margin: "16px 0 8px" }}><TranslateText>🌱 种植步骤</TranslateText></h3>
                                    <ul style={{ paddingLeft: "20px", color: "#333", lineHeight: 1.8, fontSize: "13px" }}>
                                        {selectedCrop.steps.map((step, idx) => <li key={idx}><TranslateText>{step}</TranslateText></li>)}
                                    </ul>
                                </>
                            )}

                            {selectedCrop.common_mistakes && selectedCrop.common_mistakes.length > 0 && (
                                <>
                                    <h3 style={{ color: "#e65100", margin: "16px 0 8px" }}><TranslateText>⚠️ 常见错误</TranslateText></h3>
                                    <ul style={{ paddingLeft: "20px", color: "#333", lineHeight: 1.8, fontSize: "13px" }}>
                                        {selectedCrop.common_mistakes.map((m, idx) => <li key={idx}><TranslateText>{m}</TranslateText></li>)}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
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

const modalStyle = {
    backgroundColor: "#fff",
    padding: "28px 28px 24px",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    position: "relative",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
};

const closeBtnStyle = {
    position: "absolute",
    top: "14px",
    right: "14px",
    padding: "0",
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
