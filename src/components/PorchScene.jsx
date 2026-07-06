import { useEffect } from "react";
import useScrollProgress from "../hooks/useScrollProgress";

// How many viewport-heights of scrolling the walk-up takes.
const ZOOM_RANGE = 1.1;

// The TV/VCR's fixed resting spot — on the gray floor in the porch corner,
// matching porch.jpg. This never moves: instead of growing the TV on its
// own, scrolling zooms the *whole scene* (photo + TV) toward this point, so
// it reads as walking closer rather than the TV inflating in place.
const ANCHOR = { x: 33, y: 66 };
const REST_SCALE = 0.16;

// Where the anchor is re-centered to once the walk-up completes. Shifted
// left of dead-center so the TV settles next to the header/disclaimer
// column on the right rather than under it.
const SETTLE = { x: 41, y: 57 };

const ZOOM_TARGET = 1 / REST_SCALE;

// The Buy Me a Coffee widget renders outside React's tree (see index.html),
// so its scroll-linked clearance above the docked disclaimer is applied
// imperatively rather than through React state.
const BMC_REST_BOTTOM = 250;
const BMC_END_BOTTOM = 132;

// Below this width, the coffee button docks centered under the TV instead
// of in the right-hand column with the header/disclaimer.
const MOBILE_BREAKPOINT = 640;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Smoothstep easing so the walk-up starts and ends gently rather than
// moving at a constant rate.
function ease(t) {
  return t * t * (3 - 2 * t);
}

export default function PorchScene({ header, children }) {
  const progress = useScrollProgress(ZOOM_RANGE);
  const t = ease(progress);

  const zoom = lerp(1, ZOOM_TARGET, t);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const anchorPx = { x: (ANCHOR.x / 100) * vw, y: (ANCHOR.y / 100) * vh };
  const settlePx = { x: (SETTLE.x / 100) * vw, y: (SETTLE.y / 100) * vh };

  // Pan so the anchor point stays put while zoom==1, then glides toward
  // the settle point as the scene zooms in — see derivation: for a point P,
  // screen position = zoom*P + pan, and we want P==anchor to land exactly
  // on settlePx once t==1 (and stay at anchorPx while t==0).
  const panX = anchorPx.x - zoom * anchorPx.x + (settlePx.x - anchorPx.x) * t;
  const panY = anchorPx.y - zoom * anchorPx.y + (settlePx.y - anchorPx.y) * t;

  // Header slides from a centered banner at rest to a large right-aligned
  // title once the walk-up completes, sliding/growing continuously with t.
  const headerRestWidth = Math.min(vw - 32, 640);
  const headerEndWidth = Math.min(vw - 32, 380);
  const headerWidth = lerp(headerRestWidth, headerEndWidth, t);
  const headerRight = lerp((vw - headerRestWidth) / 2, 16, t);
  const headerScale = lerp(1, 1.65, t);

  // The hint + disclaimer share one flex column so they stack by actual
  // rendered height (however many lines the disclaimer wraps to on a given
  // viewport) instead of guessed pixel gaps. It slides from a full-width
  // bar flush with the bottom edge at rest to a narrow block docked under
  // the coffee button once the walk-up completes.
  const clusterRestWidth = vw;
  const clusterEndWidth = Math.min(vw - 32, 340);
  const clusterWidth = lerp(clusterRestWidth, clusterEndWidth, t);
  const clusterRight = lerp(0, 16, t);
  const clusterBottom = lerp(0, 16, t);
  const discScale = lerp(0.82, 0.68, t);
  const discRadius = t > 0.5 ? 10 : 0;

  // Keep the (React-external) coffee button clear of the disclaimer as it
  // docks into the corner beneath it, and keep it hidden entirely until the
  // walk-up has essentially finished. On narrow viewports it docks centered
  // under the TV instead, in the gap above the disclaimer — measured live
  // off the actual DOM rects so it holds up at any mobile screen size.
  useEffect(() => {
    const btn = document.querySelector(".bmc-btn");
    if (!btn) return;

    if (vw <= MOBILE_BREAKPOINT) {
      const stage = document.querySelector(".porch-stage");
      const cluster = document.querySelector(".bottom-cluster");
      const btnRect = btn.getBoundingClientRect();
      if (stage && cluster) {
        const stageBottom = stage.getBoundingClientRect().bottom;
        const clusterTop = cluster.getBoundingClientRect().top;
        const centerY = (stageBottom + clusterTop) / 2;
        btn.style.left = "50%";
        btn.style.right = "auto";
        btn.style.transform = "translateX(-50%)";
        btn.style.bottom = `${vh - centerY - btnRect.height / 2}px`;
      }
    } else {
      btn.style.left = "auto";
      btn.style.transform = "none";
      btn.style.right = "16px";
      btn.style.bottom = `${lerp(BMC_REST_BOTTOM, BMC_END_BOTTOM, t)}px`;
    }

    const btnOpacity = Math.max(0, Math.min(1, (t - 0.9) / 0.1));
    btn.style.opacity = btnOpacity;
    btn.style.pointerEvents = btnOpacity > 0.5 ? "auto" : "none";
  }, [t, vw, vh]);

  return (
    <div className="porch-scene" style={{ height: `${(1 + ZOOM_RANGE) * 100}vh` }}>
      <div className="porch-viewport">
        <div
          className="porch-zoom"
          style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
        >
          <div className="porch-backdrop" aria-hidden="true" />
          <div
            className="porch-stage"
            style={{
              left: `${ANCHOR.x}%`,
              top: `${ANCHOR.y}%`,
              transform: `translate(-50%, -50%) scale(${REST_SCALE})`,
              pointerEvents: t > 0.85 ? "auto" : "none",
            }}
          >
            {children}
          </div>
        </div>

        <div
          className="page-header-wrap"
          style={{
            opacity: Math.min(1, t / 0.6),
            width: `${headerWidth}px`,
            right: `${headerRight}px`,
            textAlign: t > 0.5 ? "right" : "center",
            "--header-scale": headerScale,
          }}
        >
          {header}
        </div>

        <div
          className="bottom-cluster"
          style={{
            width: `${clusterWidth}px`,
            right: `${clusterRight}px`,
            bottom: `${clusterBottom}px`,
            alignItems: t > 0.5 ? "flex-end" : "center",
          }}
        >
          {progress < 0.3 && (
            <div className="scroll-hint" style={{ opacity: Math.max(0, 1 - progress / 0.25) }}>
              <span className="scroll-hint-arrow">↓</span>
              Scroll down to walk onto the porch.
            </div>
          )}

          <div
            className="disclaimer"
            style={{
              textAlign: t > 0.5 ? "left" : "center",
              borderRadius: `${discRadius}px`,
              "--disc-scale": discScale,
            }}
          >
            <h2>Disclaimer</h2>
            <p>
              This app/website is an independent project created by Jonathan Reeve and is
              not affiliated with, endorsed by, or sponsored by the Blank Check podcast or
              Blank Check Productions. All references to Blank Check are made for
              identification and commentary purposes only.
            </p>
            <p>This app and its content are © 2026 Jonathan Reeve. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
