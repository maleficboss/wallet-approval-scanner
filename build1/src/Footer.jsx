import { REPO_URL, X_URL } from "./links";

function Footer(){
    return (
        <footer className="footer">
            <div className="footer-brand">
                <span className="wordmark">NAC</span>
                <span>© 2026 maleficboss</span>
            </div>
            <div className="footer-links">
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Source on GitHub</a>
                <a href={X_URL} target="_blank" rel="noopener noreferrer">X @maleficboss</a>
            </div>
            <span>Sepolia testnet only.</span>
        </footer>
    );
}

export default Footer;
