import Bulb from "./Bulb";

/*
Props (all from App):
value=what App holds in "paste", the text in the field
onInputChange=App's handleInputChange, called on every keystroke
loading=true while a scan is running
bulbOn=true when value is a valid address
glassRef=passed through to Bulb so App can find the bulb on screen
Must sit inside App's <form>: the Scan button is type="submit".
*/

function Input({onInputChange, value, loading, bulbOn, glassRef}){
    // Phase 1: Render the scan row
    // A controlled text field and the Scan button side by side.
    // Both are disabled while a scan is running, so a second request can't start mid-scan.
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
                The bulb sits above the button and lights up once the field holds a valid address.
                The button submits the form in App and switches its label and colour while loading. */}
            {/* wrapper so the bulb is always centered above the button */}
            <div style={{ position: "relative", display: "flex" }}>
                <Bulb on={bulbOn} glassRef={glassRef} />
                <button
                    type="submit" disabled={loading} style={{
                        position: "relative", zIndex: 1,
                        padding: "8px 15px", cursor: loading ? "not-allowed" : "pointer",
                        color: loading ? "#666666" : "#ffffff",
                        backgroundColor: loading ? "#cccccc" : "#0070f3", border: "none",
                        borderRadius: "4px", transition: "all 0.2s ease"
                    }}
                >
                    {loading ? "Scanning..." : "Scan wallet"}
                </button>
            </div>
        </div>
    );
}

export default Input;