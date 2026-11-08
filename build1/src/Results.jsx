import ApprovalRow from "./ApprovalRow";
import CopyButton from "./CopyButton";
import { truncateAddress } from "./format";
import { addressUrl } from "./links";
import { ArrowUpRight, InfoIcon } from "./icons";

/*
Props (all from App):
scannedAddress=checksummed address of the last successful scan
rows=the approvals that scan returned (App's revoke)
statusFor=function: row -> that row's revoke status, looked up by its approval key
onRevoke=App's handleRevoke
onScanAgain=rescans scannedAddress
scanning=true while a scan is running (disables "Scan again")
lastScanned=the "Last scanned" text, e.g. "6s ago"
*/

function Results({ scannedAddress, rows, statusFor, onRevoke, onScanAgain, scanning, lastScanned }){
    // Phase 1: Render
    // A summary card, the gas notice, then the table, or an empty state when nothing came back.
    // The caption under the table says what a short or empty list does and doesn't mean.
    return (
        <section className="results" id="open-approvals" aria-labelledby="results-title">
            <h2 className="section-title" id="results-title">Open approvals</h2>

            <div className="card summary">
                <div className="summary-address">
                    <div className="stat-label">Scanned address</div>
                    <div className="scanned">
                        <span className="scanned-address" title={scannedAddress}>{truncateAddress(scannedAddress)}</span>
                        <CopyButton value={scannedAddress} label="Copy scanned address" filled />
                        <a className="text-link" href={addressUrl(scannedAddress)} target="_blank" rel="noopener noreferrer">
                            Sepolia Etherscan <ArrowUpRight size={10} />
                        </a>
                    </div>
                </div>
                <div className="stat">
                    <div className="stat-label">Approvals</div>
                    <div className="stat-value">{rows.length}</div>
                </div>
                <div className="stat">
                    <div className="stat-label">Last scanned</div>
                    <div className="stat-value">{lastScanned}</div>
                </div>
                <button type="button" className="btn-outline btn-small" onClick={onScanAgain} disabled={scanning}>
                    Scan again
                </button>
            </div>

            <p className="notice">
                <InfoIcon />
                <span>Revoke sends approve(spender, 0) from your connected wallet, so each one costs a little Sepolia ETH in gas.</span>
            </p>

            {rows.length > 0 ? (
                <div className="card table-card">
                    <table className="approvals" role="table">
                        <thead role="rowgroup">
                            <tr role="row">
                                <th role="columnheader" scope="col">Asset</th>
                                <th role="columnheader" scope="col">Approved amount</th>
                                <th role="columnheader" scope="col">Approved spender</th>
                                <th role="columnheader" scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody role="rowgroup">
                            {rows.map((row) => (
                                <ApprovalRow
                                    key={row.id} id={row.id} token={row.token} spender={row.spender}
                                    amount={row.amount} decimals={row.decimals} symbol={row.symbol}
                                    isUnlimited={row.isUnlimited} status={statusFor(row)} onRevoke={onRevoke}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty">
                    <p className="empty-title">No approvals found in about the last hour.</p>
                </div>
            )}

            <p className="caption">
                ERC-20 approvals from about the last hour on Ethereum Sepolia. A short or empty list
                doesn't mean the wallet has no older approvals or NFT approvals.
            </p>
        </section>
    );
}

export default Results;
