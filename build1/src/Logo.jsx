// The NAC mark: an open "C" ring around an "NA" monogram, drawn on a 64x64 grid.
// It takes its colour from the surrounding text (currentColor), so the same mark
// works black on the white disc and in the nav.
// This is a hand-drawn approximation of the mockup. If you have the original SVG,
// replace the <path> elements below with it and keep the props.
function Logo({ size = 24, className }){
    return (
        <svg
            viewBox="0 0 64 64" width={size} height={size} className={className}
            fill="none" stroke="currentColor" strokeWidth="5.5" aria-hidden="true"
        >
            {/* the C: a circle with a gap on the right */}
            <path d="M52.6 16.4A26 26 0 1 0 52.6 47.6" strokeLinecap="butt" />
            {/* N, sharing its last stroke with the A */}
            <path d="M20.5 45V19.5l13.5 25.5 6.5-25.5 7.5 25.5" strokeLinejoin="miter" strokeLinecap="butt" />
            {/* the A's bar, run out to meet the C */}
            <path d="M37.5 36.5h15" strokeLinecap="butt" />
        </svg>
    );
}

export default Logo;
