const ChainInfo = (chainId) =>{
    let chain = {};
    chainId = parseInt(chainId);
    if (chainId === 42161) {
        chain = {
            chainName: "Arbitrum",
            explorerName: "Arbiscan",
            chainLogo: "https://l2beat.com/icons/arbitrum.png",
            explorerURL: "https://arbiscan.io/tx/",
        };
    }
    if (chainId === 288) {
        chain = {
            chainName: "Boba",
            explorerName: "Boba Explorer",
            chainLogo:
                "https://images.squarespace-cdn.com/content/v1/6105293624baee78ed31e0db/1629915110970-5XLTKFW6Y5GGT19S0G3V/Boba-Bug-Neon.png",
            explorerURL: "https://blockexplorer.boba.network/tx/",
        };
    }
    if (chainId === 10) {
        chain = {
            chainName: "Optimism",
            explorerName: "Optimistic Etherscan",
            chainLogo:
                "https://assets-global.website-files.com/5f973c970bea5548ad4287ef/620426d8498e8905d65f3153_Profile-Logo.png",
            explorerURL: "https://optimistic.etherscan.io/tx/",
        };
    }
    if (chainId === 137) {
        chain = {
            chainName: "Polygon",
            explorerName: "Polygonscan",
            chainLogo:
                "https://polygonscan.com/images/brandassets/PolygonScan-logo-circle.jpg",
            explorerURL: "https://polygonscan.com/tx/",
        };
    }
    if (chainId === 1) {
        chain = {
            chainName: "Ethereum",
            explorerName: "Etherscan",
            chainLogo:
                "https://toppng.com/uploads/preview/ethereum-purple-blue-icon-11552773978cix3fnbdty.png",
            explorerURL: "https://etherscan.io/tx/",
        };
    }

    return chain;
}
export {ChainInfo}
