import { truncateAddress } from "./format";
import { addressUrl, txUrl } from "./links";
import { ArrowUpRight, CheckIcon, WarningIcon } from "./icons";
import CopyButton from "./CopyButton";
import { ethers } from "ethers";

/*
Props (all from Results, which gets them from App):
id=row number from the backend (1-based); passed back to onRevoke so App can find the row
token=token contract address
spender=address the wallet allowed to move this token
amount=current allowance as a string, the raw on-chain number with no decimals applied
isUnlimited=true when the backend matched amount to max uint256 or max uint96
decimals=the token's decimals, or null if the contract doesn't expose them
symbol=the token's symbol, or null if the contract doesn't expose one
status=this row's revoke progress from App, { state, hash }, or undefined if no revoke has started
onRevoke=App's handleRevoke, which sends approve(spender, 0)
*/

function ApprovalRow({ token, spender, amount, id, onRevoke, isUnlimited, decimals, symbol, status }){
    // Phase 1: Revoke status to button
    // Reads this row's revoke state and picks the button's label, look and whether it can be clicked.
    //   no state         "Revoke", clickable
    //   awaiting-wallet  waiting for the user to confirm in the wallet (grey, spinner)
    //   confirming       transaction sent, waiting for it to be mined (grey, spinner)
    //   failed           reverted, or the allowance wasn't 0 afterwards; red, clickable to retry
    //   unconfirmed      sent, but not mined in time; locked so a second transaction isn't sent
    //   revoked          mined, and the allowance read back as 0; no button, a green mark instead
    const state = status?.state;
    const isRevoked = state === "revoked";

    let action;
    switch (state) {
        case "awaiting-wallet":
            action = { label: "Confirm in wallet…", className: "btn-revoke is-pending", disabled: true, spinner: true };
            break;
        case "confirming":
            action = { label: "Confirming…", className: "btn-revoke is-pending", disabled: true, spinner: true };
            break;
        case "failed":
            action = { label: "Failed, retry", className: "btn-revoke is-failed", disabled: false };
            break;
        case "unconfirmed":
            action = { label: "Unconfirmed", className: "btn-revoke is-unconfirmed", disabled: true };
            break;
        default:
            action = { label: "Revoke", className: "btn-revoke", disabled: false };
            break;
    }


    // Phase 2: Formatting helpers
    // cleanSymbol cuts token symbols longer than 8 characters.
    // formattedAmount turns the raw on-chain number into a readable one using the token's
    // decimals, shows "<0.0001" for dust, and returns null when decimals are unknown,
    // so the cell can show the raw number and say why.
    // parseFloat is fine for display but rounds after about 15 significant digits.
    const cleanSymbol = (clean) => {
        if(!clean) return null;
        return clean.length > 8 ? `${clean.slice(0, 8)}…` : clean;
    };

    const formattedAmount = (raw) => {
        if(decimals == null) return null;
        const num = parseFloat(ethers.formatUnits(raw, decimals));
        if(num > 0 && num < 0.0001) return "<0.0001";
        return num.toLocaleString("en-US", { maximumFractionDigits: 4 });
    };


    // Phase 3: Prepare what the row shows
    // Runs the helpers once, before the JSX, so the markup below only reads finished values.
    // The avatar shows the symbol's first character, or "?" when there is no symbol.
    // Array.from splits by character, so a symbol starting with an emoji isn't cut in half.
    const displaySymbol = cleanSymbol(symbol);
    const shortToken = truncateAddress(token);
    const shortSpender = truncateAddress(spender);
    const avatar = displaySymbol ? Array.from(displaySymbol)[0].toUpperCase() : "?";
    const readable = formattedAmount(amount);
    const tokenName = displaySymbol || shortToken;


    // Phase 4: Render the row
    // Four cells: asset, amount, spender, action. data-cell and data-label are for the phone
    // layout, where the CSS turns each row into a small card and prints the label above the value.
    // The explicit role attributes keep table semantics for screen readers when the CSS
    // changes how the table is displayed.
    // Hovering the asset or spender shows the full address.
    return (
        <tr role="row">
            <td data-cell="asset" role="cell">
                <div className="asset" title={token}>
                    <span className={displaySymbol ? "avatar" : "avatar is-unknown"} aria-hidden="true">{avatar}</span>
                    <div className="asset-text">
                        {displaySymbol ? (
                            <>
                                <div className="asset-name">{displaySymbol}</div>
                                <div className="asset-sub mono">{shortToken}</div>
                            </>
                        ) : (
                            <>
                                <div className="asset-name mono">{shortToken}</div>
                                <div className="asset-sub">No symbol</div>
                            </>
                        )}
                    </div>
                </div>
            </td>

            <td data-cell="amount" data-label="Approved amount" role="cell">
                {isRevoked && <span className="muted">Revoked</span>}
                {!isRevoked && isUnlimited && (
                    <span className="pill-unlimited"><WarningIcon size={12} /> Unlimited</span>
                )}
                {!isRevoked && !isUnlimited && readable !== null && (
                    <span className="amount">
                        {readable}{displaySymbol && <span className="amount-unit"> {displaySymbol}</span>}
                    </span>
                )}
                {!isRevoked && !isUnlimited && readable === null && (
                    <>
                        <span className="amount">{amount}</span>
                        <div className="asset-sub">Raw, decimals unknown</div>
                    </>
                )}
            </td>

            <td data-cell="spender" data-label="Approved spender" role="cell">
                <div className="spender">
                    <span className="mono" title={spender}>{shortSpender}</span>
                    <CopyButton value={spender} label="Copy spender address" />
                    <a
                        className="icon-btn" href={addressUrl(spender)} target="_blank" rel="noopener noreferrer"
                        aria-label="Open spender on Sepolia Etherscan" title="Open on Sepolia Etherscan"
                    >
                        <ArrowUpRight size={12} />
                    </a>
                </div>
            </td>

            <td data-cell="action" role="cell">
                <div className="action">
                    {isRevoked ? (
                        <span className="revoked-mark"><CheckIcon size={13} /> Revoked</span>
                    ) : (
                        <button
                            type="button" className={action.className} disabled={action.disabled}
                            onClick={() => onRevoke(id)}
                            aria-label={`${action.label} ${tokenName} approval for spender ${shortSpender}`}
                            title={state === "unconfirmed"
                                ? "Sent, but not mined within about 3 minutes. Check the transaction before trying again."
                                : undefined}
                        >
                            {action.spinner && <span className="spinner" aria-hidden="true" />}
                            {action.label}
                        </button>
                    )}

                    {status?.hash && (
                        <a className="tx-link" href={txUrl(status.hash)} target="_blank" rel="noopener noreferrer">
                            View tx <ArrowUpRight size={10} />
                        </a>
                    )}
                </div>
            </td>
        </tr>
    );
}

export default ApprovalRow;
