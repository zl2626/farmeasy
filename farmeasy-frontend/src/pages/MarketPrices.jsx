import { useEffect, useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import PageState from "../components/PageState";
import { api } from "../services/api";

const initialFilters = { province: "", city: "", commodity: "", keyword: "" };
const unique = (records, key, filter = () => true) => [...new Set(records.filter(filter).map((item) => item[key]).filter(Boolean))].sort();

export default function MarketPrices() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ records: [], meta: null });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const load = async () => {
    setStatus("loading");
    setError("");
    try {
      const response = await api.get("/education/market-prices/");
      setData({ records: response?.records || [], meta: response?.meta || null });
      setStatus("ready");
    } catch (err) {
      setError(err.message || "行情数据暂时无法加载。");
      setStatus("error");
    }
  };

  useEffect(() => {
    let active = true;
    api.get("/education/market-prices/")
      .then((response) => { if (active) { setData({ records: response?.records || [], meta: response?.meta || null }); setStatus("ready"); } })
      .catch((err) => { if (active) { setError(err.message || "行情数据暂时无法加载。"); setStatus("error"); } });
    return () => { active = false; };
  }, []);
  const provinces = useMemo(() => unique(data.records, "province"), [data.records]);
  const cities = useMemo(() => unique(data.records, "city", (r) => !filters.province || r.province === filters.province), [data.records, filters.province]);
  const commodities = useMemo(() => unique(data.records, "commodity"), [data.records]);
  const records = useMemo(() => {
    const word = filters.keyword.trim().toLowerCase();
    return data.records.filter((r) =>
      (!filters.province || r.province === filters.province) &&
      (!filters.city || r.city === filters.city) &&
      (!filters.commodity || r.commodity === filters.commodity) &&
      (!word || [r.market, r.city, r.commodity].some((v) => String(v).toLowerCase().includes(word)))
    );
  }, [data.records, filters]);
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === "province" ? { city: "" } : {}) }));

  return <div className="app-page"><Navbar /><main className="page-shell">
    <header className="page-heading"><p className="page-heading__eyebrow">农产品行情</p><h1>市场价格查询</h1><p>按地区、市场和品类查看行情快照。正式接入官方接口后，本页筛选方式和访问地址保持不变。</p></header>
    {data.meta && <div className="data-notice" role="note"><Database size={20} aria-hidden="true" /><div><strong>当前为非实时演示快照</strong><br />{data.meta.notice} 快照日期：{data.meta.snapshot_date}；来源：{data.meta.source}。</div></div>}
    <section className="surface filter-bar" aria-label="行情筛选">
      <div className="field"><label htmlFor="province">省份</label><select id="province" value={filters.province} onChange={(e) => updateFilter("province", e.target.value)}><option value="">全部省份</option>{provinces.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div className="field"><label htmlFor="city">城市</label><select id="city" value={filters.city} disabled={!filters.province} onChange={(e) => updateFilter("city", e.target.value)}><option value="">全部城市</option>{cities.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div className="field"><label htmlFor="commodity">品类</label><select id="commodity" value={filters.commodity} onChange={(e) => updateFilter("commodity", e.target.value)}><option value="">全部品类</option>{commodities.map((v) => <option key={v}>{v}</option>)}</select></div>
      <div className="field"><label htmlFor="market-keyword">关键词</label><input id="market-keyword" value={filters.keyword} onChange={(e) => updateFilter("keyword", e.target.value)} placeholder="市场、城市或农产品" /></div>
    </section>
    {status === "loading" && <PageState type="loading" title="正在读取行情" description="请稍候。" />}
    {status === "error" && <PageState type="error" title="行情加载失败" description={error} actionLabel="重新加载" onAction={load} />}
    {status === "ready" && records.length === 0 && <PageState title="没有符合条件的行情" description="请清除部分筛选条件后重试。" actionLabel="清除筛选" onAction={() => setFilters(initialFilters)} />}
    {status === "ready" && records.length > 0 && <section className="surface" aria-label="行情结果" style={{ overflow: "hidden" }}><table className="responsive-table"><thead><tr><th>农产品</th><th>市场</th><th>地区</th><th>参考价</th><th>价格区间</th><th>快照日期</th></tr></thead><tbody>{records.map((r, index) => <tr key={`${r.market}-${r.commodity}-${index}`}><td data-label="农产品"><strong>{r.commodity}</strong> <span className="status-pill">{r.category}</span></td><td data-label="市场">{r.market}</td><td data-label="地区">{r.province} {r.city}</td><td data-label="参考价" className="price">{r.modal_price} {r.unit}</td><td data-label="价格区间">{r.min_price} - {r.max_price}</td><td data-label="快照日期">{r.arrival_date}</td></tr>)}</tbody></table></section>}
    {status === "ready" && <button className="secondary-button" style={{ marginTop: 18 }} type="button" onClick={load}><RefreshCw size={16} aria-hidden="true" style={{ display: "inline", marginRight: 7 }} />刷新数据</button>}
  </main></div>;
}
