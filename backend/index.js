import "dotenv/config";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { collectPairs } from "./pairs.js";
import mock from "./list.js";
import { ethers } from "ethers";

const app = express();
const port = process.env.PORT || 3000;
// RPC_URL is the node URL with the API key inside it, so it lives in .env and never reaches the client
const rpc = process.env.RPC_URL;
// one provider for the whole server, reused by every request
const rpcProvider = new ethers.JsonRpcProvider(rpc);
// only the three ERC-20 reads the scan route needs
const miniAbi = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
]


// Render puts three proxies in front of the server, verified with /ip.
app.set("trust proxy", 3);

// TEMPORARY: shows the IP Express picks and the raw proxy chain. Remove after checking on Render.
app.get("/ip", (req, res) => res.json({ ip: req.ip, chain: req.headers["x-forwarded-for"] }));


// CORS
// Allowed browser origins, comma-separated in ALLOWED_ORIGINS; local Vite by default
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim());
    
app.use(cors({ origin: allowedOrigins }));
console.log("Allowed origins:", allowedOrigins);

// Rate limit: each IP may start 5 scans a minute. One scan costs ~31 getLogs calls plus
// 3 reads per approval, so this caps how much of the Alchemy quota one visitor can use.
// Counts live in memory, so they reset when the server restarts.
const scanLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, error: "Too many scans from your connection. Try again in a minute." },
});

// Helper: optional token reads
// decimals() and symbol() are optional in ERC-20, so some tokens revert or return junk for them.
// This turns those two failures (CALL_EXCEPTION, BAD_DATA) into null, so one odd token
// doesn't fail the whole scan. Any other error (network, rate limit) is rethrown.
async function getSymbolAndDecimal(run){
    try{
        return await run();
    }catch(error){
        if(error.code === "CALL_EXCEPTION" || error.code === "BAD_DATA") return null;
        throw error;
    }
}

// Mock route
// GET /approvals sends back the fake list from list.js as-is. The frontend doesn't call it yet.
app.get("/approvals", (req, res) => {
    res.json(mock);
});


