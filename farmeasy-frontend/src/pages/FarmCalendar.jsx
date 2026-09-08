import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarCheck, CheckCircle2, Loader2, MapPin, Sprout, SquarePen } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/useAuth";
import { getFarmTasks } from "../services/agriService";

const TASK_TYPES = {
  pest: "病虫防控",
  fertilizer: "水肥管理",
  field: "田间管理",
  harvest: "收获管理",
};

const PRIORITY_STYLES = {
  high: "border-red-200 bg-red-50 text-red-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-gray-200 bg-gray-50 text-gray-600",
};

export default function FarmCalendarPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    let active = true;
    async function load() {
      try {
        const result = await getFarmTasks();
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [isAuthenticated, navigate]);

  const groupedTasks = useMemo(() => {
    const groups = new Map();
    (data?.tasks || []).forEach((task) => {
      if (!groups.has(task.suggested_date)) groups.set(task.suggested_date, []);
      groups.get(task.suggested_date).push(task);
    });
    return Array.from(groups.entries());
  }, [data]);

  return (
    <div className="min-h-screen bg-[#f6f7f6]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <CalendarCheck size={22} />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">农事日历</h1>
                <p className="mt-1 text-sm text-gray-600">根据位置、作物和生育期生成的主动提醒。</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/farm-profile")}
              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
            >
              <SquarePen className="h-4 w-4" />调整档案
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />正在读取农事安排...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
              <p>{error}</p>
              <button
                onClick={() => navigate("/farm-profile")}
                className="mt-4 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                先完善农事档案
              </button>
            </div>
          ) : (
            <>
              {data?.profile && (
                <div className="mt-7 grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-4">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-600" />{data.profile.province}{data.profile.city ? ` · ${data.profile.city}` : ""}</span>
                  <span className="flex items-center gap-2"><Sprout className="h-4 w-4 text-green-600" />{CROP_LABELS[data.profile.main_crop] || data.profile.main_crop}</span>
                  <span>生育期：{STAGE_LABELS[data.profile.growth_stage] || data.profile.growth_stage}</span>
                  <span>面积：{data.profile.planting_area} 亩</span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => navigate("/pest-diagnosis")} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">
                  拍照诊断病虫
                </button>
                <button onClick={() => navigate("/subsidy-match")} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-green-200 hover:text-green-700">
                  匹配惠农补贴
                </button>
              </div>

              <section className="mt-8 space-y-6">
                {groupedTasks.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
                    未来 15 天暂无待办农事。
                  </p>
                )}
                {groupedTasks.map(([dateText, tasks]) => (
                  <div key={dateText}>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      {dateText}
                      <span className="text-gray-400">· {tasks.length} 项</span>
                    </div>
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <article key={task.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low}`}>
                              {task.priority === "high" ? "高优先" : task.priority === "medium" ? "中优先" : "低优先"}
                            </span>
                            <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{TASK_TYPES[task.task_type] || task.task_type}</span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-gray-600">{task.description}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const CROP_LABELS = {
  rice: "水稻", wheat: "小麦", corn: "玉米", soybean: "大豆", vegetable: "蔬菜", fruit: "果树",
};
const STAGE_LABELS = {
  seedling: "苗期", vegetative: "分蘖/拔节期", flowering: "孕穗/抽穗期", grain_filling: "灌浆/成熟期", harvest: "收获期",
};
