import { useEffect, useState } from "react";
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

// Once the walk-up completes, the TV (and everything inside it - icons,
// text) renders this much larger than its natural authored size. Applied
// only to .porch-stage's own scale, not to `zoom` (which drives the
// backdrop photo too), so the photo still zooms in at its original rate
// and only the TV itself ends up bigger.
const TV_SCALE_BOOST = 1.2;

// The Buy Me a Coffee widget renders outside React's tree (see index.html),
// so its scroll-linked clearance above the docked disclaimer is applied
// imperatively rather than through React state.
const BMC_REST_BOTTOM = 250;
// 132 plus BOTTOM_BAR_CLEARANCE (below) so it clears the disclaimer, which
// is itself shifted up out of the permanent .ai-notice bar's way.
const BMC_END_BOTTOM = 188;

// The widget's own natural (unscaled) rendered height — used so the
// mobile centering math stays correct even though the button is shrunk via
// transform: scale() there (scaling around the box's own center leaves that
// center in place, so only the *unscaled* height matters for positioning).
const BMC_NATURAL_HEIGHT = 60;
const BMC_MOBILE_SCALE = 0.72;

// Below this width, the coffee button docks centered under the TV instead
// of in the right-hand column with the header/disclaimer, and the TV
// settles dead-center instead of shifted left for that column.
const MOBILE_BREAKPOINT = 640;

// The disclaimer sits permanently as a boxed card in the bottom-right
// corner - unlike the header/hint, it doesn't reflow position as the
// walk-up progresses. It just shrinks a bit, in both box width and font
// size, once the walk-up completes.
const DISC_REST_WIDTH = 380;
const DISC_END_WIDTH = 340;
const DISC_REST_SCALE = 1.15;
const DISC_END_SCALE = 0.92;

// Vertical space permanently reserved at the very bottom of the screen for
// the AI-notice bar (see .ai-notice), so the disclaimer and scroll-hint
// clear it instead of sitting underneath it.
const BOTTOM_BAR_CLEARANCE = 56;

// On mobile the shrunk-corner-box treatment (used on desktop) was too small
// to read once fully zoomed in, so mobile gets a different pattern instead:
// a full-width banner at rest, which collapses into a small "Disclaimer"
// link in the corner once zoomed in (tap it to reopen). ZOOMED_THRESHOLD
// mirrors the one .porch-stage itself uses to flip from inert to
// interactive, so the disclaimer collapses exactly when the TV takes over.
const ZOOMED_THRESHOLD = 0.85;

// On mobile the AI-use notice moves to a permanent bar along the very top
// of the screen (instead of the bottom, like on desktop), so the header
// needs to sit below it the whole time - not just at rest, since the
// notice bar never goes away. Generous rather than measured, same
// approach as BOTTOM_BAR_CLEARANCE above.
const MOBILE_HEADER_TOP = 56;
// How much room the mobile disclaimer banner (the full-text, rest-state
// version) needs at the bottom of the screen, so the scroll hint sits
// above it instead of underneath it.
const MOBILE_DISCLAIMER_BANNER_HEIGHT = 168;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Smoothstep easing so the walk-up starts and ends gently rather than
// moving at a constant rate.
function ease(t) {
  return t * t * (3 - 2 * t);
}

function DisclaimerText() {
  return (
    <>
      <h2>Disclaimer</h2>
      <p>
        This app/website is an independent project created by John A Haverty LLC and is
        not affiliated with, endorsed by, or sponsored by the Blank Check podcast or
        Blank Check Productions. All references to Blank Check are made for
        identification and commentary purposes only.
      </p>
      <p>This app and its content are © 2026 John A Haverty LLC. All rights reserved.</p>
    </>
  );
}

