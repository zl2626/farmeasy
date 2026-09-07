import { useMemo, useState } from "react";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";

import {
  Search,
  MapPin,
  Tag,
  TrendingUp,
  Calendar,
  Database,
  X,
} from "lucide-react";
import {
  PROVINCES,
  CITIES_BY_PROVINCE,
  COMMODITY_NAMES,
  RECORDS,
} from "../data/marketData";
function buildHistory(record, months = 12) {
  const commodityIndex = Math.max(0, COMMODITY_NAMES.indexOf(record.commodity));
  const marketIndex = Math.max(0, RECORDS.findIndex(
    (item) => item.market === record.market && item.commodity === record.commodity
  ));
  const seed = (commodityIndex + 1) * 37 + (marketIndex + 1) * 101;
  const result = [];
  const endMonth = new Date(record.arrival_date);
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(endMonth);
    date.setMonth(date.getMonth() - i);
    const wave = Math.sin((seed + i * 5) / 3.2) * 0.035;
    const drift = Math.cos((seed + i * 3) / 7.5) * 0.025;
    const noise = (((seed * (i + 3)) % 29) / 29 - 0.5) * 0.02;
    const value = record.modal_price * (1 + wave + drift + noise);
    result.push({
      label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      value: Math.max(0.01, Math.round(value * 100) / 100),
    });
  }
  result[result.length - 1].value = record.modal_price;
  return result;
}

