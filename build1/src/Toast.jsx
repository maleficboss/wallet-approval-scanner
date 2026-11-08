import { WarningIcon, CloseIcon } from "./icons";

/*
Props (all from App):
message=App's walletError, e.g. "Switch your wallet to Ethereum Sepolia."
onDismiss=clears walletError
Fixed to the bottom of the screen, so a wallet problem is seen wherever the user has scrolled:
the Connect button is at the top of the page and the Revoke buttons are further down.
*/

function Toast({ message, onDismiss }){
    return (
        <div className="toast" role="alert">
            <span className="toast-icon"><WarningIcon size={15} /></span>
            <span className="toast-text">{message}</span>
            <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss">
                <CloseIcon />
            </button>
        </div>
    );
}

export default Toast;
