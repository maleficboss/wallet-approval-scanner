import { SEPOLIA_CHAIN_ID, tokenAbi, waitForReceipt } from "./chain";
import { truncateAddress } from "./format";
import ApprovalRow from "./ApprovalRow";
import Input from "./Input";
import ChevronBackground from "./ChevronBackground";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ethers } from "ethers";

// backend base URL: localhost in development, the deployed backend in production
const API_URL = import.meta.env.VITE_API_URL;

function App(){
    // Phase 2: State
    // Everything the page has to remember between renders, in four groups:
    // the scan itself, the "Last scanned" timer, the bulb/background animation,
    // and the wallet and revoke flow.
    // scan: results, what is typed in the field, and the loading / error / searched flags
    const [revoke, setRevoke] = useState([]);
    const [paste, setPasted] = useState("");
    const [loading, setLoading] = useState(false);
    // true once a scan has run past 5s, usually because the free-tier server is waking up
    const [slow, setSlow] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    // timer: seconds since the last successful scan
    const [timer, setTimer] = useState(0)

    // counts successful scans. 0 = nothing scanned yet: no "Last scanned" line, no timer running
    const [lastScan, setLastScan] = useState(0);

    // animation
    // scans = how many valid scans have been started, drives the chevron background
    const [scans, setScans] = useState(0);
    // viewport position of the bulb, the chevrons open from here
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const glassRef = useRef(null);
    // true while the mouse is over the Scan button; relights the bulb after a successful scan
    const [hovering, setHovering] = useState(false);

    // wallet and revoke flow
    // scannedAddress: checksummed address of the last successful scan; only this wallet may revoke
    // account: the connected wallet's address, set by connectWallet and the accountsChanged listener; shown on the Connect button.
    // status: revoke progress per approval, keyed by getApprovalKey: { state, hash }
    // walletError: wallet problems, kept apart from error so they don't hide the results table
    const [scannedAddress, setScannedAddress] = useState("");
    const [account, setAccount] = useState(null);
    const [status, setStatus] = useState({});
    const [walletError, setWalletError] = useState("");
    const [connecting, setConnecting] = useState(false);

    // Phase 3: Values worked out from state
    // Recalculated on every render instead of being stored, so they can never go stale.

    // isValid: the field holds a valid eth address (same check scan() uses)
    // bulbOn: for a valid address, lit until it has been scanned successfully, during a scan,
    // and while the mouse is over the Scan button. searched is true once a scan of the current
    // field value has succeeded, and goes back to false when the field changes.
    // canScan: the Scan button is clickable only for a valid address, and not mid-scan.
    // It also sets the button's faded look (no valid address yet), so faded always means "can't click";
    // mid-scan the button uses its grey "Scanning..." style instead.
    // The bulb alone shows "already scanned".
    // showHint: the field has text that isn't a valid address. The button is disabled then and
    // Enter doesn't submit, so scan()'s own error can't appear; this hint tells the user why.
    const isValid = ethers.isAddress(paste);
    const bulbOn = isValid && (loading || !searched || hovering);
    const canScan = isValid && !loading;
    const showHint = paste !== "" && !isValid;
    const centered = { textAlign: "center" };
    // heading and subtitle paint above the bulb's glow (Bulb is zIndex 0), like Input's field and button.
    // Without it, plain text is painted under any positioned element, so the glow covered it.
    const aboveBulb = { position: "relative", zIndex: 1 };

    // Phase 4: Find the bulb on screen
    // measureBulb() reads where the bulb's glass sits in the viewport and returns its centre.
    // The layout effect runs it once on load and again on every resize,
    // so the chevron background always opens from the bulb.
    function measureBulb(){
        const el = glassRef.current;
        if(!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // keep the origin correct on load and when the window is resized
    useLayoutEffect(() => {
        function update(){
            const pos = measureBulb();
            if(pos) setOrigin(pos);
        }
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);


    // Phase 5: Typing in the wallet field
    // Keeps the input controlled and resets "searched", so the
    // "No approvals found" message disappears as soon as the address is edited.
    function handleInputChange(e){
        // take what was typed and store it as the field's value
        const {value} = e.target;
        setPasted(value);
        setSearched(false);
    }

    // Phase 6: Scan the wallet
    // Runs when the form is submitted. Clears the last result, rejects an invalid
    // address before any request is sent, starts the background spin, then calls the backend.
    // On success it stores the approvals, drops old revoke statuses (except revokes still
    // in progress), saves the checksummed address that was scanned, restarts the timer,
    // and switches the bulb off. On failure it shows the backend's message and the bulb
    // stays lit for a retry. finally always turns loading off.
    async function scan (e){
        e.preventDefault();
        // clear old data states
        setError(null);
        setRevoke([]);
        // back to false so a failed re-scan leaves the bulb lit
        setSearched(false);

        // check if it is a valid eth address. The disabled button already stops this case,
        // so this is a backstop in case the form is ever submitted another way
        if(!ethers.isAddress(paste)){
            setError("This is not a valid Eth address, the wallet must start with prefix '0x'!");
            return;
        }

        setLoading(true);
        const slowTimer = setTimeout(() => setSlow(true), 5000);

        // start the chevron reveal + one 3s spin (only for a real scan, not a rejected address)
        const pos = measureBulb();
        if(pos) setOrigin(pos);
        setScans((count) => count + 1);

        try{
            const res = await fetch(`${API_URL}/approvals/${paste}`);
            const parsed = await res.json();
            // res.ok: the backend answered with a 2xx status
            if(res.ok){
                setRevoke(parsed.data);
                // keep only statuses whose revoke is still running; inFlightKeys is declared
                // further down, which is fine because scan only runs after App has finished rendering
                setStatus((prev) => {
                    return Object.fromEntries(
                        Object.entries(prev).filter(([key]) => inFlightKeys.current.has(key))
                    )
                })
                setScannedAddress(ethers.getAddress(paste));
                setTimer(0);
                setLastScan((count) => count + 1); // first success starts the Last scanned timer
                setSearched(true);
                // bulb off even if the mouse is still on the button; the next hover relights it
                setHovering(false);
            }else{
                // 400 invalid address, 429 busy or 500 failure: show the backend's message
                setError(parsed.error || "Unable to get blockchain history.");
            }
        }
        catch{
            // the request never got an answer, or the answer wasn't JSON
            setError("Server down or connection timed out");
        } finally{
            setLoading(false);
            clearTimeout(slowTimer);
            setSlow(false);
        }
    }

    
    // Phase 7: Connect the wallet
    // eth_requestAccounts opens the wallet's connect prompt. The first account (checksummed)
    // is stored and shown on the Connect button. Cancelling the prompt gives ACTION_REJECTED.

    async function connectWallet(){
        setWalletError("");

        if(!window.ethereum) {
            setWalletError("No browser wallet found. Install one, such as MetaMask.");
            return;
        }
        setConnecting(true);

        try{
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const  accounts = await browserProvider.send("eth_requestAccounts", []);

            if(accounts && accounts.length > 0){
                const normalised = ethers.getAddress(accounts[0]);
                setAccount(normalised);
            }

        }catch(error){
            console.error(error.code, error.message);
            if(error.code === "ACTION_REJECTED"){
                setWalletError("Connection was cancelled.");
            }else{
                setWalletError("Couldn't connect to your wallet. Try again.");
            }
        }finally{
            setConnecting(false);
        }
    }

    // Phase 8: Follow wallet changes
    // Listens for the user switching account in the wallet and updates state.
    // An empty account list means the wallet was disconnected or locked.
    // On load, eth_accounts (no prompt) restores an account the site is already authorized for.
    // The cleanup removes the listener when App unmounts.
    
    useEffect(() => {
        if(!window.ethereum) return;

        function accountsChanged(accounts){

            if(!accounts || accounts.length === 0){
                setAccount(null);
            }else{
                const normalised = ethers.getAddress(accounts[0]);
                setAccount(normalised);
            }
        }

        window.ethereum.on("accountsChanged", accountsChanged);

        window.ethereum.request({method: "eth_accounts"})
            .then(accountsChanged)
            .catch(() => {});

        return () => {
            window.ethereum.removeListener("accountsChanged", accountsChanged);
        }

    }, []);

    // Phase 9: Revoke guards
    // getRevokeBlocker asks the wallet directly (eth_accounts, which opens no prompt) instead of
    // trusting account state. It returns the first problem as a message, or null when a
    // revoke can go ahead. Checks in order: a wallet exists, it's connected, it's on Sepolia,
    // and it's the same wallet that was scanned.
    async function getRevokeBlocker(){
        if(!window.ethereum) return "No browser wallet found. Install one, such as MetaMask, to revoke.";

        try{
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const  accounts = await browserProvider.send("eth_accounts", []);
            if(!accounts || accounts.length === 0){
                return "Connect your wallet to revoke.";
            }

            const connectedAddress = ethers.getAddress(accounts[0]);
            const network = await browserProvider.getNetwork();
            const networkId = Number(network.chainId);

            if(networkId !== SEPOLIA_CHAIN_ID){
                return "Switch your wallet to Ethereum Sepolia."
            }
            if(connectedAddress !== scannedAddress){
                return "Connect the wallet you scanned.";
            }
        }catch(error){
            console.error(error.message);
            return "Couldn't check your wallet. Try again.";
        }

        return null;
    }

    // getApprovalKey names one approval as "owner-token-spender", all checksummed.
    // Statuses are keyed by this, not by row id, because ids are positions and can shift between scans.
    function getApprovalKey(scannedAddress, token, spender){
        return `${ethers.getAddress(scannedAddress)}-${ethers.getAddress(token)}-${ethers.getAddress(spender)}`;
    }
    // inFlightKeys holds the keys of revokes in progress. It's a ref, not state, so it updates
    // immediately without a re-render: a double click can't start two transactions for one approval.
    const inFlightKeys = useRef(new Set());

    // Phase 10: "Last scanned" timer
    // Does nothing until the first successful scan. Each new success changes lastScan,
    // which clears the old interval and starts a fresh one that counts up every second.
    useEffect(() => {
        if(lastScan === 0) return;
        const interval = setInterval(() => {
            setTimer((previous) => previous + 1);
        }, 1000);

        return () =>{
         clearInterval(interval);}
    }, [lastScan]);


    // Phase 11: Revoke on-chain
    // updateStatus sets a new state for one approval and merges in extras such as the hash.
    function updateStatus(key, state, extra){
        setStatus(prev => ({...prev, [key] : {...prev[key], state, ...extra}}));
    }

    // handleRevoke sends approve(spender, 0) from the scanned wallet, then confirms the result.
    // 1. Find the row and its key. Ignore the click if that approval is already being revoked.
    // 2. Run the guards, then check the signer itself, since that's the account that will sign.
    // 3. Send the transaction: "awaiting-wallet" while the wallet prompt is open,
    //    then "confirming" with the hash once it's sent (the row shows an Etherscan link).
    // 4. Wait for the receipt: none after about 3 minutes = "unconfirmed"; reverted = "failed".
    // 5. Read the allowance back: 0 = "revoked", anything else = "failed".
    // 6. On an error: user rejected = clear the status so the button says "Revoke" again;
    //    error after sending = "unconfirmed" (it may still be mined, so no second send);
    //    error before sending = "failed".
    // 7. finally always frees the key, including after an early return.
    async function handleRevoke(id){
        // Step 1: find the row and lock its key
        const row = revoke.find(rev => rev.id === id);
        if(!row) return;
        const key = getApprovalKey(scannedAddress, row.token, row.spender);

        if(inFlightKeys.current.has(key)){
            return;
        }

        inFlightKeys.current.add(key);
        setWalletError("");
        let sentHash = null;

        try{
            // Step 2: guards; a blocked revoke shows its reason and leaves the row as it was
            const blocker = await getRevokeBlocker();
            if(blocker !== null) {
                setWalletError(blocker);
                return;
            }

            const bProvider = new ethers.BrowserProvider(window.ethereum);
            const signer = await bProvider.getSigner();
            const resolvedSigner = await signer.getAddress();
            if(resolvedSigner !== scannedAddress){
                setWalletError("Connect the wallet you scanned.");
                return;
            }

            // Step 3: send approve(spender, 0)
            const contract = new ethers.Contract(row.token, tokenAbi, signer);
            updateStatus(key, "awaiting-wallet");
            const tx = await contract.approve(row.spender, 0n);
            sentHash = tx.hash;
            updateStatus(key, "confirming", {hash: tx.hash});

            // Step 4: wait for it to be mined
            let receipt = await waitForReceipt(bProvider, tx.hash);

            if(receipt === null){
                updateStatus(key, "unconfirmed");
                return;
            }
            if(receipt.status !== 1){
                updateStatus(key, "failed");
                return;
            }

            // Step 5: read the allowance back (read-only contract, provider instead of signer)
            const secContract = new ethers.Contract(row.token, tokenAbi, bProvider);
            const read = await secContract.allowance(scannedAddress, row.spender);

            if(read === 0n){
                updateStatus(key, "revoked");

            }else{
                updateStatus(key, "failed");
            }
        } catch(error){
            // Step 6: sort the error by how far the revoke got
            console.error(error.code, error.message);
            if(error.code === "ACTION_REJECTED"){
                setStatus(prev => {
                    const nextStatus = {...prev};
                    delete nextStatus[key];
                    return nextStatus;
                })
            }else if(sentHash !== null){
                updateStatus(key, "unconfirmed");
            }else{
                updateStatus(key, "failed");
            }
        }finally{
            // Step 7: free the key
            inFlightKeys.current.delete(key);
        }
    }


    // Phase 12: Render
    // Draws the background, the heading, the Connect button and the form (with the bulb),
    // the invalid-address hint, the subtitle, then the status messages, then the results table
    // when there are rows to show.
    return (
        <div style={{ position: "relative", minHeight: "100vh", color: "#e6e6e6" }}>
            {/* background: hidden until the first valid scan, then opens from the bulb */}
            <ChevronBackground scans={scans} origin={origin} />

            {/* content column, stacked above the background */}
            <div style={{
                position: "relative", zIndex: 2,
                display: "flex", flexDirection: "column", alignItems: "center",
                // pushes the form to the middle of the screen; the 140px floor leaves room for the bulb
                // the form keeps this position when results appear below it
                paddingTop: "max(140px, calc(50vh - 70px))",
                paddingBottom: "40px", paddingLeft: "15px", paddingRight: "15px"
            }}>
                {/* heading, Connect button, form and subtitle
                    The form's submit runs scan(); the submit button lives inside Input.
                    The subtitle sits below the form: above it, the lit bulb's glow made it unreadable. */}
                <h2 style={aboveBulb}>Wallet Approval Scanner</h2>
                <button onClick={connectWallet} disabled={connecting}>
                    {connecting ? "Connecting..." : account ? truncateAddress(account) : "Connect wallet"}
                </button>
                <form onSubmit={scan}>
                    <Input value={paste} onInputChange={handleInputChange} loading={loading}
                        bulbOn={bulbOn} canScan={canScan} onHoverChange={setHovering} glassRef={glassRef}/>
                </form>
                {/* hint under the field: text that isn't an address, e.g. a truncated paste */}
                {showHint && (
                    <p style={{...aboveBulb, ...centered, margin: "8px 0 0", fontSize: "13px", color: "#f87171"}}>
                        Not a valid Ethereum address.
                    </p>
                )}
                <p style={{...aboveBulb, ...centered, maxWidth: "520px"}}>
                    Scan ERC-20 approvals in the last hour only on Ethereum Sepolia (Test Network).
                    No mainnet approvals will appear.
                </p>

                {/* status messages: these can stack, e.g. "Last scanned" stays during a re-scan,
                    and a wallet message (orange) can sit above the table.
                    "No approvals found" needs a finished scan with no rows and a non-empty field. */}
                {lastScan > 0 && <p style={centered}>Last scanned: {timer}s ago</p>}
                {loading && <p style={centered}>{slow ? "Waking up the server. The first scan after a quiet spell can take up to a minute." : "loading approvals..."}</p>}
                {error && <p style={{...centered, color: "red", fontWeight: "bold"}}>{error}</p>}
                {walletError && <p style={{...centered, color: "#f5a524", fontWeight: "bold"}}>{walletError}</p>}
                {!loading && !error && searched && revoke.length === 0 && paste &&  <p style={centered}>No approvals found in the last hour.</p>}

                {/* results table: one ApprovalRow per approval the backend returned.
                    Each row gets its revoke status by its approval key. */}
                {!loading && !error && revoke.length > 0 && (
                    // dark panel so the table stays readable over the chevrons
                    <div style={{
                        marginTop: "24px", padding: "16px", maxWidth: "100%", overflowX: "auto",
                        background: "rgba(0, 0, 0, 0.78)", borderRadius: "8px"
                    }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Id</th>
                                    <th>Token</th>
                                    <th>Amount</th>
                                    <th>Spender</th>
                                    <th>Revoke Approval</th>
                                </tr>
                            </thead>
                            <tbody>
                                {revoke.map((rev) => {
                                    const key = getApprovalKey(scannedAddress, rev.token, rev.spender);
                                    return (
                                        <ApprovalRow onRevoke={handleRevoke} status={status[key]}
                                            isUnlimited={rev.isUnlimited} key={rev.id} id={rev.id} token={rev.token}
                                            spender={rev.spender} amount={rev.amount} decimals={rev.decimals} symbol={rev.symbol}
                                        />
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;