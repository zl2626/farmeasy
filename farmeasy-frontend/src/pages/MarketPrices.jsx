import { useEffect, useMemo, useState } from "react";
import TranslateText from "../components/TranslateText";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  Tag,
  TrendingUp,
  Calendar,
  Database,
} from "lucide-react";
import {
  PROVINCES,
  CITIES_BY_PROVINCE,
  COMMODITY_NAMES,
  RECORDS,
} from "../data/marketData";

function MarketPrices() {
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [commodity, setCommodity] = useState("");
  const [keyword, setKeyword] = useState("");

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
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [province, city, commodity, keyword]);
  const shownRecords = filteredRecords.slice(0, visible);

  const handleProvinceChange = (v) => {
    setProvince(v);
    setCity("");
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-800 font-sans selection:bg-green-200">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-green-100 border border-green-200 text-green-700">
              <TrendingUp size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-green-800">
                <TranslateText>每日市场价格</TranslateText>
              </h1>
              <p className="text-neutral-500 mt-1">
                <TranslateText>全国主要农产品批发市场行情，覆盖各省及地级市</TranslateText>
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── FILTERS ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8"
        >
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
                title="内置示例行情，接入官方行情接口后自动更新"
              >
                <Database size={12} />
                <TranslateText>本地示例数据</TranslateText>
              </div>
            </div>
          </div>
        </motion.div>

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
                  <div
                    key={`${r.market}-${r.commodity}-${r.arrival_date}-${idx}`}
                    className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-green-200 hover:shadow-xl hover:shadow-green-900/5 transition-all relative overflow-hidden"
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
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <span className="text-gray-400 block mb-1"><TranslateText>最低</TranslateText></span>
                            <span className="font-mono text-gray-700 font-medium">¥{r.min_price}</span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
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
                  </div>
                ))}
              </div>

              {visible < filteredRecords.length && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
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
      </main>
    </div>
  );
}

export default MarketPrices;
