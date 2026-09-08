import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Camera, CheckCircle2, ClipboardList, History, Loader2, Phone, ShieldAlert, ShoppingCart,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import {
  createFollowUp, createPestDiagnosis, getAgriProducts, getFarmProfile, getPestDiagnoses,
} from "../services/agriService";
import { mediaUrl } from "../services/api";

const CROPS = [
  { value: "rice", label: "水稻" }, { value: "wheat", label: "小麦" }, { value: "corn", label: "玉米" },
  { value: "soybean", label: "大豆" }, { value: "vegetable", label: "蔬菜" }, { value: "fruit", label: "果树" },
];
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";
const STATUS_LABELS = { draft: "待确认", pending_review: "转人工复核", treated: "已防治", followed_up: "已回访" };

export default function PestDiagnosisPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ crop: "rice", location: "", symptom: "" });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [profileProvince, setProfileProvince] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [followForm, setFollowForm] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    let active = true;
    async function load() {
      try {
        const [profile, records] = await Promise.all([getFarmProfile(), getPestDiagnoses()]);
        if (!active) return;
        setProfileProvince(profile?.province || "");
        setHistory(records || []);
        if (profile?.province) {
          const items = await getAgriProducts({ province: profile.province });
          if (active) setProducts(items || []);
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    }
    load();
    return () => { active = false; };
  }, [isAuthenticated, navigate]);

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submitDiagnosis = async (event) => {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null); setMessage("");
    try {
      const formData = new FormData();
      formData.append("crop", form.crop);
      formData.append("location", form.location || profileProvince);
      formData.append("symptom", form.symptom);
      if (image) formData.append("image", image);
      const diagnosis = await createPestDiagnosis(formData);
      setResult(diagnosis);
      const records = await getPestDiagnoses();
      setHistory(records || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitFollowUp = async (diagnosisId) => {
    const payload = followForm[diagnosisId] || {};
    setLoading(true); setMessage(""); setError("");
    try {
      await createFollowUp({
        diagnosis: diagnosisId,
        treatment_date: payload.treatment_date || new Date().toISOString().slice(0, 10),
        product_name: payload.product_name || "未记录",
        effect_score: Number(payload.effect_score || 3),
        loss_avoided: Number(payload.loss_avoided || 0),
        note: payload.note || "",
      });
      const records = await getPestDiagnoses();
      setHistory(records || []);
      setExpandedId(null);
      setMessage("回访已记录，系统开始沉淀防治效果数据。");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedProducts = useMemo(() => {
    return products.filter((item) => item.category === "pesticide" || item.category === "tool");
  }, [products]);

  return (
    <div className="min-h-screen bg-[#f6f7f6]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Camera size={22} /></span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">病虫害诊断闭环</h1>
            <p className="mt-1 text-sm text-gray-600">症状输入 → RAG 检索农业知识库 → DeepSeek 生成建议 → 安全规则过滤。</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><ClipboardList className="h-5 w-5 text-green-600" />输入症状并诊断</h2>
            <form onSubmit={submitDiagnosis} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">现场照片</span>
                <div className="mt-1.5 flex items-center gap-3">
                  {preview ? <img src={preview} alt="诊断照片预览" className="h-20 w-20 rounded-xl border border-gray-200 object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-400"><Camera className="h-6 w-6" /></span>}
                  <input type="file" accept="image/*" onChange={handleImage} className="text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-green-700" />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">作物</span>
                <select className={`${inputClass} mt-1.5`} value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                  {CROPS.map((crop) => <option key={crop.value} value={crop.value}>{crop.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">位置</span>
                <input className={`${inputClass} mt-1.5`} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={profileProvince || "例如：武汉市"} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">症状描述</span>
                <textarea rows={4} className={`${inputClass} mt-1.5`} value={form.symptom} onChange={(e) => setForm({ ...form, symptom: e.target.value })} placeholder="例如：水稻叶片有黄褐色斑点，多雨后扩展，先从下部叶片发生。" />
              </label>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-70">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}提交诊断
              </button>
            </form>
          </section>

          <div className="space-y-5">
            {result && (
              <section className={`rounded-3xl border bg-white p-6 shadow-sm ${result.needs_human_review ? "border-amber-200" : "border-green-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">诊断结果</h2>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">置信度 {Math.round((result.confidence || 0) * 100)}%</span>
                </div>
                <p className="mt-3 text-xl font-semibold text-gray-900">{result.diagnosis}</p>
                <p className="mt-1 text-sm text-gray-600">严重程度：{SEVERITY_LABELS[result.severity] || result.severity}</p>
                {result.region_note && (
                  <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">{result.region_note}</p>
                )}
                {result.rag_sources?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500">RAG 检索依据</p>
                    <div className="mt-2 space-y-2">
                      {result.rag_sources.map((source, index) => (
                        <div key={`${source.source}-${index}`} className="rounded-2xl bg-gray-50 px-4 py-3">
                          <p className="text-xs font-semibold text-gray-700">
                            {source.source}{source.category ? ` · ${source.category}` : ""} · 相关度 {Math.round((source.score || 0) * 100)}%
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{source.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.needs_human_review ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><ShieldAlert className="h-4 w-4" />已转人工专家复核</p>
                    <p className="mt-2 text-sm leading-6 text-amber-800">{result.review_reason || "信息不足，先由人工确认。"}</p>
                  </div>
                ) : (
                  <ul className="mt-5 space-y-2">
                    {(result.treatment_plan || []).map((item, index) => (
                      <li key={index} className="flex gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />{item}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">引擎：{result.diagnosis_engine || "本地规则"}</span>
                  {result.model_name && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">模型：{result.model_name}</span>}
                  {result.safety_filter && <span className="rounded-full bg-green-50 px-3 py-1 text-xs text-green-700">安全过滤：{result.safety_filter}</span>}
                </div>
                {result.degradation_reason && (
                  <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">{result.degradation_reason}</p>
                )}
                <p className="mt-4 flex gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{result.safety_boundary}
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><ShoppingCart className="h-5 w-5 text-green-600" />本地农资对接</h2>
                {profileProvince && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">{profileProvince}</span>}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {groupedProducts.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-500 sm:col-span-2">当前区域暂未接入农资店库存。</p>
                ) : groupedProducts.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-900">{product.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{product.spec} · 成分：{product.active_ingredient || "未标注"}</p>
                    <p className="mt-3 text-sm text-green-700">￥{Number(product.price).toFixed(2)}/{product.unit}</p>
                    <p className="mt-1 text-xs text-gray-500">库存 {Number(product.stock)} {product.unit} · {product.store.name}</p>
                    <p className="mt-3 flex items-center gap-2 text-xs text-gray-500"><Phone className="h-3.5 w-3.5" />{product.store.phone || "电话待补充"}</p>
                    {product.is_restricted && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700">限用/受控农资</p>}
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900"><History className="h-5 w-5 text-green-600" />诊断与回访记录</h2>
              {message && <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
              <div className="mt-5 space-y-3">
                {history.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-500">暂无诊断记录。</p>
                ) : history.map((record) => (
                  <article key={record.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{record.diagnosis}</h3>
                        <p className="mt-1 text-xs text-gray-500">{record.created_at?.slice(0, 10)} · {STATUS_LABELS[record.status] || record.status} · 置信度 {Math.round((record.confidence || 0) * 100)}%</p>
                      </div>
                      <span className="text-xs text-green-700">{expandedId === record.id ? "收起" : "回访"}</span>
                    </button>
                    {expandedId === record.id && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        {record.image && <img src={mediaUrl(record.image)} alt="历史诊断照片" className="h-32 w-32 rounded-xl border border-gray-200 object-cover" />}
                        <p className="mt-3 text-sm text-gray-600">{record.symptom}</p>
                        {record.follow_up ? (
                          <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                            <p>防治日期：{record.follow_up.treatment_date}</p>
                            <p>使用产品：{record.follow_up.product_name}</p>
                            <p>效果评分：{record.follow_up.effect_score}/5</p>
                            <p>挽回损失估算：￥{Number(record.follow_up.loss_avoided).toLocaleString()}</p>
                            {record.follow_up.note && <p className="mt-2 text-gray-600">{record.follow_up.note}</p>}
                          </div>
                        ) : (
                          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); submitFollowUp(record.id); }}>
                            <label className="block text-sm text-gray-700">防治日期<input type="date" required className={`${inputClass} mt-1.5`} value={followForm[record.id]?.treatment_date || ""} onChange={(e) => setFollowForm({ ...followForm, [record.id]: { ...(followForm[record.id] || {}), treatment_date: e.target.value } })} /></label>
                            <label className="block text-sm text-gray-700">使用产品<input required className={`${inputClass} mt-1.5`} value={followForm[record.id]?.product_name || ""} onChange={(e) => setFollowForm({ ...followForm, [record.id]: { ...(followForm[record.id] || {}), product_name: e.target.value } })} /></label>
                            <label className="block text-sm text-gray-700">效果评分（1-5）<input type="number" min="1" max="5" required className={`${inputClass} mt-1.5`} value={followForm[record.id]?.effect_score || "3"} onChange={(e) => setFollowForm({ ...followForm, [record.id]: { ...(followForm[record.id] || {}), effect_score: e.target.value } })} /></label>
                            <label className="block text-sm text-gray-700">挽回损失估算（元）<input type="number" min="0" step="0.01" className={`${inputClass} mt-1.5`} value={followForm[record.id]?.loss_avoided || "0"} onChange={(e) => setFollowForm({ ...followForm, [record.id]: { ...(followForm[record.id] || {}), loss_avoided: e.target.value } })} /></label>
                            <label className="block text-sm text-gray-700 sm:col-span-2">备注<textarea rows={2} className={`${inputClass} mt-1.5`} value={followForm[record.id]?.note || ""} onChange={(e) => setFollowForm({ ...followForm, [record.id]: { ...(followForm[record.id] || {}), note: e.target.value } })} /></label>
                            <button type="submit" disabled={loading} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-70 sm:col-span-2">提交回访</button>
                          </form>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

const SEVERITY_LABELS = { mild: "轻度", medium: "中度", severe: "重度" };
