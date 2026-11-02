// Phase 1: Chain settings and the receipt poller
// Defined outside App so they are created once, not on every render.
// SEPOLIA_CHAIN_ID is the only chain a revoke is allowed on (the scanner reads Sepolia).
// The ABI has the two calls the revoke needs: approve(spender, 0) to revoke,
// and allowance to read the result back afterwards.
export const SEPOLIA_CHAIN_ID = 11155111;
export const tokenAbi =  [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// waitForReceipt asks for the transaction's receipt every 3 seconds, up to 60 times (about 3 minutes).
// It returns the receipt once the transaction is mined, or null if it still isn't,
// so handleRevoke can mark the row "unconfirmed" instead of throwing.
export async function waitForReceipt(provider, hash){
    for (let attempt = 1; attempt <= 60; attempt++) {
        const receipt = await provider.getTransactionReceipt(hash);

        // null means not mined yet
        if(receipt) return receipt;

        // wait 3 seconds before asking again
        await new Promise(r => setTimeout(r, 3000));
    }
    return null;
}