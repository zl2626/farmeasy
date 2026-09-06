import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ZhinongLogo from "../assets/Logo.png";
import terraceImage from "../assets/gallery/terrace.jpg";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  return <main className="landing" style={{ backgroundImage: `url(${terraceImage})` }}>
    <div className="landing__shade" aria-hidden="true" />
    <div className="landing__content">
      <img src={ZhinongLogo} alt="智农" className="landing__logo" />
      <p className="landing__kicker">面向中国农事场景的知识服务平台</p>
      <h1>智农</h1>
      <p className="landing__summary">查作物、看政策、问农事。信息来源与数据状态清楚标注，重要生产决策请结合属地农技指导。</p>
      <button className="landing__button" type="button" onClick={() => navigate("/home")}>进入平台 <ArrowRight size={19} aria-hidden="true" /></button>
      <div className="landing__trust"><ShieldCheck size={17} aria-hidden="true" /> 广西龙脊梯田实景 · 图片来源与许可可查</div>
    </div>
    <a className="landing__credit" href="https://commons.wikimedia.org/wiki/File:Terrace_field_guangxi_longji_china.jpg" target="_blank" rel="noreferrer">摄影：Molluo · CC BY-SA 3.0</a>
  </main>;
}
