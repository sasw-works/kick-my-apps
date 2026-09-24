"use client";

// Figma "Features" — dark 4154:191 (Section 01: 4153:1867, Section 02: 4153:2022),
// light 4204:171 (Section 01: 4204:173, Section 02: 4204:295).
// Body is 1428px wide. Desktop renders the exact Figma geometry; narrower screens scale it down
// proportionally (zoom) and phones (<720px, no mobile frame in Figma) get text-only cards.
// Illustrations are the Figma vector exports, used as-is (public/dark/features, public/light/features).
// The light illustrations simplify a few assets versus dark (no separate outline layer on the
// config-file cards or the three app icons; the light Figma frame just doesn't have them).

import React, { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";

const DESIGN_W = 1428;

const subscribe = (cb) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getFit = () => {
  const w = document.documentElement.clientWidth;
  return w < 720 ? 1 : Math.min(1, Math.round(((w - 48) / DESIGN_W) * 1000) / 1000);
};

// ---- helpers ---------------------------------------------------------------------------------
function Fill({ src, light }) {
  const F = light ? "/light/features/" : "/dark/features/";
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="kf-fill" src={F + src} alt="" />;
}
// absolutely positioned box; `inset` is Tailwind/Figma order: top right bottom left
function Box({ inset, clip, style, children }) {
  return (
    <div className={`kf-abs${clip ? " kf-clip" : ""}`} style={{ inset, ...style }}>
      {children}
    </div>
  );
}
// live text inside an illustration (Figma text layers)
function Txt({ inset, size = 15, color = "#ffffff", children }) {
  return (
    <div className="kf-abs kf-itxt" style={{ inset, fontSize: size, color }}>
      {children}
    </div>
  );
}
function Lines({ lines }) {
  return lines.map((l, i) => (
    <React.Fragment key={i}>
      {i > 0 && (
        <>
          {" "}
          <br />
        </>
      )}
      {l}
    </React.Fragment>
  ));
}
// small square icon of Section 02 card 3 (fill + optional outline + png glyph)
function AppIcon({ inset, fillW, v, glyph, names, light }) {
  return (
    <Box inset={inset} clip>
      <div className="kf-abs kf-clip" style={{ left: 0, top: 0, width: fillW, height: 49.19 }}>
        <div className="kf-abs kf-clip kf-center" style={{ width: 49.19, height: 49.19 }}>
          <Box inset={v}>
            <Fill src={names.fill} light={light} />
          </Box>
          {names.line && (
            <Box inset={v}>
              <div className="kf-abs" style={{ inset: "-0.96%" }}>
                <Fill src={names.line} light={light} />
              </div>
            </Box>
          )}
          <Box inset={glyph}>
            <Fill src={names.glyph} light={light} />
          </Box>
        </div>
      </div>
    </Box>
  );
}
// small line-art group icon of Section 02 card 3
function GroupIcon({ inset, group, pad, src, light }) {
  return (
    <Box inset={inset} clip>
      <Box inset="0" clip>
        <Box inset={group}>
          <div className="kf-abs" style={{ inset: pad }}>
            <Fill src={src} light={light} />
          </div>
        </Box>
      </Box>
    </Box>
  );
}

function Headline({ title, subLines, subColor, subLh, subH, gapBelow, light }) {
  return (
    <div className="kf-headline" style={{ marginBottom: gapBelow }}>
      <div className="kf-pill">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={(light ? "/light/features/" : "/dark/features/") + "s1-link-icon.svg"} alt="" width={14} height={15} />
        <span>Convention over Configuration</span>
      </div>
      <h2 className="kf-h2">{title}</h2>
      <p className={`kf-sub${subH ? " kf-sub-fixed" : ""}`} style={{ color: subColor, lineHeight: `${subLh}px`, height: subH }}>
        <span>
          <Lines lines={subLines} />
        </span>
      </p>
    </div>
  );
}

function CenterText({ title, lines }) {
  return (
    <div className="kf-text-c">
      <div className="kf-card-title">{title}</div>
      <div className="kf-card-body">
        <Lines lines={lines} />
      </div>
    </div>
  );
}
function LeftText({ title, body }) {
  return (
    <div className="kf-text-l">
      <div className="kf-card-title">{title}</div>
      <div className="kf-card-body kf-card-body-wrap">{body}</div>
    </div>
  );
}

// ---- section -----------------------------------------------------------------------------------
export default function FeaturesSection() {
  const fit = useSyncExternalStore(subscribe, getFit, () => 1);
  const { theme } = useTheme();
  const light = theme === "light";

  // every color that differs between the two Figma frames, in one place
  const c = light
    ? {
        pageBg: "#ffffff",
        pillBg: "#f7f8fa", pillBorder: "#e3e8f0", pillText: "#1a2b3b",
        h2: "#1a2b3b", sub: "#1a2b3b",
        cardBg: "#eff1f4", cardBorder: "transparent",
        cardTitle: "#1a2b3b", cardBody: "#757e90",
        label: "#1a2b3b", muted: "#757e90", fieldLabel: "#757e90",
        boxBg: "#f9f9f9", boxBorder: "#e3e8f0", inputBorder: "#d9dee5",
      }
    : {
        pageBg: "#1f1f1f",
        pillBg: "#262626", pillBorder: "#484848", pillText: "#d8d8d8",
        h2: "#ffffff", sub: "#a1a1aa",
        cardBg: "#262626", cardBorder: "#484848",
        cardTitle: "#ffffff", cardBody: "#a1a1a1",
        label: "#ffffff", muted: "#a1a1a1", fieldLabel: "#606060",
        boxBg: "#303030", boxBorder: "#484848", inputBorder: "#484848",
      };

  return (
    <section className="kma-features" aria-label="Features">
      <style>{`
        /* Features frame — 1628 wide, 100px side padding around the 1428 body */
        .kma-features {
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          width: min(1628px, 100vw);
          margin-top: 35px;
          background: ${c.pageBg};
          font-family: var(--font-inter), sans-serif;
        }
        .kma-features-fit { width: ${DESIGN_W}px; margin: 0 auto; display: flex; flex-direction: column; gap: 94px; }

        .kf-abs { position: absolute; }
        .kf-clip { overflow: hidden; }
        .kf-center { left: 50%; top: 50%; transform: translate(-50%, -50%); }
        .kf-fill { position: absolute; inset: 0; display: block; max-width: none; width: 100%; height: 100%; }
        .kf-itxt {
          display: flex; flex-direction: column; justify-content: center; text-align: center;
          white-space: nowrap; line-height: 22px;
        }
        .kf-flexc { display: flex; align-items: center; justify-content: center; container-type: size; }

        /* headline: pill 274x47 -> h2 48/63 -> sub */
        .kf-headline { display: flex; flex-direction: column; align-items: flex-start; gap: 24px; width: 100%; }
        .kf-pill {
          box-sizing: border-box; width: 274px; height: 47px; padding: 16px 24px;
          display: flex; align-items: flex-start; gap: 10px;
          background: ${c.pillBg}; border-radius: 999px; box-shadow: inset 0 0 0 1px ${c.pillBorder};
          font-size: 14px; line-height: 14px; color: ${c.pillText};
        }
        .kf-pill img { display: block; flex-shrink: 0; }
        .kf-pill span { display: block; width: 202px; height: 14px; white-space: nowrap; }
        .kf-h2 { margin: 0; font-size: 48px; line-height: 63px; font-weight: 400; color: ${c.h2}; min-height: 64.8px; }
        .kf-sub { margin: 0; font-size: var(--fs-18); font-weight: 400; white-space: nowrap; }
        .kf-sub-fixed { display: flex; flex-direction: column; justify-content: center; }

        /* cards */
        .kf-cards { display: flex; flex-direction: column; gap: 24px; }
        .kf-row { display: flex; gap: 24px; align-items: flex-start; }
        .kf-card { position: relative; flex-shrink: 0; overflow: hidden; background: ${c.cardBg}; border-radius: var(--radius-16); }
        .kf-card::after {
          content: ""; position: absolute; inset: 0; border: 1px solid ${c.cardBorder}; border-radius: var(--radius-16); pointer-events: none;
        }
        .kf-illus { position: absolute; inset: 0; pointer-events: none; }
        .kf-card-title { font-size: 20px; line-height: 22px; font-weight: 400; color: ${c.cardTitle}; }
        .kf-card-body { font-size: 16px; line-height: 24px; font-weight: 400; color: ${c.cardBody}; white-space: nowrap; }
        .kf-card-body-wrap { white-space: normal; min-height: 44px; }
        .kf-text-c {
          position: absolute; left: 0; right: 0; top: 279px;
          display: flex; flex-direction: column; align-items: center; gap: 13px; text-align: center;
        }
        .kf-text-l { position: absolute; left: 55px; top: 40px; width: 348px; display: flex; flex-direction: column; gap: 13px; }

        /* phones: Figma has no mobile frame -> readable text-only cards */
        @media (max-width: 719px) {
          .kma-features { margin-top: 0; }
          .kma-features-fit { width: 100%; padding: 0 24px; gap: 64px; box-sizing: border-box; }
          .kf-h2 { font-size: 32px; line-height: 1.2; min-height: 0; }
          .kf-sub { white-space: normal; }
          .kf-sub-fixed { height: auto !important; display: block; }
          .kf-sub br, .kf-card-body br { display: none; }
          .kf-row { flex-direction: column; align-items: stretch; }
          .kf-card { width: auto !important; height: auto !important; }
          .kf-illus { display: none; }
          .kf-text-c, .kf-text-l { position: static; width: auto; padding: 32px 24px; text-align: left; align-items: flex-start; }
          .kf-card-body { white-space: normal; }
        }
      `}</style>

      <div className="kma-features-fit" style={{ zoom: fit }}>
        {/* ============================ Section 01 ============================ */}
        <div className="kf-sec1" style={{ display: "flex", flexDirection: "column" }}>
          <Headline
            light={light}
            title="Everything your reviews are telling you"
            subLines={[
              "Screenshot analysis and real user reviews come together in one comprehensive report, giving you a clearer view of",
              "both the user experience and actual customer feedback.",
            ]}
            subColor={c.sub}
            subLh={32}
            gapBelow={82}
          />
          <div className="kf-cards">
            <div className="kf-row">
              {/* Real App Store data */}
              <div className="kf-card" style={{ width: 800, height: 402 }}>
                <div className="kf-illus">
                  <div className="kf-abs" style={{ left: "calc(50% + 0.48px)", top: 40, width: 600.95, height: 200, transform: "translateX(-50%)" }}>
                    <Box inset="14.37px 120.2px 0 120.19px" clip>
                      <Box inset="99.05px 20.05px 12.33px 19.62px" clip><Fill src="s1-instance-a.svg" light={light} /></Box>
                      <Box inset="11.6px 20.05px 99.78px 19.62px" clip><Fill src="s1-instance-b.svg" light={light} /></Box>
                    </Box>
                  </div>
                </div>
                <CenterText
                  title="Real App Store data"
                  lines={[
                    "Not guesswork: we analyze real, publicly available App Store",
                    "reviews directly and honestly.",
                  ]}
                />
              </div>

              {/* Always fresh */}
              <div className="kf-card" style={{ width: 600, height: 402 }}>
                <div className="kf-illus">
                  <div className="kf-abs" style={{ left: "calc(50% - 0.48px)", top: 40, width: 431.05, height: 200, transform: "translateX(-50%)" }}>
                    <Box inset="0.14px 21.56px 0.14px 21.55px" clip>
                      <Box inset="82.25px 7.49px 14.3px 52.92px" style={{}}>
                        <div className="kf-flexc" style={{ position: "absolute", inset: 0 }}>
                          <div style={{ position: "relative", flex: "none", width: 321.98, height: 69.89, transform: "rotate(-6deg)", overflow: "hidden" }}>
                            <Fill src="s1-interface-1.svg" light={light} />
                          </div>
                        </div>
                      </Box>
                      <Box inset="25.51px 46.18px 100.71px 18.64px">
                        <div className="kf-flexc" style={{ position: "absolute", inset: 0 }}>
                          <div style={{ position: "relative", flex: "none", width: 321.99, height: 67.89, transform: "rotate(1deg)", overflow: "hidden" }}>
                            <Fill src="s1-interface-2.svg" light={light} />
                          </div>
                        </div>
                      </Box>
                    </Box>
                  </div>
                </div>
                <CenterText
                  title="Always fresh"
                  lines={[
                    "No caching, ever: every single analysis pulls the freshest",
                    "reviews straight from the source.",
                  ]}
                />
              </div>
            </div>

            <div className="kf-row">
              {/* Enrich your findings */}
              <div className="kf-card" style={{ width: 600, height: 402 }}>
                <div className="kf-illus">
                  <div
                    className="kf-abs"
                    style={{
                      left: 142, top: 76.2, width: 458, height: 126, background: c.boxBg,
                      borderRadius: "16px 0 0 16px", boxShadow: `inset 0 0 0 1px ${c.boxBorder}`,
                    }}
                  />
                  <Txt inset="24.93% 47.5% 69.6% 27.67%" color={c.label}>Environment variable</Txt>
                  <div className="kf-abs" style={{ left: 166, top: 138.2, width: 230, height: 40, borderRadius: 8, boxShadow: `inset 0 0 0 1px ${c.inputBorder}` }} />
                  <Txt inset="36.71% 64.22% 57.82% 31.28%" color={c.fieldLabel}>Key</Txt>
                  <div className="kf-abs" style={{ left: 412, top: 138.2, width: 230, height: 40, borderRadius: 8, boxShadow: `inset 0 0 0 1px ${c.inputBorder}` }} />
                  <Txt inset="36.71% 22.22% 57.82% 71.28%" color={c.fieldLabel}>Value</Txt>
                </div>
                <CenterText
                  title="Enrich your findings with meaningful context"
                  lines={[
                    "Organizes and enriches every finding so your reports stay",
                    "precise, useful and truly actionable.",
                  ]}
                />
              </div>

              {/* 13 categories across four analysis lenses */}
              <div className="kf-card" style={{ width: 800, height: 402 }}>
                <div className="kf-illus">
                  <div className="kf-abs" style={{ left: "50%", top: 40, width: 719.95, height: 200, transform: "translateX(-50%)" }}>
                    <Box inset="-47.5px 60.11px 0 60.09px" clip>
                      <Box inset="-15.99px -72.11px 114.99px -72.11px" clip>
                        <div className="kf-abs kf-clip" style={{ left: 0, top: 0, width: 624.97, height: 148.5 }}>
                          <div className="kf-abs" style={{ left: "50%", top: "50%", width: 640.671, height: 148.5, transform: "translate(-50%,-50%)" }}>
                            <Fill src="s1-yaml-bg.svg" light={light} />
                          </div>
                        </div>
                      </Box>
                      {/* "5 hours ago" row */}
                      <Box inset="156.23px 178.7px 21.97px 28.03px" clip>
                        <Box inset="0" clip>
                          <Box inset="0.81% 0.2%"><Fill src="s1-cfg1-card.svg" light={light} /></Box>
                          {!light && (
                            <Box inset="0.68% 0.17% 0.94% 0.22%">
                              <div className="kf-abs" style={{ inset: "-0.81% -0.14%" }}><Fill src="s1-cfg1-card-outline.svg" /></div>
                            </Box>
                          )}
                          <Txt inset="20.59% 44.56% 47.66% 6.84%" color={c.label}>/etc/config/my_config.yaml</Txt>
                          <Txt inset="49.45% 75.35% 18.8% 6.07%" size={13} color={c.muted}>5 hours ago</Txt>
                          <Box inset="20.88% 5.38% 21.4% 84.44%"><Fill src="s1-cfg1-avatar.svg" light={light} /></Box>
                          <Txt inset="33.58% 9.18% 34.67% 88.18%" color="#c0dbc7">R</Txt>
                        </Box>
                      </Box>
                      {/* "2 mins ago" row */}
                      <Box inset="37.64px 32.37px 140.57px 188.78px" clip>
                        <Box inset="0" clip>
                          <Box inset="1.53% 0.12% 0.08% 0.3%"><Fill src="s1-cfg2-card.svg" light={light} /></Box>
                          {!light && (
                            <Box inset="0.81% 0.21%">
                              <div className="kf-abs" style={{ inset: "-0.8% -0.15%" }}><Fill src="s1-cfg2-card-outline.svg" /></div>
                            </Box>
                          )}
                          <div className="kf-abs" style={{ left: "84.03%", right: "5.41%", top: "calc(50% + 0.42px)", aspectRatio: "1 / 1", transform: "translateY(-50%)" }}>
                            <Fill src="s1-cfg2-avatar.svg" light={light} />
                          </div>
                          <Txt inset="34.44% 9.37% 33.81% 87.99%" color="#aeddff">S</Txt>
                          <Txt inset="20% 42.39% 48.25% 7.16%" color={c.label}>/etc/config/my_config.yaml</Txt>
                          <Txt inset="48.87% 75.14% 19.38% 7.16%" size={13} color={c.muted}>2 mins ago</Txt>
                        </Box>
                      </Box>
                    </Box>
                  </div>
                </div>
                <CenterText
                  title="13 categories across four analysis lenses"
                  lines={[
                    "Every finding maps to a UI, UX, Accessibility or Product lens,",
                    "so nothing ever slips through.",
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================ Section 02 ============================ */}
        <div className="kf-sec2" style={{ display: "flex", flexDirection: "column" }}>
          <Headline
            light={light}
            title="Deep, but never messy"
            subLines={[
              "Discover findings across 13 key categories, prioritized by impact and continuously tracked through",
              "weekly digests and competitor comparisons.",
            ]}
            subColor={c.sub}
            subLh={28}
            subH={48}
            gapBelow={80}
          />
          <div className="kf-row">
            {/* Compare your app with a competitor */}
            <div className="kf-card" style={{ width: 459, height: 350 }}>
              <LeftText title="Compare your app with a competitor" body="Put two reports side by side to see where you lead, where you lag, and what to fix first." />
              <div className="kf-illus">
                <div className="kf-abs" style={{ left: "calc(50% + 0.16px)", top: 146, width: 341.33, height: 180, transform: "translateX(-50%)" }}>
                  <Box inset="1.25px 0 1.26px 0" clip>
                    <Box inset="110.5px 13.8px 15.52px 13.52px" clip style={{ opacity: 0.5 }}><Fill src="s2-build-a.svg" light={light} /></Box>
                    <Box inset="14.08px 13.8px 111.94px 13.52px" clip style={{ opacity: 0.5 }}><Fill src="s2-build-b.svg" light={light} /></Box>
                    {light ? (
                      <Box inset="61px 3.45px 61.47px 3.38px" clip><Fill src="s2-build-c-detail.svg" light /></Box>
                    ) : (
                      <Box inset="61px 3.45px 61.47px 3.38px" clip><Fill src="s2-build-c.svg" /></Box>
                    )}
                  </Box>
                </div>
              </div>
            </div>

            {/* Weekly digests */}
            <div className="kf-card" style={{ width: 462, height: 350 }}>
              <div className="kf-illus">
                <div className="kf-abs" style={{ left: "calc(50% - 0.34px)", top: 146, width: 341.33, height: 180, transform: "translateX(-50%)" }}>
                  <Box inset="2.14px 0" clip>
                    <Box inset="12.68px 37.5px 11.93px 37.59px" clip>
                      <div className="kf-abs kf-clip" style={{ left: 0, top: 0, width: 266.24, height: 151.11 }}>
                        <div className="kf-abs" style={{ left: "calc(50% - 0.01px)", top: "50%", width: 267.414, height: 151.11, transform: "translate(-50%,-50%)" }}>
                          <Fill src="s2-digest.svg" light={light} />
                        </div>
                      </div>
                    </Box>
                  </Box>
                </div>
              </div>
              <LeftText title="Weekly digests keep you in the loop" body="A summary of your app’s new reviews lands in your inbox every week, fully automatically." />
            </div>

            {/* From finding to fix, in code */}
            <div className="kf-card" style={{ width: 459, height: 350 }}>
              <div className="kf-illus">
                <div className="kf-abs" style={{ left: "calc(50% + 0.16px)", top: 146, width: 341.32, height: 180, transform: "translateX(-50%)" }}>
                  <Box inset="2.14px 0" clip>
                    <Box inset="5.91px 88.79px 6.4px 88.7px" clip><Fill src="s2-code-ring.svg" light={light} /></Box>
                    <Box inset="-0.42px -3.02px -24.18px -3.8px" clip><Fill src="s2-code-bg.svg" light={light} /></Box>
                    <AppIcon light={light} inset="32.1px 126.26px 94.43px 167.28px" fillW={47.78} v="1.54% 2.69% 2.07% 0.92%" glyph="16.33% 15.8% 16.86% 14.04%"
                      names={light ? { fill: "s2-ic1-fill.svg", glyph: "s2-ic1-glyph.png" } : { fill: "s2-ic1-fill.svg", line: "s2-ic1-line.svg", glyph: "s2-ic1-glyph.png" }} />
                    <AppIcon light={light} inset="83.63px 181.6px 42.9px 111.93px" fillW={47.79} v="1.62% 2.55% 1.99% 1.06%" glyph="19.61% 20.54% 19.98% 19.06%"
                      names={light ? { fill: "s2-ic2-fill.svg", glyph: "s2-ic2-glyph.png" } : { fill: "s2-ic2-fill.svg", line: "s2-ic2-line.svg", glyph: "s2-ic2-glyph.png" }} />
                    <AppIcon light={light} inset="93.77px 112.75px 32.76px 180.79px" fillW={47.78} v="1.39% 1.93% 2.23% 1.68%" glyph="19.38% 19.92% 20.22% 19.68%"
                      names={light ? { fill: "s2-ic3-fill.svg", glyph: "s2-ic3-glyph.png" } : { fill: "s2-ic3-fill.svg", line: "s2-ic3-line.svg", glyph: "s2-ic3-glyph.png" }} />
                    <GroupIcon light={light} inset="63.79px 276.51px 92.61px 44.34px" group="2.17% 6.39% 6.39% 2.18%" pad="-2.45% -2.31%" src="s2-group-a.svg" />
                    <GroupIcon light={light} inset="155.86px 177.65px 0.53px 143.2px" group="2.17% 6.39% 6.39% 2.18%" pad="-2.45% -2.31%" src={light ? "s2-group-b1.svg" : "s2-group-b.svg"} />
                    <GroupIcon light={light} inset="114.47px 42.48px 41.92px 278.37px" group="2.17% 6.39% 6.39% 2.18%" pad="-2.45% -2.31%" src={light ? "s2-group-b2.svg" : "s2-group-b.svg"} />
                    <GroupIcon light={light} inset="28.3px 58.42px 115.79px 252.18px" group="1.33% 3.24% 3.99% 2.09%" pad="-1.41% -1.45%" src="s2-group-c.svg" />
                    <GroupIcon light={light} inset="124.6px 253.59px 19.5px 57.01px" group="3.57% 3.97% 1.75% 1.35%" pad="-1.41% -1.45%" src="s2-group-d.svg" />
                    <GroupIcon light={light} inset="15.63px 213.87px 128.47px 96.73px" group="1.35% 2.7% 3.97% 2.62%" pad="-1.41% -1.45%" src="s2-group-e.svg" />
                  </Box>
                </div>
              </div>
              <LeftText title="From finding to fix, in code" body="Key findings come with code fixes, from feedback straight to implementation." />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