// Scan route
// GET /approvals/:address returns every ERC-20 approval the address gave in about the
// last 300 blocks (roughly an hour on Sepolia) that still has an allowance above zero.
app.get("/approvals/:address", scanLimiter, async (req, res) => {
    try{
        // Phase 1: Validate the address and build the filter
        // A bad address gets a 400 before any RPC call is made.
        // hash is topic 0, the ID of the Approval event (keccak256 of its signature).
        // ERC-20 and ERC-721 share this signature; pairs.js separates them later.
        // The owner is an indexed parameter, stored in topic 1 as a 32-byte word,
        // so the address is left-padded with zeros to match it.
        // Then it asks the node for the newest block, which is where the scan starts.
        const address = req.params.address;

        if(!ethers.isAddress(address)){
            return res.status(400).json({success: false, error: "Invalid address"});
        }
        const hash = ethers.id("Approval(address,address,uint256)");
        const padTo32 = ethers.zeroPadValue(address, 32);
        const latestBlock = await rpcProvider.getBlockNumber();

        // Phase 2: Set the block window
        // blockLimit is how far back to look. requestLimit is how many blocks one getLogs call
        // covers, kept small because free RPC plans cap the block range of eth_getLogs.
        // startFrom is the oldest block to include (never below block 0).
        // The walk goes newest to oldest, so the first chunk is the 10 blocks ending at latestBlock.
        // Both ends are included, so the window is 301 blocks: 31 calls, the last one a single block.
        const blockLimit = 300;
        const requestLimit = 10;
        const startFrom = Math.max(0, latestBlock - blockLimit);
        let allLogs = [];
        let currentToBlock = latestBlock;
        let currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);

        // Phase 3: Fetch the logs chunk by chunk
        // One getLogs call per chunk, each awaited before the next, so the node never gets a burst.
        // The filter has no contract address, so it matches Approval events from every token.
        // Topics: [event ID, owner]. Topic 2 (the spender) is left open, so every spender matches.
        // After each call the window slides down one chunk; the last chunk is clamped at startFrom,
        // and the loop ends once currentToBlock drops below startFrom.
        while(currentToBlock >= startFrom){
            const filter = {
                fromBlock: currentFromBlock,
                toBlock: currentToBlock,
                topics: [
                    hash, padTo32
                ]
            }
            const logs = await rpcProvider.getLogs(filter);
            allLogs = [...allLogs, ...logs];
            currentToBlock = currentFromBlock - 1;
            currentFromBlock = Math.max(startFrom, currentToBlock - requestLimit + 1);
        }

        // Phase 4: Deduplicate token/spender pairs
        // collectPairs drops NFT approvals and returns a Set of "token-spender" strings.
        // Ten approvals to the same spender become one entry: only the current allowance matters,
        // and Phase 5 reads that live from the token contract instead of trusting old log values.
        const dedup = collectPairs(allLogs);

        // Phase 5: Read the live state of each pair
        // cache keeps one Contract object per token, reused when a token has several spenders.
        // Every pair runs at once, and inside each pair the three reads run at once.
        // decimals and symbol go through getSymbolAndDecimal and can come back null.
        // allowance does not: if one contract reverts on allowance(), Promise.all rejects
        // and the whole scan returns a 500.
        const cache = new Map();
        const promise = [...dedup].map(async (concat) => {
            // addresses never contain "-", so splitting on it is safe
            const [token, spender] = concat.split("-");
            let contract = cache.get(token);

            if(!contract) {
                contract = new ethers.Contract(token, miniAbi, rpcProvider);
                cache.set(token, contract);
            }

            const [amount, decimals, tokenSymbol] = await Promise.all([
                contract.allowance(address, spender),
                getSymbolAndDecimal(() => contract.decimals()),
                getSymbolAndDecimal(() => contract.symbol())
            ]);

            return {
                amount, decimals, token, spender, symbol: tokenSymbol
            }
        });
        const settleApproval = await Promise.all(promise);

        // Phase 6: Shape the response
        // maxUint256 (2^256 - 1) is the standard "unlimited" approval.
        // maxUint96 (2^96 - 1) is the cap for tokens that store allowances as uint96, such as UNI and COMP.
        // Zero allowances are dropped: those approvals were revoked or fully spent.
        // isUnlimited is an exact match only; a huge but not-max amount counts as limited.
        // amount goes out as a string because JSON can't carry a BigInt.
        // id is the row's position in this response, numbered after filtering, so it can change
        // between scans. revoked is always false here; the frontend tracks revokes itself.
        const maxUint256 = ethers.MaxUint256;
        const maxUint96 = (1n << 96n) - 1n;
        const approval = settleApproval
            .filter(approve => approve.amount > 0n)
            .map((approve, index) => {
                const isUnlimited = approve.amount === maxUint256 || approve.amount === maxUint96;
                const tokenSymbol = approve.symbol || null;
                return{
                    id: index + 1, isUnlimited, amount: approve.amount.toString(),
                    decimals: approve.decimals === null ? null : Number(approve.decimals),
                    token: approve.token, spender: approve.spender,
                    revoked: false, symbol: tokenSymbol
                }
            });

        res.status(200).json({success: true, data: approval});
    }
    catch(error){
        // Errors
        // The full error is logged on the server only.
        // A rate limit from the RPC provider becomes a 429 that tells the client to wait 10 seconds.
        // Everything else gets a fixed 500 message. The raw error never goes to the client,
        // because provider errors can carry the RPC URL, and the URL holds the API key.
        console.error(error);
        if(error?.error?.code === 429){
            return res
                .set("Retry-After", "10")
                .status(429)
                .json({success: false, error: "The service is busy, try again in 10 seconds"});
        }

        res.status(500).json({success: false, error: "Something failed on our side"});
    }
});


app.listen(port, () => {
    console.log(`Running on ${port}`);
});