import { useEffect, useState } from "react";
import { CopyIcon, CheckIcon } from "./icons";

/*
Props:
value=the text to copy (a full address)
label=what the button does, read by screen readers, e.g. "Copy spender address"
filled=true for the grey round version used next to the scanned address
*/

function CopyButton({ value, label, filled }){
    // Phase 1: "Copied" feedback
    // copied flips to true after a successful copy; the effect flips it back after 1.5s,
    // and the cleanup cancels that timer if the button disappears first.
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if(!copied) return;
        const timer = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(timer);
    }, [copied]);

    // Phase 2: Copy
    // The clipboard API can refuse (non-HTTPS page, permission denied). Then nothing happens:
    // the full address is still on the hover title for the user to copy by hand.
    async function copy(){
        try{
            await navigator.clipboard.writeText(value);
            setCopied(true);
        }catch{
            // clipboard unavailable; leave the button as it was
        }
    }

    return (
        <button
            type="button" className={filled ? "icon-btn is-filled" : "icon-btn"}
            onClick={copy} aria-label={copied ? "Copied" : label} title={copied ? "Copied" : label}
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
    );
}

export default CopyButton;
