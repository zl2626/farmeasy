import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Bot, Landmark, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import DomeGallery from "../components/DomeGallery";
import { galleryImageManifest } from "../data/imageManifest";
import "./Homepage.css";

const services = [
  { to: "/crops", title: "查作物", description: "查看生长条件、适宜季节与水肥管理资料。", icon: <BookOpen aria-hidden="true" /> },
  { to: "/market-prices", title: "看行情", description: "筛选演示行情快照，清楚区分非实时数据。", icon: <LineChart aria-hidden="true" /> },
  { to: "/agri-schemes", title: "找政策", description: "查询申请条件、支持内容和办理材料。", icon: <Landmark aria-hidden="true" /> },
  { to: "/chatbot", title: "问农事", description: "结合本地知识库咨询种植与病虫害问题。", icon: <Bot aria-hidden="true" /> },
];

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const timerRef = useRef(null);
  useEffect(() => {
    const handleResize = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setIsMobile(window.innerWidth <= 768), 150);
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); clearTimeout(timerRef.current); };
  }, []);

  return <div className="home-page"><Navbar />
    <section className="home-gallery" aria-label="中国农业影像">
      <DomeGallery fit={isMobile ? 0.95 : 0.8} minRadius={isMobile ? 320 : 600} segments={isMobile ? 20 : 34} dragDampening={2} grayscale={false} overlayBlurColor="#1d5138" />
    </section>
    <main>
      <section className="home-intro">
        <div><p className="home-kicker">智农农业服务平台</p><h1>把农事资料放到手边</h1></div>
        <p>从作物知识、惠农政策到行情快照与智能问答，所有入口按实际农事任务组织。涉及生产经营决策时，请结合当地农技人员意见和主管部门最新文件。</p>
      </section>
      <section className="home-services" aria-label="主要服务">
        {services.map(({ to, title, description, icon }) => <Link className="home-service" to={to} key={to}>{icon}<div><h2>{title}</h2><p>{description}</p></div><ArrowRight className="home-service__arrow" aria-hidden="true" /></Link>)}
      </section>
      <footer className="home-attribution"><details><summary>首页图片来源与许可</summary><ul>{galleryImageManifest.map((image) => <li key={image.file}><a href={image.source} target="_blank" rel="noreferrer">{image.title}</a>，{image.location}，摄影：{image.author}，{image.license}</li>)}</ul></details></footer>
    </main>
  </div>;
}
