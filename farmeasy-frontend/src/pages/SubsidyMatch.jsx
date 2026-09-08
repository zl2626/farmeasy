import { useState } from "react";
import { BadgeDollarSign, Calculator, FileText, Loader2, MapPin, Sprout } from "lucide-react";
import Navbar from "../components/Navbar";
import { matchSubsidies } from "../services/agriService";

const CROPS = [
  { value: "rice", label: "水稻" }, { value: "wheat", label: "小麦" }, { value: "corn", label: "玉米" },
  { value: "soybean", label: "大豆" }, { value: "vegetable", label: "蔬菜" }, { value: "fruit", label: "果树" },
];
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100";

export default function SubsidyMatchPage() {
  const [form, setForm] = useState({ crop: "rice", area: "50", needs_machine: false, contracted_land: true });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await matchSubsidies({ ...form, area: Number(form.area) });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f6]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700"><Calculator size={22} /></span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">政策补贴匹配</h1>
              <p className="mt-1 text-sm text-gray-600">输入地块信息，自动生成可申报政策和材料清单。</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">作物
              <div className="relative mt-1.5">
                <Sprout className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                <select className={`${inputClass} pl-9`} value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}>
                  {CROPS.map((crop) => <option key={crop.value} value={crop.value}>{crop.label}</option>)}
                </select>
              </div>
            </label>
            <label className="block text-sm font-medium text-gray-700">地块面积（亩）
              <input type="number" min="0.1" step="0.1" required className={`${inputClass} mt-1.5`} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 accent-green-600" checked={form.needs_machine} onChange={(e) => setForm({ ...form, needs_machine: e.target.checked })} />
              计划购置农机
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4 accent-green-600" checked={form.contracted_land} onChange={(e) => setForm({ ...form, contracted_land: e.target.checked })} />
              存在流转土地
            </label>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-70 sm:col-span-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}开始匹配
            </button>
          </form>

          {result && (
            <section className="mt-8">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <p className="flex items-center gap-2 text-sm text-green-700"><BadgeDollarSign className="h-4 w-4" />初步估算可申报区间</p>
                <p className="mt-2 text-2xl font-bold text-green-800">￥{result.estimated_total?.[0]?.toLocaleString()} - ￥{result.estimated_total?.[1]?.toLocaleString()}</p>
              </div>

              <div className="mt-5 space-y-4">
                {result.items?.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-green-700">￥{item.estimated_amount?.[0]?.toLocaleString()} - ￥{item.estimated_amount?.[1]?.toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{item.condition}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FileText className="h-4 w-4 text-green-600" />申报材料</h4>
                        <ul className="mt-2 space-y-2 text-sm text-gray-600">
                          {item.documents?.map((doc) => <li key={doc} className="rounded-xl bg-gray-50 px-3 py-2">{doc}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><MapPin className="h-4 w-4 text-green-600" />申报流程</h4>
                        <ol className="mt-2 space-y-2 text-sm text-gray-600">
                          {item.steps?.map((step, index) => <li key={step} className="rounded-xl bg-gray-50 px-3 py-2">{index + 1}. {step}</li>)}
                        </ol>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">{result.disclaimer}</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
