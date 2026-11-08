// The two static sections under the scanner: how it works, and its limits.
// Plain content, no props. The ids are what the nav tabs and the "How it works" button jump to.

const HOW = [
    {
        num: "01", title: "Scan your address",
        body: "The scan looks back an hour, to fit inside RPC limits.",
    },
    {
        num: "02", title: "Flags unlimited approvals",
        body: (
            <>Checks for both values tokens use for unlimited: 2<sup>256</sup> − 1, and 2<sup>96</sup> − 1 for tokens like UNI and COMP.</>
        ),
    },
    {
        num: "03", title: "Revokes, then checks",
        body: "Sends approve(spender, 0) from the wallet you scanned, waits for the receipt, and reads the allowance again. It only shows Revoked once that reads zero.",
    },
];

const LIMITS = [
    {
        title: "About one hour of history",
        body: "The scan looks back about an hour, to fit inside free RPC limits.",
    },
    {
        title: "ERC-20 only",
        body: "NFT approvals, including setApprovalForAll, aren't shown.",
    },
    {
        title: "Sepolia testnet only",
        body: "Mainnet approvals won't appear, and revoking only works on Sepolia.",
    },
];

function About(){
    return (
        <>
            <section className="about" id="how-it-works" aria-labelledby="how-title">
                <h2 className="section-title" id="how-title">How it works</h2>
                <ol className="cards-3">
                    {HOW.map((item) => (
                        <li key={item.num} className="card info-card">
                            <span className="info-num">{item.num}</span>
                            <h3 className="info-title">{item.title}</h3>
                            <p className="info-body">{item.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="limits" id="limits" aria-labelledby="limits-title">
                <h2 className="subsection-title" id="limits-title">Limits</h2>
                <ul className="cards-3">
                    {LIMITS.map((item) => (
                        <li key={item.title} className="limit-card">
                            <h3 className="limit-title">{item.title}</h3>
                            <p className="info-body">{item.body}</p>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}

export default About;
