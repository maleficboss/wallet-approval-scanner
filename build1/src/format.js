// truncateAddress shortens an address to 0x1234…abcd: "0x" plus 4 characters, then the last 4.
export const truncateAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

// formatAgo turns the seconds since the last scan into "6s ago", "3m ago" or "1h ago".
export const formatAgo = (seconds) => {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
};
