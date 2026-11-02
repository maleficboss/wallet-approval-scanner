import { ethers } from "ethers";

/*
Props (all from App):
id=row number from the backend (1-based); passed back to onRevoke so App can find the row
token=token contract address
spender=address the wallet allowed to move this token
amount=current allowance as a string, the raw on-chain number with no decimals applied
isUnlimited=true when the backend matched amount to max uint256 or max uint96
decimals=the token's decimals, or null if the contract doesn't expose them
symbol=the token's symbol, or null if the contract doesn't expose one
status=this row's revoke progress from App, { state, hash }, or undefined if no revoke has started
onRevoke=App's handleRevoke, which sends approve(spender, 0)
App also passes revoked, but this component doesn't read it.
*/

function ApprovalRow({token, spender, amount, id, onRevoke, isUnlimited, decimals, symbol, status}){
    // Phase 1: Revoke status to button
    // Reads this row's revoke state and picks the button label and whether it can be clicked.
    //   no state         "Revoke", clickable
    //   awaiting-wallet  waiting for the user to confirm in the wallet
    //   confirming       transaction sent, waiting for it to be mined
    //   revoked          mined, and the allowance read back as 0
    //   failed           reverted, or the allowance wasn't 0 afterwards; clickable to retry
    //   unconfirmed      sent, but not mined in time; locked so a second transaction isn't sent
    // isRevoked is also used by the amount cell.
    const state = status?.state;
    const isRevoked = state === "revoked";


    let buttonText;
    let isButtonDisabled;

    switch (state) {
        case "awaiting-wallet":
            buttonText = "Confirm in wallet...";
            isButtonDisabled = true;
            break;
        case "confirming":
            buttonText = "Confirming...";
            isButtonDisabled = true;
            break;
        case "revoked":
            buttonText = "Revoked";
            isButtonDisabled = true;
            break;
        case "failed":
            buttonText = "Failed, retry";
            isButtonDisabled = false;
            break;
        case "unconfirmed":
            buttonText = "Unconfirmed";
            isButtonDisabled = true;
            break;
        default:
            buttonText = "Revoke";
            isButtonDisabled = false;
            break;
    }
    

    // Phase 2: Formatting helpers
    // truncateAddress shortens an address to 0x1234...abcd.
    // cleanSymbol cuts token symbols longer than 8 characters.
    // formattedAmount turns the raw on-chain number into a readable one using the token's
    // decimals, shows "<0.0001" for dust, and falls back to the raw number if decimals are unknown.
    // parseFloat is fine for display but rounds after about 15 significant digits.
    const truncateAddress = (address) => {
        if(!address) return "";
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    const cleanSymbol = (clean) => {
        if(!clean) return null;
        return clean.length > 8 ? `${clean.slice(0, 8)}...`: clean;
    }

    const formattedAmount = (raw) => {
        if(decimals == null) return `${raw} (raw, decimals unknown)`;
        const num = parseFloat(ethers.formatUnits(raw, decimals));
        if(num > 0 && num < 0.0001) return "<0.0001";
        return num.toFixed(4);
    };


    // Phase 3: Prepare what the row shows
    // Runs the helpers once, before the JSX, so the markup below only reads finished values.
    const displaySymbol = cleanSymbol(symbol);
    const reducedTokenAddress = truncateAddress(token);
    const reducedSpenderAddress = truncateAddress(spender);


    // Phase 4: Render the row
    // Unlimited approvals get the "unlimited" class so they can be highlighted.
    // Cells: id, token (symbol if the contract has one, otherwise the short address),
    // amount (Revoked / Unlimited / formatted number), spender, and the revoke button.
    // Hovering the token or spender cell shows the full address.
    // Once the revoke transaction is sent, a Sepolia Etherscan link to it appears under the button.
    return(
        <tr className={isUnlimited ? "unlimited" : ""}>
            <td>{id}</td>
            <td title={token}>
                {displaySymbol ? (
                    <span>
                        <strong>{displaySymbol}</strong> ({reducedTokenAddress})
                    </span>
                    ) : (
                        <span>{reducedTokenAddress}</span>
                    )
                }
            </td>
            <td>
                {isRevoked && <span style={{color:"gray"}}>Revoked</span>}
                {!isRevoked && (isUnlimited ? "Unlimited" : formattedAmount(amount))}
            </td>
            <td title={spender}>{reducedSpenderAddress}</td>
            <td>
                <button onClick={() => onRevoke(id)} disabled={isButtonDisabled}>
                    {buttonText}
                </button>

                {status?.hash &&(
                    <a
                        href={`https://sepolia.etherscan.io/tx/${status.hash}`} target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "underline", textAlign: "center" }}
                    >
                        View on Etherscan
                    </a>
                )}
            </td>
        </tr>
    );
}

export default ApprovalRow;