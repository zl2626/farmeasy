import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import TranslateText from "../components/TranslateText";
import DomeGallery from "../components/DomeGallery";
import FarmGallery from "../components/FarmGallery";
import AgriNewsSection from "../components/AgriNewsSection";
import ServicesSection from "../components/ServicesSection";
import SolutionsSection from "../components/SolutionsSection";
import TestimonialsSection from "../components/TestimonialsSection";
import BlogSection from "../components/BlogSection";

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <Navbar />

      {/* Hero — DomeGallery */}
      <section
        style={{
          marginTop: "72px",
          padding: 0,
          height: "calc(100dvh - 72px)",
          width: "100%",
        }}
      >
        <DomeGallery
          fit={isMobile ? 0.95 : 0.8}
          minRadius={isMobile ? 320 : 600}
          maxVerticalRotationDeg={0}
          segments={isMobile ? 20 : 34}
          dragDampening={2}
          grayscale={false}
          overlayBlurColor="#14532d"
        />
      </section>

      {/* Welcome Banner */}
      <section
        className="w-full py-20 md:py-28 px-4 text-center"
        style={{ background: "#ffffc5" }}
      >
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4"
          style={{ color: "#15803d" }}
        >
          <TranslateText>欢迎来到</TranslateText> <span style={{ color: "#4caf50" }}>智农</span> 🌱
        </h1>
        <p className="text-base md:text-lg max-w-2xl mx-auto text-gray-600 leading-relaxed">
          <TranslateText>您的 AI 智慧农业伙伴——咨询作物问题、查看历史价格参考、了解政府惠农政策，安心增产增收。</TranslateText>
        </p>
      </section>

      {/* 大美中国农业 — 实景图轮播 */}
      <FarmGallery />

      {/* 中国农业新闻 */}
      <AgriNewsSection />

      {/* New Sections */}
      <ServicesSection />
      <SolutionsSection />
      <TestimonialsSection />
      <BlogSection />
    </>
  );
}