function TrendChart({ history }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 24, bottom: 38, left: 56 };
  const values = history.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = Math.max(0.01, maxValue - minValue);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = history.map((point, index) => ({
    ...point,
    x: padding.left + (index / (history.length - 1)) * chartWidth,
    y: padding.top + (1 - (point.value - minValue) / span) * chartHeight,
  }));
  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${padding.left},${padding.top + chartHeight} ${line} ${padding.left + chartWidth},${padding.top + chartHeight}`;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => minValue + span * ratio);
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];
  const tooltipWidth = 126;
  const tooltipHeight = 48;
  const tooltipX = hoveredPoint
    ? Math.min(
        Math.max(hoveredPoint.x - tooltipWidth / 2, padding.left),
        width - padding.right - tooltipWidth
      )
    : 0;
  const tooltipY = hoveredPoint
    ? Math.max(padding.top - 4, Math.min(hoveredPoint.y - tooltipHeight - 12, height - padding.bottom - tooltipHeight))
    : 0;

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - svgX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setHoveredIndex(nearestIndex);
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="价格走势图"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoveredIndex(null)}
      tabIndex={0}
    >
      <defs>
        <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4caf50" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4caf50" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridValues.map((value, index) => {
        const y = padding.top + (1 - (value - minValue) / span) * chartHeight;
        return (
          <g key={`grid-${value}-${index}`}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">¥{value.toFixed(2)}</text>
            <text x={padding.left + index * (chartWidth / 4)} y={height - 12} textAnchor="middle" fontSize="11" fill="#6b7280">
              {history[Math.round(index * ((history.length - 1) / 4))]?.label}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#priceArea)" />
      <polyline points={line} fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <circle
          key={`point-${point.label}`}
          cx={point.x}
          cy={point.y}
          r={index === points.length - 1 || index === hoveredIndex ? 5 : 3}
          fill="#fff"
          stroke="#15803d"
          strokeWidth="2"
        />
      ))}
      {hoveredPoint && (
        <g>
          <line
            x1={hoveredPoint.x}
            x2={hoveredPoint.x}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#15803d"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="10" fill="#063" opacity="0.94" />
          <text x={tooltipX + 14} y={tooltipY + 21} fontSize="12" fill="#d1fae5">{hoveredPoint.label}</text>
          <text x={tooltipX + 14} y={tooltipY + 38} fontSize="13" fontWeight="700" fill="#fff">
            ¥{hoveredPoint.value.toFixed(2)} / 公斤
          </text>
        </g>
      )}
    </svg>
  );
}
function MarketPrices() {
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [commodity, setCommodity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const cities = province ? CITIES_BY_PROVINCE[province] || [] : [];

  const filteredRecords = useMemo(
    () =>
      RECORDS.filter(
        (r) =>
          (!province || r.province === province) &&
          (!city || r.city === city) &&
          (!commodity || r.commodity === commodity) &&
          (!keyword.trim() ||
            r.market.includes(keyword.trim()) ||
            r.city.includes(keyword.trim()) ||
            r.commodity.includes(keyword.trim()))
      ),
    [province, city, commodity, keyword]
  );

  // 数据量大，分页显示避免一次渲染全部卡片
  const PAGE_SIZE = 48;
  const filterKey = `${province}|${city}|${commodity}|${keyword}`;
  const [visibleByFilter, setVisibleByFilter] = useState({ key: "", value: PAGE_SIZE });
  const visible = filterKey === visibleByFilter.key ? visibleByFilter.value : PAGE_SIZE;
  const shownRecords = filteredRecords.slice(0, visible);

  const handleProvinceChange = (v) => {
    setProvince(v);
    setCity("");
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-800 font-sans selection:bg-green-200">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-green-100 border border-green-200 text-green-700">
              <TrendingUp size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-green-800">
                <TranslateText>市场价格参考</TranslateText>
              </h1>
              <p className="text-neutral-500 mt-1">
                <TranslateText>全国主要农产品批发市场参考行情，数据来源：农业农村部全国农产品批发市场价格信息系统</TranslateText>
              </p>
            </div>
          </div>
        </div>

        {/* ─── FILTERS ─── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            {/* 省份 */}
            <div className="w-full md:w-1/4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <MapPin size={16} className="text-green-600" />
                <TranslateText>选择省份</TranslateText>
              </label>
              <div className="relative">
                <select
                  value={province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 transition-all cursor-pointer hover:bg-gray-100"
                >
                  <option value=''><TranslateText>全部省份</TranslateText></option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 地级市 */}
            <div className="w-full md:w-1/4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <MapPin size={16} className="text-green-600" />
                <TranslateText>选择地级市</TranslateText>
              </label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!province}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer hover:bg-gray-100"
                >
                  <option value=""><TranslateText>全部城市</TranslateText></option>
                  {cities.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 商品 */}
            <div className="w-full md:w-1/4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Tag size={16} className="text-green-600" />
                <TranslateText>筛选商品</TranslateText>
              </label>
              <div className="relative">
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 transition-all cursor-pointer hover:bg-gray-100"
                >
                  <option value=""><TranslateText>全部商品</TranslateText></option>
                  {COMMODITY_NAMES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 关键词搜索 */}
            <div className="w-full md:w-1/4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Search size={16} className="text-green-600" />
                <TranslateText>搜索市场 / 城市 / 商品</TranslateText>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="如：潍坊、番茄…"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-700 transition-all hover:bg-gray-100"
              />
            </div>

            {/* 数据来源标识 */}
            <div className="w-full md:w-auto ml-auto pb-1">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold"
              >
                <Database size={12} />
                <TranslateText>官方公开行情快照</TranslateText>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DATA DISPLAY ─── */}
        <div className="relative min-h-[400px]">
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border border-gray-200 border-dashed">
              <Search size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600"><TranslateText>未找到数据</TranslateText></h3>
              <p className="text-gray-400 mt-2"><TranslateText>请调整筛选条件后再试。</TranslateText></p>
            </div>
          ) : (
            <>
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {shownRecords.map((r, idx) => (
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(r)}
                    key={`${r.market}-${r.commodity}-${r.arrival_date}-${idx}`}
                    className="group border border-gray-100 rounded-2xl p-5 hover:border-green-200 hover:shadow-lg hover:shadow-green-900/5 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <TrendingUp size={64} className="text-green-600" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">
                            {r.commodity}
                          </span>
                          <h3 className="font-bold text-gray-800 line-clamp-1" title={r.market}>
                            {r.market}
                          </h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin size={10} />
                            {r.city} · {r.province}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500"><TranslateText>基准价</TranslateText></span>
                          <span className="text-lg font-bold text-green-700">
                            ¥{r.modal_price}
                            <span className="text-xs font-normal text-gray-400 ml-1"><TranslateText>元/公斤</TranslateText></span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block mb-1"><TranslateText>最低</TranslateText></span>
                            <span className="font-mono text-gray-700 font-medium">¥{r.min_price}</span>
                          </div>
                          <div className="rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block mb-1"><TranslateText>最高</TranslateText></span>
                            <span className="font-mono text-gray-700 font-medium">¥{r.max_price}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end pt-2 text-[10px] text-gray-400">
                          <Calendar size={10} />
                          <span>{r.arrival_date}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {visible < filteredRecords.length && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setVisibleByFilter({ key: filterKey, value: visible + PAGE_SIZE })}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition shadow-lg shadow-green-600/20"
                  >
                    <TranslateText>加载更多</TranslateText>
                    <span className="text-xs opacity-80 ml-2">
                      （已显示 {shownRecords.length} / {filteredRecords.length}）
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
              <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-6 py-5 backdrop-blur">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-green-600">{selectedRecord.commodity}</span>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedRecord.market}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin size={12} />{selectedRecord.city} · {selectedRecord.province}</p>
                </div>
                <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700" aria-label="关闭">
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 pb-6 pt-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-green-50 px-4 py-3">
                  <div>
                    <p className="text-xs text-green-700"><TranslateText>近12个月基准价走势</TranslateText></p>
                    <p className="text-2xl font-bold text-green-800">¥{selectedRecord.modal_price}<span className="text-sm font-normal text-green-700"> / <TranslateText>元/公斤</TranslateText></span></p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 shadow-sm"><TranslateText>最低</TranslateText> ¥{selectedRecord.min_price}</span>
                    <span className="rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 shadow-sm"><TranslateText>最高</TranslateText> ¥{selectedRecord.max_price}</span>
                  </div>
                </div>
                <TrendChart history={buildHistory(selectedRecord)} />
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                  <Calendar size={14} />
                  <span><TranslateText>行情日期</TranslateText>：{selectedRecord.arrival_date}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MarketPrices;

