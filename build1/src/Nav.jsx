import { useEffect, useState } from "react";
import Logo from "./Logo";
import { ArrowUpRight } from "./icons";
import { truncateAddress } from "./format";
import { REPO_URL } from "./links";

/*
Props (all from App):
account=the connected wallet's address, or null
connecting=true while the wallet's connect prompt is open
onConnect=App's connectWallet
*/

// The page sections the tabs jump to, in the order they appear on the page.
const TABS = [
    { id: "scan", label: "Scan" },
    { id: "how-it-works", label: "How it works" },
    { id: "limits", label: "Limits" },
];

function Nav({ account, connecting, onConnect }){
    // Phase 1: Which tab is active
    // On every scroll, the active tab is the last section whose top has passed 40% of the way
    // down the screen. At the very bottom of the page the last tab wins, because the Limits
    // section is too close to the end to ever reach that line on a tall screen.
    // The Open approvals section sits between Scan and How it works, so it keeps "Scan" active.
    const [active, setActive] = useState("scan");

    useEffect(() => {
        function onScroll(){
            const line = window.innerHeight * 0.4;
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
            let current = TABS[0].id;

            for (const tab of TABS){
                const section = document.getElementById(tab.id);
                if(section && section.getBoundingClientRect().top <= line) current = tab.id;
            }
            setActive(atBottom ? TABS[TABS.length - 1].id : current);
        }

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    // Phase 2: Connect button label
    // Black "Connect wallet" until a wallet is connected, then a white pill with the short address.
    // Clicking while connected runs connectWallet again, which lets the user pick another account.
    let connectLabel = "Connect wallet";
    if(connecting) connectLabel = "Connecting…";
    else if(account) connectLabel = truncateAddress(account);

    // Phase 3: Render
    // The tabs are hidden on phones (CSS); the logo and the Connect button stay.
    return (
        <header className="nav">
            <div className="nav-left">
                <a className="logo-btn" href="#scan" aria-label="Wallet Approval Scanner, back to top">
                    <Logo size={26} />
                </a>
                <nav className="tabs" aria-label="Sections">
                    {TABS.map((tab) => (
                        <a
                            key={tab.id} href={`#${tab.id}`} className="tab"
                            aria-current={active === tab.id ? "true" : undefined}
                        >
                            {tab.label}
                        </a>
                    ))}
                    <a className="tab" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                        GitHub <ArrowUpRight size={11} />
                    </a>
                </nav>
            </div>
            <button
                type="button" className={`connect${account && !connecting ? " is-connected" : ""}`}
                onClick={onConnect} disabled={connecting} title={account || undefined}
            >
                {connectLabel}
            </button>
        </header>
    );
}

export default Nav;
