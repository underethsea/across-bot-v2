import { SPOKEPOOL, BRIDGEPOOL, DEPOSITBOXV2} from "./constants.js"
import ethers from "ethers"

const relayTopics =
"0xa4ca36d112520cced74325c72711f376fe4015665829d879ba21590cb8130be0";
const relayFilledTopic = "0x56450a30040c51955338a4a9fbafcf94f7ca4b75f4cd83c2f5e29ef77fbe0a3a";
const depositTopic = "0x4a4fc49abd237bfd7f4ac82d6c7a284c69daaea5154430cff04ad7482c6c4254";
const RELAYFILTERS = {
ETHEREUM: { address:  SPOKEPOOL.ETHEREUM.ADDRESS,
topics: [relayFilledTopic]},
OPTIMISM: { address:  SPOKEPOOL.OPTIMISM.ADDRESS,
topics: [relayFilledTopic]},
ARBITRUM: { address:  SPOKEPOOL.ARBITRUM.ADDRESS,
topics: [relayFilledTopic]},
BOBA: { address:  SPOKEPOOL.BOBA.ADDRESS,
topics: [relayFilledTopic]},

WETH: {
  address: BRIDGEPOOL.WETH.ADDRESS,
  topics: [relayTopics],
},
USDC: {
  address: BRIDGEPOOL.USDC.ADDRESS,
  topics: [relayTopics],
},
UMA: {
  address: BRIDGEPOOL.UMA.ADDRESS,
  topics: [relayTopics],
},
BADGER: {
  address: BRIDGEPOOL.BADGER.ADDRESS,
  topics: [relayTopics],
},
WBTC: {
  address: BRIDGEPOOL.WBTC.ADDRESS,
  topics: [relayTopics],
},
//BOBA: {
//  address: BRIDGEPOOL.BOBA.ADDRESS,
///  topics: [relayTopics],
//},
DAI: {
  address: BRIDGEPOOL.DAI.ADDRESS,
  topics: [relayTopics],
},
};

const DEPOSITFILTERS = {
     ETHEREUM: {address: DEPOSITBOXV2.ETHEREUM.ADDRESS,
        topics: [depositTopic],},

    ARBITRUM: {address: DEPOSITBOXV2.ARBITRUM.ADDRESS,
        topics: [depositTopic],},
    OPTIMISM: {address: DEPOSITBOXV2.OPTIMISM.ADDRESS,
        topics: [depositTopic],},
    BOBA: {
    address: DEPOSITBOXV2.BOBA.ADDRESS,
    topics: [depositTopic],},
POLYGON: {address: DEPOSITBOXV2.POLYGON.ADDRESS,
        topics: [depositTopic],}

}
// event FundsDeposited(
//     uint256 amount,
//     uint256 originChainId,
//     uint256 destinationChainId,
//     uint64 relayerFeePct,
//     uint32 indexed depositId,
//     uint32 quoteTimestamp,
//     address indexed originToken,
//     address recipient,
//     address indexed depositor
// );
export { RELAYFILTERS, DEPOSITFILTERS };
