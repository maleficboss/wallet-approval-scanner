import Logo from "./Logo";
import { ArrowUpRight, ArrowRight, ArrowDownRight } from "./icons";

/*
Props (all from App):
phase="idle", "loading", "error" or "results"; decides what the disc shows
slow=true once a scan has run past 5s (free-tier server waking up)
ready=true when the field holds a valid address that hasn't been scanned yet
total=approvals found by the last scan
*/

// The three steps on the right. bend picks which way the line under each one kinks.
const STEPS = [
    { num: "01", title: "Paste an address", Arrow: ArrowUpRight, bend: "up" },
    { num: "02", title: "See what's still approved", Arrow: ArrowRight, bend: "down" },
    { num: "03", title: "Connect and revoke", Arrow: ArrowDownRight, bend: "up" },
];

// The lines are drawn on a 100x28 box that is stretched to the step's width
// (preserveAspectRatio="none"); vector-effect keeps the stroke 1px however wide it gets.
const BENDS = {
    up: "M0 22H46C56 22 56 6 66 6H100",
    down: "M0 6H46C56 6 56 22 66 22H100",
};

// Ring sizes as multiples of the disc's diameter.
const RINGS = [1.55, 2.15, 2.9, 3.8, 4.9];

function Stage({ phase, slow, ready, total }){
    // Phase 1: Caption under the disc
    // There is none once results are in: the disc itself says what was found.
    let caption = null;
    if(phase === "loading"){
        caption = slow
            ? "Waking up the server. The first scan after a quiet spell can take up to a minute."
            : "Scanning the last hour…";
    }else if(phase === "error"){
        caption = "The scan didn't finish.";
    }else if(phase === "idle"){
        caption = ready ? "Ready to scan" : "Waiting for an address";
    }

    // Phase 2: What sits inside the disc
    // results: the count on a black disc. Otherwise the logo, with a spinning ring while scanning.
    const isResults = phase === "results";
    let inside;
    if(isResults){
        inside = (
            <div>
                <div className="disc-count">{total}</div>
                <div className="disc-sub">{total === 1 ? "approval found" : "approvals found"}</div>
            </div>
        );
    }else{
        inside = (
            <>
                {phase === "loading" && <span className="disc-spinner" aria-hidden="true" />}
                <Logo className="disc-logo" />
            </>
        );
    }

    // Phase 3: Render
    // The rings sit behind the disc, centred on it. role="status" makes screen readers
    // announce the count or the caption when it changes.
    return (
        <div className="stage">
            <div className="disc-wrap">
                <div className="rings" aria-hidden="true">
                    {RINGS.map((scale) => (
                        <span key={scale} className="ring" style={{ "--ring": scale }} />
                    ))}
                </div>
                <div role="status" className="disc-status">
                    <div className={isResults ? "disc is-results" : "disc"}>{inside}</div>
                    {caption && <p className={phase === "error" ? "disc-caption is-error" : "disc-caption"}>{caption}</p>}
                </div>
            </div>

            <ol className="steps">
                {STEPS.map(({ num, title, Arrow, bend }) => (
                    <li key={num} className="step">
                        <div className="step-top">
                            <span className="step-num">{num}</span>
                            <Arrow size={13} />
                        </div>
                        <p className="step-title">{title}</p>
                        <svg className="step-line" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
                            <path d={BENDS[bend]} fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        </svg>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default Stage;
