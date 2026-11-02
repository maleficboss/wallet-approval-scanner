import Bulb from "./Bulb";

/*
Props (all from App):
value=what App holds in "paste", the text in the field
onInputChange=App's handleInputChange, called on every keystroke
loading=true while a scan is running
bulbOn=true when the bulb should be lit (App decides: valid address, not yet scanned, scanning or hovered)
canScan=true when the Scan button may be clicked (valid address and no scan running); also sets its faded look
onHoverChange=App's setHovering, told when the mouse enters (true) or leaves (false) the Scan button
glassRef=passed through to Bulb so App can find the bulb on screen
Must sit inside App's <form>: the Scan button is type="submit".
*/

function Input({onInputChange, value, loading, bulbOn, canScan, onHoverChange, glassRef}){
    // Phase 1: Render the scan row
    // A controlled text field and the Scan button side by side.
    // The field is disabled while a scan is running. The button is disabled until the field
    // holds a valid address and while a scan is running, so a second request can't start mid-scan.
    return(
        <div style={{ display: "flex", gap: "7px", alignItems: "center"}}>

            {/* Phase 2: Wallet field
                Shows whatever App holds in "paste" and reports every keystroke back up to App.
                position relative + zIndex 1 keep it above the bulb's glow. */}
            <input
                name="wallet" value={value}
                placeholder="paste your wallet" onChange={(e) => onInputChange(e)}
                disabled={loading}
                style={{padding: "8px", width: "310px", position: "relative", zIndex: 1}}
            />

            {/* Phase 3: Bulb and Scan button
                The bulb sits above the button. The button is faded while there's no valid address,
                grey with "Scanning..." during a scan, and solid whenever it can be clicked. It doesn't follow
                the bulb: after a scan the bulb goes off but the button stays clickable, and a phone
                has no hover to relight it, so a faded button there would look dead.
                The hover handlers sit on the wrapper, not the button: React doesn't fire onMouseEnter
                on a disabled button, and the button is disabled mid-scan.
                The bulb has pointerEvents none, so only the button's area counts as hovering.
                The button submits the form in App and switches its label and colour while loading. */}
            {/* wrapper so the bulb is always centered above the button */}
            <div
                style={{ position: "relative", display: "flex" }}
                onMouseEnter={() => onHoverChange(true)}
                onMouseLeave={() => onHoverChange(false)}
            >
                <Bulb on={bulbOn} glassRef={glassRef} />
                <button
                    type="submit" disabled={!canScan} style={{
                        position: "relative", zIndex: 1,
                        padding: "8px 15px", cursor: canScan ? "pointer" : "not-allowed",
                        color: loading ? "#666666" : "#ffffff",
                        backgroundColor: loading ? "#cccccc" : "#0070f3", border: "none",
                        borderRadius: "4px", transition: "all 0.2s ease",
                        // mid-scan the grey "Scanning..." style is the disabled look; fading it too hid the label
                        opacity: canScan || loading ? 1 : 0.3
                    }}
                >
                    {loading ? "Scanning..." : "Scan wallet"}
                </button>
            </div>
        </div>
    );
}

export default Input;