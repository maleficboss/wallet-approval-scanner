// Small line icons drawn on a 16x16 grid. They take their colour from the text around them
// (currentColor) and are hidden from screen readers: the button or link they sit in
// carries the label.
const base = {
    viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.75,
    strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true
};

export function ArrowUpRight({ size = 14 }){
    return <svg {...base} width={size} height={size}><path d="M5 11 11 5M6 5h5v5" /></svg>;
}

export function ArrowRight({ size = 14 }){
    return <svg {...base} width={size} height={size}><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
}

export function ArrowDownRight({ size = 14 }){
    return <svg {...base} width={size} height={size}><path d="M5 5l6 6M11 6v5H6" /></svg>;
}

export function ArrowDown({ size = 14 }){
    return <svg {...base} width={size} height={size}><path d="M8 3v10M4 9l4 4 4-4" /></svg>;
}

export function CopyIcon({ size = 14 }){
    return (
        <svg {...base} width={size} height={size}>
            <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" />
            <path d="M10.5 3h-6A1.5 1.5 0 0 0 3 4.5v6" />
        </svg>
    );
}

export function CheckIcon({ size = 14 }){
    return <svg {...base} width={size} height={size}><path d="M3.5 8.5l3 3 6-7" /></svg>;
}

export function InfoIcon({ size = 14 }){
    return (
        <svg {...base} width={size} height={size}>
            <circle cx="8" cy="8" r="6.25" />
            <path d="M8 7.25V11M8 5h.01" />
        </svg>
    );
}

export function WarningIcon({ size = 13 }){
    return (
        <svg {...base} width={size} height={size}>
            <path d="M8 2.5 14 13H2L8 2.5Z" />
            <path d="M8 6.75v2.75M8 11.25h.01" />
        </svg>
    );
}

export function CloseIcon({ size = 14 }){
    return <svg {...base} width={size} height={size}><path d="M4 4l8 8M12 4l-8 8" /></svg>;
}
