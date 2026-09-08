import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Database,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import API_BASE_URL from "../services/api";
import TranslateText from "../components/TranslateText";
import { COMMODITY_NAMES, PAGE_SIZE, PROVINCES, DEFAULT_COMMODITY } from "../data/marketData";

function formatPrice(value) {
  if (value === null || value === undefined) return "--";
  return Number(value).toFixed(2);
}

function MarketPriceCard({ record, onSelect }) {
  const change = record.change;
  const changeLabel = change === null || change === undefined ? "持平/未更新" : `${change >= 0 ? "+" : ""}${Number(change).toFixed(2)}`;
  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : TrendingUp;

  return (
    <button
      type="button"
      onClick={() => onSelect(record)}
      className="group h-full w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-green-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{record.market}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {record.province}
          </p>
        </div>
        <span className="rounded-full border border-green-100 bg-white px-2 py-1 text-xs font-medium text-green-700">
          {record.commodity}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            ¥{formatPrice(record.price)}
            <span className="ml-1 text-xs font-normal text-gray-500">/{record.unit || "公斤"}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">官方批发价</p>
        </div>
        {record.status === "quoted" ? (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            change > 0 ? "bg-red-50 text-red-600" : change < 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
          }`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {changeLabel}
          </span>
        ) : (
          <span className="rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-500">今日未报价</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-3 text-xs text-gray-400">
        <Calendar className="h-3.5 w-3.5" />
        <span>{record.report_date || "官方今日未报价"}</span>
      </div>
    </button>
  );
}

function OfficialDetailModal({ record, allRecords, onClose }) {
  const sameCommodity = useMemo(
    () => allRecords.filter((item) => item.commodity === record.commodity && item.status === "quoted"),
    [allRecords, record.commodity]
  );
  const prices = sameCommodity.map((item) => Number(item.price)).filter(Number.isFinite);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const national = record.average_price ?? record.national_price ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-green-600">{record.commodity}</span>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{record.market}</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {record.province}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">官方批发价</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  ¥{formatPrice(record.price)}
                  <span className="ml-1 text-sm font-normal text-gray-500">/{record.unit || "公斤"}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-xl border border-gray-100 px-3 py-2 text-xs text-gray-600">
                  全国均价：¥{formatPrice(national)}
                </span>
                <span className="rounded-xl border border-gray-100 px-3 py-2 text-xs text-gray-600">
                  市场区间：¥{formatPrice(min)} - ¥{formatPrice(max)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            官方公开接口目前提供各批发市场当日报价。历史价格曲线需要从现在开始每日保存真实快照，系统不再生成模拟走势。
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-100 px-4 py-3 text-xs text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>行情日期：{record.report_date || "官方今日未报价"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketPrices() {
  const [overview, setOverview] = useState({ items: [], date: null, source: "", source_url: ""});
  const [prices, setPrices] = useState({ items: [], unquoted: [] });
  const [selected, setSelected] = useState(null);
  const [commodity, setCommodity] = useState(DEFAULT_COMMODITY);
  const [province, setProvince] = useState("");
  const [search, setSearch] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      try {
        const response = await fetch(`${API_BASE_URL}/education/market-overview/`);
        if (!response.ok) throw new Error("官方行情接口暂时不可用");
        const data = await response.json();
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "官方行情接口暂时不可用");
      }
    }
    loadOverview();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPrices() {
      setPriceLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ commodity });
        if (province) params.set("province", province);
        if (search.trim()) params.set("query", search.trim());
        const response = await fetch(`${API_BASE_URL}/education/market-prices/?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "官方行情接口暂时不可用");
        if (!cancelled) {
          setPrices(data);
          setSelected(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "官方行情接口暂时不可用");
          setPrices({ items: [], unquoted: [] });
        }
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    }
    loadPrices();
    return () => { cancelled = true; };
  }, [commodity, province, search]);

  const overviewByCommodity = useMemo(() => {
    const map = new Map();
    (overview.items || []).forEach((item) => map.set(item.name, item));
    return map;
  }, [overview.items]);

  const allRecords = useMemo(
    () => [...(prices.items || []), ...(prices.unquoted || [])].map((item) => ({
      ...item,
      ...overviewByCommodity.get(item.commodity),
      market: item.market,
      province: item.province,
      price: item.price,
      status: item.status,
    })),
    [prices, overviewByCommodity]
  );

  const visibleRecords = allRecords.slice(0, PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#f6f7f6]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">市场行情</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              数据来自农业农村部全国农产品批发市场价格信息系统，展示官方当日报价。今日无报价的市场会明确标出。
            </p>
          </div>
          <a
            href={overview.source_url || "https://pfsc.agri.cn/"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition hover:border-green-200 hover:text-green-700"
          >
            <ExternalLink className="h-4 w-4" />
            查看官方系统
          </a>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-gray-500">农产品</label>
            <select
              value={commodity}
              onChange={(event) => setCommodity(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
            >
              {COMMODITY_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">省份</label>
            <select
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
            >
              <option value="">全部省份</option>
              {PROVINCES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500">市场名称</label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="输入批发市场名称"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          <span className="flex items-center gap-2 font-medium text-gray-800">
            <Database className="h-4 w-4 text-green-600" />
            {overview.source || "农业农村部全国农产品批发市场价格信息系统"}
          </span>
          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs">数据日期：{overview.date || "--"}</span>
          <button
            type="button"
            onClick={() => {
              setOverview((prev) => ({ ...prev, items: [] }));
              window.location.reload();
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-green-200 hover:text-green-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新官方数据
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {commodity} · 官方当日报价
          </h2>
          <span className="text-sm text-gray-500">
            {priceLoading ? "获取中..." : `${visibleRecords.length} / ${allRecords.length} 个市场`}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {priceLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-2xl border border-gray-100 bg-white" />
              ))
            : visibleRecords.map((record) => (
                <MarketPriceCard key={`${record.market_id}-${record.commodity}`} record={record} onSelect={setSelected} />
              ))}
        </div>

        {!priceLoading && !allRecords.length && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            官方数据中暂无匹配市场。可调整省份或市场名称后重试。
          </div>
        )}

        {selected && (
          <OfficialDetailModal
            record={selected}
            allRecords={allRecords}
            onClose={() => setSelected(null)}
          />
        )}

        <p className="mt-8 rounded-2xl bg-white p-4 text-xs leading-relaxed text-gray-500">
          数据来源：{overview.source || "农业农村部全国农产品批发市场价格信息系统"}（{overview.source_url || "https://pfsc.agri.cn/"}）。
          价格为官方公开批发报价，仅用于信息展示，不作为交易或定价依据。
        </p>
      </main>
    </div>
  );
}

export default MarketPrices;
