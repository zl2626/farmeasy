import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Landmark, Search } from "lucide-react";
import Navbar from "../components/Navbar";
import PageState from "../components/PageState";
import { api } from "../services/api";
import "./DataPages.css";

export default function AgriSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const load = async () => {
    setStatus("loading");
    try { setSchemes((await api.get("/education/agri-schemes/")) || []); setStatus("ready"); }
    catch (err) { setError(err.message || "政策资料暂时无法加载。"); setStatus("error"); }
  };
  useEffect(() => {
    let active = true;
    api.get("/education/agri-schemes/")
      .then((response) => { if (active) { setSchemes(response || []); setStatus("ready"); } })
      .catch((err) => { if (active) { setError(err.message || "政策资料暂时无法加载。"); setStatus("error"); } });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => {
    const word = query.trim().toLowerCase();
    return schemes.filter((s) => !word || [s.name, s.description, s.category, s.applicable_region, s.issuing_authority].some((v) => String(v || "").toLowerCase().includes(word)));
  }, [query, schemes]);

  return <div className="app-page"><Navbar /><main className="page-shell">
    <header className="page-heading"><p className="page-heading__eyebrow">政策服务</p><h1>惠农政策</h1><p>集中查看支持对象、申报条件与办理材料。政策会随地区和年度调整，申报前请以主管部门最新通知为准。</p></header>
    <div className="data-notice" role="note"><Landmark size={20} aria-hidden="true" /><span>本页为项目内置政策资料快照，不替代政府部门正式文件或属地审核意见。</span></div>
    <div className="surface scheme-search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="scheme-search">搜索政策</label><input id="scheme-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索政策名称、地区或发布部门" /></div>
    {status === "loading" && <PageState type="loading" title="正在读取政策资料" />}
    {status === "error" && <PageState type="error" title="政策资料加载失败" description={error} actionLabel="重新加载" onAction={load} />}
    {status === "ready" && !filtered.length && <PageState title="未找到相关政策" description="请尝试更简短的关键词。" />}
    {status === "ready" && <div className="scheme-list">{filtered.map((scheme) => {
      const isOpen = expanded === scheme.id;
      return <article className="surface scheme-item" key={scheme.id}><div className="scheme-item__header"><div><div className="scheme-item__meta">{scheme.category || "综合政策"} · {scheme.applicable_region || "全国或以属地通知为准"}</div><h2>{scheme.name}</h2><p>{scheme.description}</p></div><button className="secondary-button scheme-toggle" type="button" aria-expanded={isOpen} aria-controls={`scheme-${scheme.id}`} onClick={() => setExpanded(isOpen ? null : scheme.id)}>{isOpen ? "收起" : "查看详情"}<ChevronDown size={17} className={isOpen ? "rotate-180" : ""} /></button></div>
      {isOpen && <div className="scheme-detail" id={`scheme-${scheme.id}`}><dl><div><dt>发布部门</dt><dd>{scheme.issuing_authority || "以正式文件为准"}</dd></div><div><dt>申请条件</dt><dd>{scheme.eligibility || "请咨询属地主管部门"}</dd></div><div><dt>支持内容</dt><dd>{scheme.benefits || "以正式文件为准"}</dd></div><div><dt>截止时间</dt><dd>{scheme.deadline || "以当地通知为准"}</dd></div></dl>
      {!!scheme.documents?.length && <section><h3>所需材料</h3><ul>{scheme.documents.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      {!!scheme.how_to_apply?.length && <section><h3>办理流程</h3><ol>{scheme.how_to_apply.map((item) => <li key={item}>{item}</li>)}</ol></section>}
      {(scheme.source_url || scheme.official_link) && <a className="source-link" href={scheme.source_url || scheme.official_link} target="_blank" rel="noreferrer">查看来源文件 <ExternalLink size={15} aria-hidden="true" /></a>}</div>}</article>;
    })}</div>}
  </main></div>;
}
