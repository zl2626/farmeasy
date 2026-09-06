import { useEffect, useMemo, useState } from "react";
import { BookOpen, Droplets, ImageOff, Search, Sprout, X } from "lucide-react";
import Navbar from "../components/Navbar";
import PageState from "../components/PageState";
import { api, mediaUrl } from "../services/api";
import "./CropList.css";

export default function CropList() {
  const [crops, setCrops] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [brokenImages, setBrokenImages] = useState({});

  const load = async () => {
    setStatus("loading");
    try { setCrops((await api.get("/education/crops/")) || []); setStatus("ready"); }
    catch (err) { setError(err.message || "作物资料暂时无法加载。"); setStatus("error"); }
  };
  useEffect(() => {
    let active = true;
    api.get("/education/crops/")
      .then((response) => { if (active) { setCrops(response || []); setStatus("ready"); } })
      .catch((err) => { if (active) { setError(err.message || "作物资料暂时无法加载。"); setStatus("error"); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selected) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected]);

  const categories = useMemo(() => [...new Set(crops.map((c) => c.category).filter(Boolean))].sort(), [crops]);
  const filtered = useMemo(() => {
    const word = query.trim().toLowerCase();
    return crops.filter((crop) => (!category || crop.category === category) && (!word || [crop.name, crop.scientific_name, crop.aliases, crop.description].some((value) => String(value || "").toLowerCase().includes(word))));
  }, [category, crops, query]);
  const isVerifiedImage = (crop) => crop.image && crop.image_status === "verified" && !brokenImages[crop.id];

  return <div className="app-page"><Navbar /><main className="page-shell">
    <header className="page-heading"><p className="page-heading__eyebrow">农业知识库</p><h1>作物百科</h1><p>查找作物生长条件、适宜季节和水肥管理要点。图片仅在物种和来源均核验后展示。</p></header>
    <section className="surface crop-toolbar" aria-label="作物筛选">
      <div className="crop-search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="crop-search">搜索作物</label><input id="crop-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索作物名称、别名或学名" /></div>
      <div className="field"><label className="sr-only" htmlFor="crop-category">作物类别</label><select id="crop-category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">全部类别</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    </section>
    {status === "loading" && <PageState type="loading" title="正在读取作物资料" />}
    {status === "error" && <PageState type="error" title="作物资料加载失败" description={error} actionLabel="重新加载" onAction={load} />}
    {status === "ready" && !filtered.length && <PageState title="未找到相关作物" description="请尝试作物常用名称或清除类别筛选。" />}
    {status === "ready" && <div className="crop-grid">{filtered.map((crop) => <article className="surface crop-card" key={crop.id}>
      <div className="crop-card__media">
        {isVerifiedImage(crop) ? <img src={mediaUrl(crop.image)} alt={`${crop.name}实物照片`} loading="lazy" onError={() => setBrokenImages((current) => ({ ...current, [crop.id]: true }))} /> : <div className="crop-placeholder" role="img" aria-label={`${crop.name}暂无已核验图片`}><ImageOff aria-hidden="true" /><span>暂无已核验图片</span></div>}
      </div>
      <div className="crop-card__body"><div className="crop-card__meta">{crop.category || "其他作物"}</div><h2>{crop.name}</h2>{crop.scientific_name && <p className="crop-scientific">{crop.scientific_name}</p>}<p className="crop-summary">{crop.description || "资料正在持续完善。"}</p><button className="secondary-button" type="button" onClick={() => setSelected(crop)}>查看种植要点</button></div>
    </article>)}</div>}
  </main>
  {selected && <div className="crop-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="crop-modal surface" role="dialog" aria-modal="true" aria-labelledby="crop-dialog-title"><button className="crop-modal__close" type="button" aria-label="关闭作物详情" onClick={() => setSelected(null)}><X /></button><div className="crop-modal__heading"><Sprout aria-hidden="true" /><div><div className="crop-card__meta">{selected.category || "作物资料"}</div><h2 id="crop-dialog-title">{selected.name}</h2></div></div><p>{selected.description || "暂无详细简介。"}</p><dl><div><dt><BookOpen size={16} />土壤</dt><dd>{selected.soil || "暂无资料"}</dd></div><div><dt>气候</dt><dd>{selected.climate || "暂无资料"}</dd></div><div><dt>适宜季节</dt><dd>{selected.season || "暂无资料"}</dd></div><div><dt><Droplets size={16} />水分管理</dt><dd>{selected.water || "暂无资料"}</dd></div></dl>{selected.source_url && <a className="source-link" href={selected.source_url} target="_blank" rel="noreferrer">查看资料来源</a>}</section></div>}
  </div>;
}
