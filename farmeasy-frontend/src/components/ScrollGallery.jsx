import { useEffect, useRef } from "react";
import { animate, scroll, cubicBezier } from "motion";
import "../styles/scrollGallery.css";

export default function ScrollGallery({ images = [] }) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const image = wrapperRef.current.querySelector(".scaler img");
    const layers = wrapperRef.current.querySelectorAll(".grid > .layer");

    if (!image) return;

    const naturalWidth = image.offsetWidth;
    const naturalHeight = image.offsetHeight;

    scroll(
      animate(
        image,
        {
          scale: [1.2, 1],
        },
        {
          easing: cubicBezier(0.65, 0, 0.35, 1),
        }
      ),
      {
        target: wrapperRef.current,
        offset: ["start start", "80% end"],
      }
    );

    layers.forEach((layer, index) => {
      scroll(
        animate(
          layer,
          { opacity: [0, 1], scale: [0.8, 1] },
          {
            easing: cubicBezier(0.42, 0, 0.58, 1),
          }
        ),
        {
          target: wrapperRef.current,
          offset: ["30% start", "90% end"],
        }
      );
    });
  }, []);

  if (images.length < 14) return null;

  return (
    <section ref={wrapperRef} className="scroll-wrapper">
      <div className="sticky-content">
        <div className="grid">
          <div className="layer">
            {images.slice(0, 6).map((img, i) => (
              <div key={i}>
                <img src={img} />
              </div>
            ))}
          </div>

          <div className="layer">
            {images.slice(6, 12).map((img, i) => (
              <div key={i}>
                <img src={img} />
              </div>
            ))}
          </div>

          <div className="layer">
            <div>
              <img src={images[12]} />
            </div>
            <div>
              <img src={images[13]} />
            </div>
          </div>

          <div className="scaler">
            <img src={images[7]} />
          </div>
        </div>
      </div>
    </section>
  );
}
