// Every outside link the page uses, in one place.
export const REPO_URL = "https://github.com/maleficboss/wallet-approval-scanner";
export const X_URL = "https://x.com/maleficboss";

// Sepolia Etherscan pages for an address and for a transaction.
export const addressUrl = (address) => `https://sepolia.etherscan.io/address/${address}`;
export const txUrl = (hash) => `https://sepolia.etherscan.io/tx/${hash}`;
