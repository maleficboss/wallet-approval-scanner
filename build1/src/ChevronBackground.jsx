import { useEffect, useRef } from "react";

// Phase 1: Spin settings
// How long the spin lasts, how far it must turn, and the angle it has to stop on
// so the chevron rows end up level instead of tilted.

const SPIN_MS = 3000;      // how long the rotation lasts before it stops completely
const SPIN_MIN_DEG = 90;   // the pattern turns at least this far before it stops

/* The pattern is drawn tilted by rotate(70) (patternTransform inside PATTERN below).
   For the rows to end up perfectly horizontal, the layer has to stop on
   (180 - tilt) degrees plus any multiple of 180. Keep PATTERN_TILT equal to the
   rotate(...) value in PATTERN. */
const PATTERN_TILT = 70;
const REST_ANGLE = (180 - PATTERN_TILT) % 180; // 110


// Phase 2: The pattern
// The chevron tile as an inline SVG data URL, used as the background image of the spinning layer.
// A 40x80 tile with four coloured zigzag lines on a dark fill, tiled across a very large rect.

/* rotate(70) in patternTransform is the tilt; PATTERN_TILT above must match it. */
const PATTERN = `url("data:image/svg+xml,<svg id='patternId' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' patternUnits='userSpaceOnUse' width='40' height='80' patternTransform='scale(1) rotate(70)'><rect x='0' y='0' width='100%' height='100%' fill='hsla(240,6.7%,17.6%,1)'/><path d='M-10 5l20 10L30 5l20 10'  stroke-linecap='square' stroke-width='1' stroke='hsla(47,80.9%,61%,1)' fill='none'/><path d='M-10 25l20 10 20-10 20 10'  stroke-linecap='square' stroke-width='1' stroke='hsla(4.1,89.6%,58.4%,1)' fill='none'/><path d='M-10 45l20 10 20-10 20 10'  stroke-linecap='square' stroke-width='1' stroke='hsla(186.8,100%,41.6%,1)' fill='none'/><path d='M-10 65l20 10 20-10 20 10'  stroke-linecap='square' stroke-width='1' stroke='hsla(258.5,59.4%,59.4%,1)' fill='none'/></pattern></defs><rect width='800%' height='800%' transform='translate(0,0)' fill='url(%23a)'/></svg>")`;


// Phase 3: Read the current angle
// Turns the layer's computed CSS transform back into degrees,
// so a new spin can start from wherever the last one stopped.

/* current rotation of an element in degrees, read from its computed transform */
function currentAngle(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    const m = new DOMMatrixReadOnly(t);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
}

/*
scans=how many scans have been started. 0 = nothing shown yet.
         every increase reveals the pattern (first time) and triggers one spin.
origin=viewport {x, y} where the reveal starts (the bulb)

The spin is a single animation that eases out, so it slows down and ends by itself
after SPIN_MS. Nothing runs per frame afterwards.
*/
function ChevronBackground({ scans, origin }) {
    // Phase 4: Refs and reveal flag
    // layerRef points at the rotating layer, animRef holds the running animation so it can be
    // cancelled, and revealed becomes true from the first valid scan onwards.
    const layerRef = useRef(null);
    const animRef = useRef(null);
    const revealed = scans > 0;


    // Phase 5: Spin once per scan
    // Each time scans goes up: read the current angle, work out the next level stopping angle
    // at least SPIN_MIN_DEG further on, cancel any spin still running, then animate to it.
    // Skipped before the first scan and for users who ask for reduced motion.
    useEffect(() => {
        const layer = layerRef.current;
        if (!layer || scans === 0) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        // start from wherever the pattern currently is, so a re-scan never jumps
        const from = currentAngle(layer);
        // stop on the first horizontal angle that is at least SPIN_MIN_DEG further on
        const to = Math.ceil((from + SPIN_MIN_DEG - REST_ANGLE) / 180) * 180 + REST_ANGLE;
        if (animRef.current) animRef.current.cancel();

        animRef.current = layer.animate(
            [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }],
            { duration: SPIN_MS, easing: "cubic-bezier(.15,.6,.25,1)", fill: "forwards" }
        );
    }, [scans]);

    
    // Phase 6: Render
    // A fixed, full-screen wrapper whose circular clip-path grows from the bulb on the first scan.
    // Inside it, the oversized pattern layer that does the spinning.
    return (
        <div
            aria-hidden="true"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                overflow: "hidden",
                pointerEvents: "none",
                // circle opens from the bulb; the wrapper never rotates so the origin stays put
                clipPath: `circle(${revealed ? "150vmax" : "0px"} at ${origin.x}px ${origin.y}px)`,
                transition: "clip-path 1.4s cubic-bezier(.2,.7,.2,1)",
            }}
        >
            {/* the big layer only exists after the first scan, so it costs nothing before that */}
            {revealed && (
                <div
                    ref={layerRef}
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: "150vmax", // >= viewport diagonal, so no corner shows while rotated
                        height: "150vmax",
                        margin: "-75vmax 0 0 -75vmax",
                        backgroundImage: PATTERN,
                    }}
                />
            )}
        </div>
    );
}

export default ChevronBackground;