export default function PorchScene({ header, children }) {
  const progress = useScrollProgress(ZOOM_RANGE);
  const t = ease(progress);
  const zoomedIn = t > ZOOMED_THRESHOLD;

  // Whether the mobile disclaimer's full text is pulled back up after being
  // collapsed to a link. Reset once we scroll back out of the zoomed range,
  // so it starts collapsed again next time rather than reopening stale.
  // Adjusted during render (React's documented pattern for resetting state
  // when a prop/derived value changes) rather than in an effect, which
  // would cause an extra cascading render for the same result.
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [prevZoomedIn, setPrevZoomedIn] = useState(zoomedIn);
  if (zoomedIn !== prevZoomedIn) {
    setPrevZoomedIn(zoomedIn);
    if (!zoomedIn) setDisclaimerExpanded(false);
  }

  // Whether the rest-state mobile disclaimer banner has been dismissed via
  // its "x". Dismissing it only hides that banner - the "Disclaimer" link
  // shown once zoomed in (and the full text it reopens) is unaffected.
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Clicking the tiny TV walks the scene all the way in, exactly as if the
  // user had scrolled/swiped through the whole range themselves - scroll
  // position is what drives the walk-up (see useScrollProgress), so this
  // just animates scrollY to the end of it.
  function walkIn() {
    window.scrollTo({ top: window.innerHeight * ZOOM_RANGE, behavior: "smooth" });
  }

  const zoom = lerp(1, ZOOM_TARGET, t);
  const stageBoost = lerp(1, TV_SCALE_BOOST, t);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw <= MOBILE_BREAKPOINT;
  const anchorPx = { x: (ANCHOR.x / 100) * vw, y: (ANCHOR.y / 100) * vh };
  // On mobile there's no right-hand header/disclaimer column sharing the
  // screen with the TV (they're stacked above/below instead), so it settles
  // dead-center there rather than shifted left.
  const settleX = isMobile ? 50 : SETTLE.x;
  const settlePx = { x: (settleX / 100) * vw, y: (SETTLE.y / 100) * vh };

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

  // The scroll hint slides from a full-width bar flush with the bottom edge
  // at rest to a narrow block docked under the coffee button once the
  // walk-up completes (it's gone well before that point in practice, since
  // it fades out by progress 0.3, but this keeps it anchored sensibly for
  // the brief window it's visible).
  const clusterRestWidth = vw;
  const clusterEndWidth = Math.min(vw - 32, 340);
  const clusterWidth = lerp(clusterRestWidth, clusterEndWidth, t);
  const clusterRight = lerp(0, 16, t);
  // On mobile the disclaimer banner (not the AI-notice bar) now occupies
  // the bottom at rest, and it's much taller, so the hint needs to clear
  // that instead.
  const clusterRestClearance = isMobile ? MOBILE_DISCLAIMER_BANNER_HEIGHT : BOTTOM_BAR_CLEARANCE;
  const clusterBottom = lerp(clusterRestClearance, clusterRestClearance + 16, t);

  // Desktop only - mobile uses the banner/link/popup pattern above instead
  // (see DisclaimerText usage below).
  const discWidth = lerp(Math.min(vw - 32, DISC_REST_WIDTH), Math.min(vw - 32, DISC_END_WIDTH), t);
  const discScale = lerp(DISC_REST_SCALE, DISC_END_SCALE, t);

  // Keep the (React-external) coffee button clear of the disclaimer as it
  // docks into the corner beneath it, and keep it hidden entirely until the
  // walk-up has essentially finished. On narrow viewports it docks centered
  // under the TV instead, in the gap above the bottom edge — measured live
  // off the actual DOM rects so it holds up at any mobile screen size.
  // (Just the screen edge itself, with a margin, rather than anchored to
  // any particular element: the AI-notice bar lives at the top on mobile
  // now, and the disclaimer isn't reliably present at the bottom once
  // collapsed to a link.)
  //
  // Also re-measures on raw scroll/resize events, not just when `t` changes:
  // `t` clamps at 1 once fully zoomed in, but on iOS, forcing a bit more
  // scroll past that point can still release the sticky TV container
  // (rubber-band overscroll) and shift it on screen even though `t` itself
  // hasn't moved — without this, the button's last (now-stale) position
  // stays stranded on top of the TV. `t` stays in the dependency array
  // (rather than read via a ref) so this closure is always rebuilt with the
  // exact value React just rendered — a ref updated separately would race
  // against this effect's own rAF-scheduled reads of it.
  useEffect(() => {
    let raf = null;
    const update = () => {
      raf = null;
      // Looked up fresh each call (rather than once, outside update) since
      // the widget script (index.html) injects this button asynchronously
      // and may not exist yet on the very first call.
      const btn = document.querySelector(".bmc-btn");
      if (!btn) return;

      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;

      if (mobile) {
        const stage = document.querySelector(".porch-stage");
        if (stage) {
          const stageBottom = stage.getBoundingClientRect().bottom;
          const screenFloor = window.innerHeight - 16;
          // Center in the gap between the TV and the bottom of the screen -
          // but on a narrow phone that gap can be tiny, so favor sitting
          // just under the TV rather than getting pulled down too far.
          const gapTop = stageBottom + 6;
          const gapBottom = Math.max(gapTop, screenFloor);
          const centerY = (gapTop + gapBottom) / 2;
          btn.style.left = "50%";
          btn.style.right = "auto";
          btn.style.transform = `translateX(-50%) scale(${BMC_MOBILE_SCALE})`;
          // Scaling happens around the box's own (unscaled) center, so the
          // bottom offset only needs the natural height to land centered.
          btn.style.bottom = `${window.innerHeight - centerY - BMC_NATURAL_HEIGHT / 2}px`;
        }
      } else {
        btn.style.left = "auto";
        btn.style.transform = "none";
        btn.style.right = "16px";
        btn.style.bottom = `${lerp(BMC_REST_BOTTOM, BMC_END_BOTTOM, t)}px`;
      }

      // The coffee button lives outside React's tree in its own stacking
      // context, so it can paint over the mobile disclaimer popup no
      // matter how high that popup's own z-index goes - hide it outright
      // while the popup is open instead.
      const btnOpacity =
        mobile && disclaimerExpanded ? 0 : Math.max(0, Math.min(1, (t - 0.9) / 0.1));
      btn.style.opacity = btnOpacity;
      btn.style.pointerEvents = btnOpacity > 0.5 ? "auto" : "none";
    };

    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(update);
    };

    update();
    // Retry a few times in case the widget script hasn't injected the
    // button yet on first paint.
    const retryTimers = [100, 500, 1500].map((ms) => setTimeout(update, ms));

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      retryTimers.forEach(clearTimeout);
    };
  }, [t, disclaimerExpanded]);

  return (
    <div className="porch-scene" style={{ height: `${(1 + ZOOM_RANGE) * 100}dvh` }}>
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
              transform: `translate(-50%, -50%) scale(${REST_SCALE * stageBoost})`,
              pointerEvents: t > 0.85 ? "auto" : "none",
            }}
          >
            {children}
          </div>

          {/* Invisible hit target over the tiny TV so people who don't
              realize the page scrolls can just click it - triggers the same
              smooth walk-up as manually scrolling. Only present while the
              real TV controls are inert (t <= 0.85, mirroring porch-stage's
              own pointerEvents threshold above) so it never shadows a click
              meant for the actual TV/VCR once zoomed in. */}
          {t <= 0.85 && (
            <button
              type="button"
              className="porch-walk-in-hit"
              style={{
                left: `${ANCHOR.x}%`,
                top: `${ANCHOR.y}%`,
                transform: `translate(-50%, -50%) scale(${REST_SCALE * stageBoost})`,
              }}
              onClick={walkIn}
              aria-label="Walk up to the TV"
            />
          )}
        </div>

        <div
          className="page-header-wrap"
          style={{
            opacity: Math.min(1, t / 0.6),
            width: `${headerWidth}px`,
            right: `${headerRight}px`,
            textAlign: t > 0.5 ? "right" : "center",
            "--header-scale": headerScale,
            top: isMobile ? `${MOBILE_HEADER_TOP}px` : undefined,
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
              <span className="scroll-hint-arrow">↑</span>
              Swipe up to walk onto the porch.
            </div>
          )}
        </div>

        {isMobile ? (
          <>
            {!zoomedIn && !bannerDismissed && (
              <div className="disclaimer disclaimer-banner">
                <button
                  type="button"
                  className="disclaimer-close"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Close disclaimer"
                >
                  ×
                </button>
                <DisclaimerText />
              </div>
            )}

            {zoomedIn && !disclaimerExpanded && (
              <button
                type="button"
                className="disclaimer-link"
                onClick={() => setDisclaimerExpanded(true)}
              >
                Disclaimer
              </button>
            )}

            {zoomedIn && disclaimerExpanded && (
              <div className="disclaimer disclaimer-popup">
                <button
                  type="button"
                  className="disclaimer-close"
                  onClick={() => setDisclaimerExpanded(false)}
                  aria-label="Close disclaimer"
                >
                  ×
                </button>
                <DisclaimerText />
              </div>
            )}
          </>
        ) : (
          <div
            className="disclaimer"
            style={{
              width: `${discWidth}px`,
              "--disc-scale": discScale,
            }}
          >
            <DisclaimerText />
          </div>
        )}

        <div className={isMobile ? "ai-notice ai-notice-top" : "ai-notice"}>
          This app was created by a human, but AI tools were used during development to help
          with coding.
        </div>
      </div>
    </div>
  );
}
