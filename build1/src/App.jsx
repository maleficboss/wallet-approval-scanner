import { SEPOLIA_CHAIN_ID, tokenAbi, waitForReceipt } from "./chain";
import { formatAgo } from "./format";
import { REPO_URL, X_URL } from "./links";
import { ArrowDown } from "./icons";
import Logo from "./Logo";
import Nav from "./Nav";
import ScanForm from "./ScanForm";
import Stage from "./Stage";
import Results from "./Results";
import About from "./About";
import Footer from "./Footer";
import Toast from "./Toast";
import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";

// backend base URL: localhost in development, the deployed backend in production
const API_URL = import.meta.env.VITE_API_URL;

function App(){
    // Phase 2: State
    // Everything the page has to remember between renders, in three groups:
    // the scan itself, the "Last scanned" timer, and the wallet and revoke flow.
    // scan: results, what is typed in the field, and the loading / error / searched flags
    const [revoke, setRevoke] = useState([]);
    const [paste, setPasted] = useState("");
    const [loading, setLoading] = useState(false);
    // true once a scan has run past 5s, usually because the free-tier server is waking up
    const [slow, setSlow] = useState(false);
    const [error, setError] = useState(null);
    // true once a scan of the current field value has succeeded; false again when the field changes
    const [searched, setSearched] = useState(false);

    // timer: seconds since the last successful scan
    const [timer, setTimer] = useState(0)

    // counts successful scans. 0 = nothing scanned yet: no results section, no timer running
    const [lastScan, setLastScan] = useState(0);

    // wallet and revoke flow
    // scannedAddress: checksummed address of the last successful scan; only this wallet may revoke
    // account: the connected wallet's address, set by connectWallet and the accountsChanged listener; shown on the Connect button.
    // status: revoke progress per approval, keyed by getApprovalKey: { state, hash }
    // walletError: wallet problems, kept apart from error so they don't hide the results
    const [scannedAddress, setScannedAddress] = useState("");
    const [account, setAccount] = useState(null);
    const [status, setStatus] = useState({});
    const [walletError, setWalletError] = useState("");
    const [connecting, setConnecting] = useState(false);

    // Phase 3: Values worked out from state
    // Recalculated on every render instead of being stored, so they can never go stale.

    // isValid: the field holds a valid eth address (same check runScan() uses)
    // canScan: the Scan button is clickable only for a valid address, and not mid-scan.
    // showHint: the field has text that isn't a valid address. The button is disabled then and
    // Enter doesn't submit, so runScan()'s own error can't appear; this hint tells the user why.
    const isValid = ethers.isAddress(paste);
    const canScan = isValid && !loading;
    const showHint = paste !== "" && !isValid;

    // phase: what the disc in the middle shows. Results stay up while the field is edited,
    // because the summary card names the address they belong to.
    let phase = "idle";
    if(loading) phase = "loading";
    else if(error) phase = "error";
    else if(lastScan > 0) phase = "results";
    const hasResults = phase === "results";



    // Phase 5: Typing in the wallet field
    // Keeps the input controlled and resets "searched", so the disc goes back to
    // "Ready to scan" for a new address.
    function handleInputChange(e){
        // take what was typed and store it as the field's value
        const {value} = e.target;
        setPasted(value);
        setSearched(false);
    }

    // Phase 6: Scan the wallet
    // handleSubmit runs when the form is submitted and scans what is in the field.
    // "Scan again" calls runScan with the address already scanned, so it can't pick up
    // a half-edited field. runScan clears the last result, rejects an invalid
    // address before any request is sent, then calls the backend.
    // On success it stores the approvals, drops old revoke statuses (except revokes still
    // in progress), saves the checksummed address that was scanned and restarts the timer.
    // On failure it shows the backend's message. finally always turns loading off.
    function handleSubmit(e){
        e.preventDefault();
        runScan(paste);
    }

    function scanAgain(){
        setPasted(scannedAddress);
        runScan(scannedAddress);
    }

    async function runScan(address){
        // clear old data states
        setError(null);
        setRevoke([]);
        setSearched(false);

        // check if it is a valid eth address. The disabled button already stops this case,
        // so this is a backstop in case the form is ever submitted another way
        if(!ethers.isAddress(address)){
            setError("This is not a valid Eth address, the wallet must start with prefix '0x'!");
            return;
        }

        setLoading(true);
        const slowTimer = setTimeout(() => setSlow(true), 5000);

        try{
            const res = await fetch(`${API_URL}/approvals/${address}`);
            const parsed = await res.json();
            // res.ok: the backend answered with a 2xx status
            if(res.ok){
                setRevoke(parsed.data);
                // keep only statuses whose revoke is still running; inFlightKeys is declared
                // further down, which is fine because runScan only runs after App has finished rendering
                setStatus((prev) => {
                    return Object.fromEntries(
                        Object.entries(prev).filter(([key]) => inFlightKeys.current.has(key))
                    )
                })
                setScannedAddress(ethers.getAddress(address));
                setTimer(0);
                setLastScan((count) => count + 1); // first success starts the Last scanned timer
                setSearched(true);
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


    // statusFor looks up one row's revoke status by its approval key.
    function statusFor(row){
        return status[getApprovalKey(scannedAddress, row.token, row.spender)];
    }


    // Phase 12: Render
    // Nav, then the hero: copy and form on the left, the disc and the three steps on the right.
    // Once a scan succeeds, the Open approvals section appears under the hero. How it works, Limits and the footer
    // are always there. Wallet problems show in a toast fixed to the bottom of the screen.
    return (
        <div className="page">
            <div className="container">
                <Nav account={account} connecting={connecting} onConnect={connectWallet} />

                <main>
                    <section className="hero" id="scan" aria-labelledby="hero-title">
                        <div className="hero-copy">
                            <p className="eyebrow">
                                <Logo size={18} /> <strong>NAC</strong> Approval scanner
                            </p>
                            <h1 id="hero-title">Check your approvals</h1>
                            <p className="lede">
                                Paste an Ethereum Sepolia address to list the token approvals it gave in the
                                last hour. Only connect when you intend to revoke.
                            </p>

                            <ScanForm
                                value={paste} onChange={handleInputChange} onSubmit={handleSubmit}
                                loading={loading} canScan={canScan} showHint={showHint} error={error}
                            />

                            <div className="hero-meta">
                                <a className="btn-outline" href="#how-it-works">How it works</a>
                                <span className="meta-note">Testnet only · about one hour of history</span>
                            </div>

                            <div className="icon-links">
                                <a className="icon-link" href={hasResults ? "#open-approvals" : "#how-it-works"} aria-label="Scroll down">
                                    <ArrowDown />
                                </a>
                                <a className="icon-link" href={REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="Source on GitHub">GH</a>
                                <a className="icon-link" href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="maleficboss on X">X</a>
                            </div>
                        </div>

                        <Stage
                            phase={phase} slow={slow} ready={isValid && !searched}
                            total={revoke.length}
                        />
                    </section>

                    {hasResults && (
                        <Results
                            scannedAddress={scannedAddress} rows={revoke} statusFor={statusFor}
                            onRevoke={handleRevoke} onScanAgain={scanAgain} scanning={loading}
                            lastScanned={formatAgo(timer)}
                        />
                    )}

                    <About />
                </main>

                <Footer />
            </div>

            {walletError && <Toast message={walletError} onDismiss={() => setWalletError("")} />}
        </div>
    );
}

export default App;
