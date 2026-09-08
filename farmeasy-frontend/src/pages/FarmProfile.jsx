import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, MapPin, Sprout, Timer } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { getFarmProfile, saveFarmProfile } from "../services/agriService";
import { PROVINCES } from "../data/marketData";

const CROPS = [
  { value: "rice", label: "水稻" },
  { value: "wheat", label: "小麦" },
  { value: "corn", label: "玉米" },
  { value: "soybean", label: "大豆" },
  { value: "vegetable", label: "蔬菜" },
  { value: "fruit", label: "果树" },
];

const STAGES = [
  { value: "seedling", label: "苗期" },
  { value: "vegetative", label: "分蘖/拔节期" },
  { value: "flowering", label: "孕穗/抽穗期" },
  { value: "grain_filling", label: "灌浆/成熟期" },
  { value: "harvest", label: "收获期" },
];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";

export default function FarmProfilePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    province: "湖北省",
    city: "",
    main_crop: "rice",
    growth_stage: "seedling",
    planting_area: "10",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
    async function load() {
      try {
        const profile = await getFarmProfile();
        if (profile) {
          setForm({
            province: profile.province,
            city: profile.city || "",
            main_crop: profile.main_crop,
            growth_stage: profile.growth_stage,
            planting_area: String(profile.planting_area),
          });
        }
      } catch {
        // New users can complete the profile directly.
      }
    }
    load();
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await saveFarmProfile({ ...form, planting_area: Number(form.planting_area) });
      navigate("/farm-calendar");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f6]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
              <MapPin size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">完善农事档案</h1>
              <p className="mt-1 text-sm text-gray-600">用于生成未来 15 天的主动农事提醒。</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="省份">
                <select className={inputClass} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                  {PROVINCES.map((province) => <option key={province}>{province}</option>)}
                </select>
              </Field>
              <Field label="市/县">
                <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="例如：武汉市" />
              </Field>
              <Field label="作物">
                <div className="relative">
                  <Sprout className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  <select className={`${inputClass} pl-9`} value={form.main_crop} onChange={(e) => setForm({ ...form, main_crop: e.target.value })}>
                    {CROPS.map((crop) => <option key={crop.value} value={crop.value}>{crop.label}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="当前生育期">
                <div className="relative">
                  <Timer className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  <select className={`${inputClass} pl-9`} value={form.growth_stage} onChange={(e) => setForm({ ...form, growth_stage: e.target.value })}>
                    {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="种植面积（亩）">
                <input type="number" min="0.1" step="0.1" className={inputClass} value={form.planting_area} onChange={(e) => setForm({ ...form, planting_area: e.target.value })} />
              </Field>
            </div>

            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              生成我的农事日历
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
