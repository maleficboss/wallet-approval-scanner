/*
Props (all from App):
value=the text in the field (App's paste)
onChange=App's handleInputChange, called on every keystroke
onSubmit=App's handleSubmit, which runs the scan
loading=true while a scan is running: the field is locked and the button says "Scanning…"
canScan=true when the button may be clicked (valid address and no scan running)
showHint=true when the field holds text that isn't a valid address
error=the scan's error message, or null
*/

function ScanForm({ value, onChange, onSubmit, loading, canScan, showHint, error }){
    // Phase 1: The message under the field
    // The invalid-address hint wins over a scan error. If the field is invalid now,
    // the error is about an earlier attempt, and the hint is what the user needs.
    const message = showHint ? "Not a valid Ethereum address." : error;

    // Phase 2: Button look
    // Faded while there is no valid address (CSS :disabled), grey "Scanning…" mid-scan,
    // solid black whenever it can be clicked.
    const buttonClass = loading ? "btn-primary is-busy" : "btn-primary";

    // Phase 3: Render
    // The label is tied to the field by htmlFor/id, and the message by aria-describedby,
    // so a screen reader reads both when the field is focused.
    return (
        <form onSubmit={onSubmit} noValidate>
            <label className="field-label" htmlFor="wallet">Wallet address</label>
            <div className="scan-row">
                <input
                    id="wallet" name="wallet" className="address-input"
                    value={value} onChange={onChange} disabled={loading}
                    placeholder="0x… paste a Sepolia address"
                    autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    aria-invalid={showHint} aria-describedby={message ? "wallet-msg" : undefined}
                />
                <button type="submit" className={buttonClass} disabled={!canScan}>
                    {loading ? "Scanning…" : "Scan wallet"}
                </button>
            </div>
            {message && <p id="wallet-msg" className="field-msg" role="alert">{message}</p>}
        </form>
    );
}

export default ScanForm;
