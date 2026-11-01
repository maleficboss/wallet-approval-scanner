import { ethers } from "ethers";

/*
logs=raw Approval logs from the scan route (Phase 3 in index.js)
Returns a Set of "token-spender" strings, one per ERC-20 approval pair.
*/
export function collectPairs(logs){
    // Phase 1: Collect into a Set
    // A Set keeps each pair once, however many times it was approved in the window.
    
    const dedup = new Set();
    for(const log of logs){
        // Phase 2: Skip NFT approvals
        // ERC-721's Approval event has the same signature, so the scan's filter catches it too.
        // ERC-721 also indexes the token ID, giving 4 topics; ERC-20 has 3 (event ID, owner, spender).
        if(log.topics.length !== 3) continue; // ERC-721 Approval has 4 topics

        // Phase 3: Read the pair
        // The token is the contract that emitted the log.
        // The spender sits in topic 2 as a 32-byte word; the address is its last 20 bytes,
        // so the slice starts at byte 12.
        // getAddress checksums both, so the same pair always produces the same string.
        const token = ethers.getAddress(log.address);
        const spender = ethers.getAddress(ethers.dataSlice(log.topics[2], 12));
        dedup.add(`${token}-${spender}`);
    }
    return dedup;
}