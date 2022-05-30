import { Client, Intents } from "discord.js";
import "dotenv/config";
import ethers from "ethers";
import fetch from "cross-fetch";
import Discord from "discord.js";
import { MessageEmbed } from "discord.js";

import { GeckoPrice } from "./utils/geckoFetch.js";
import { ChainInfo } from "./utils/chainInfo.js"
import { SynapseReceived } from "./quoters/synapse.mjs";
import { HopReceived } from "./quoters/hop.js";

import { ABI } from "./constants/abi.js";
import { BRIDGEPOOL } from "./constants/constants.js";
import { RELAYFILTERS, DEPOSITFILTERS } from "./constants/filters.js";
import { PROVIDER } from "./constants/providers.js";

import Twit from "twit";

// toggle Twitter alerts on and off
var twitterOn = false;

// threshold in USD for alerts
const alertThreshold = 4999;

const client = new Discord.Client({
    partials: ["CHANNEL"],
    intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"],
});

const T = {};
if (twitterOn) {
    const T = new Twit({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET,
        timeout_ms: 60 * 1000,
    });
}

// const botTestChannelId = "932504732818362378"; // private discord
const botTestChannelId = "958093554809438249"; // across bot testing

// todo add transaction receipt for gas cost
// const getReceipt = (transactionHash,chainId) => {
// }

async function processRelay(relayEvent, removed) {
    const bridgePoolInterface = new ethers.utils.Interface(ABI.SPOKEPOOL);

    console.log("processing relay event", relayEvent.data);
    // console.log(iface.parseTransaction({ data: depositEvent.data }));
    let decoded = bridgePoolInterface.decodeEventLog(
        "FilledRelay",
        relayEvent.data
    );


    let relayed = {
        amount: parseInt(decoded[0].toString()),
        totalFilledAmount: parseInt(decoded[1].toString()),
        fillAmount: parseInt(decoded[2].toString()),
        repaymentChainId: parseInt(decoded[3].toString()),
        originChainId: parseInt(decoded[4].toString()),
        destinationChainId: parseInt(decoded[5].toString()),
        relayerFeePct: parseInt(decoded[6].toString()),
        appliedRelayerFeePct: parseInt(decoded[7].toString()),
        realizedLpFeePct: parseInt(decoded[8].toString()),
        depositId: decoded[9],
        destinationToken: decoded[10],
        relayer: decoded[11],
        depositor: decoded[12],
        recipient: decoded[13],
        isSlowRelay: decoded[14],
        transactionHash: relayEvent.transactionHash,
    };
    console.log(relayed)
    let poolObject = await findPool(relayed.destinationToken, relayed.destinationChainId)
    console.log("DECODED RELAY: ", relayed);
    let embed = await relayEmbed(relayed, poolObject);
    return embed;
}

async function relayEmbed(relayData, poolObject) {
   
    let chain = ChainInfo(relayData.originChainId);
    let chainTo = ChainInfo(relayData.destinationChainId)
    //   let relayTime =
    //     parseFloat(relayData.priceRequestTime) -
    //     parseFloat(relayData.quoteTimestamp);
    //   let relayTotalFeePercentage =
    //     parseFloat(ethers.utils.formatUnits(relayData.slowRelayFeePct, 18)) +
    //     parseFloat(ethers.utils.formatUnits(relayData.instantRelayFeePct, 18)) +
    //     parseFloat(ethers.utils.formatUnits(relayData.realizedLpFeePct, 18));
    let relayTotalFeePercentage = relayData.appliedRelayerFeePct / 1e18
    let depositAmount = parseFloat(
        ethers.utils.formatUnits(relayData.amount.toString(), poolObject.DECIMALS)
    );
    let receivedAmount = depositAmount * (1 - relayTotalFeePercentage);
    // let relayFinalFee = relayData.finalFee / poolObject.DECIMALS;

    let geckoPrice = await GeckoPrice(poolObject.GECKOID);
    let depositUsdValue = depositAmount * geckoPrice;

    if (depositUsdValue > alertThreshold) {
        const tweet = {
            status: `Funds received from ${chain} to ${chainTo} \n\nAmount: ${receivedAmount.toLocaleString(
                undefined,
                { maximumFractionDigits: 2 }
            )} \n\nhttps://etherscan.io/tx/${relayData.transactionHash}`,
        };

        const relayEmbed = new MessageEmbed()
            .setColor("#6CF9D8")
            .setTitle(
                ":handshake:  RELAYED `" +
                decimals(depositAmount) +
                "` **" +
                poolObject.SYMBOL +
                "**"
            )
            .setDescription(
                // ":watch: `" +
                //   relayTime +
                //   "` seconds" +
                // + "<t:" +
                //     depositData.quoteTimestamp +
                //     ":R>" +
                "\nReceived `" +
                decimals(receivedAmount) +
                "` " +
                poolObject.SYMBOL +
                "\nPaid Across Fee `" +
                decimals(relayTotalFeePercentage * 100) +
                "%`" +
                "\nDeposit `#" +
                relayData.depositId +
                "`"
            )
            .setThumbnail(chainTo.chainLogo)
            .addField(
                "\u200B",
                "View on [" +
                chainTo.explorerName +
                "](" +
                chainTo.explorerURL +
                relayData.transactionHash +
                ")"
            );

        return { relayEmbed: relayEmbed, tweet: tweet };
    } else {
        console.log("relay did not meet threshold, amt ", depositUsdValue);
        return null;
    }
}
const findPool = async (tokenAddress, originChain) => {
    console.log("trying to find pool ", tokenAddress, originChain)
    let tempProvider = {}
    if (originChain === 10) {
        tempProvider = PROVIDER.OPTIMISM
    }
    if (originChain === 42161) {
        tempProvider = PROVIDER.ARBITRUM
    }
    if (originChain === 288) { tempProvider = PROVIDER.BOBA }
    if (originChain === 137) { tempProvider = PROVIDER.POLYGON }
    if (originChain === 1) { tempProvider = PROVIDER.ETHEREUM }


    let fromTokenContract = new ethers.Contract(tokenAddress, ABI.ERC20, tempProvider)
    let fromTokenSymbol = await fromTokenContract.symbol()
    console.log("find pool", tokenAddress);

    let result = Object.values(BRIDGEPOOL).find((obj) => {
        return obj.SYMBOL == fromTokenSymbol;
    });
    console.log(result);
    return result;
};

const decimals = (amount) => {
    let point = 18;
    if (amount > 999) {
        point = 0;
    } else if (amount > 0.9) {
        point = 2;
    } else if (amount > 0.009) {
        point = 4;
    } else if (amount > 0.0009) {
        point = 5;
    } else if (amount > 0.000009) {
        point = 7;
    } else if (amount > 0.000000009) {
        point = 11;
    }
    return amount.toFixed(point);
};
async function depositAlert(depositData) {
    let chain = ChainInfo(depositData.originChainId);

    let pool = await findPool(depositData.l2Token, depositData.originChainId);

    let symbol = pool.SYMBOL;

    let amount = parseFloat(
        ethers.utils.formatUnits(depositData.amount, pool.DECIMALS)
    );
    let geckoPrice = await GeckoPrice(pool.GECKOID);
    let depositUsdValue = amount * geckoPrice;

    if (depositUsdValue > alertThreshold) {
        const tweet = {
            status: `Bridge initiated from ${chain} to Ethereum Mainnet. \n\nAmount: ${decimals(
                amount
            )} \n\n${chain.explorerURL + depositData.transactionHash}`,
        };

        let depositAmount = parseFloat(
            ethers.utils.formatUnits(depositData.amount, pool.DECIMALS)
        );
        let hopSampleReceived = await HopReceived(
            pool.HOPID,
            depositData.amount.toString(),
            depositData.originChainId,
            1
        );
        let hopFeeString = "";
        if (hopSampleReceived !== null) {
            hopSampleReceived = ethers.utils.formatUnits(
                hopSampleReceived,
                pool.DECIMALS
            );
            let hopFeePercent =
                ((depositAmount - hopSampleReceived) / hopSampleReceived) * 100;
            hopFeeString = "\nHop Fee Estimate `" + decimals(hopFeePercent) + "%`";
        }

        let synapseSampleReceived = await SynapseReceived(
            pool.HOPID,
            ethers.utils.formatUnits(depositData.amount, pool.DECIMALS),
            depositData.originChainId,
            1,
            pool.DECIMALS
        );
        let destinationChainName = ChainInfo(depositData.destinationChainId)
        destinationChainName = destinationChainName.chainName
        let synapseFeeString = "";
        if (synapseSampleReceived !== null) {
            synapseSampleReceived = ethers.utils.formatUnits(
                synapseSampleReceived,
                pool.DECIMALS
            );
            let synapseFeePercent =
                ((depositAmount - synapseSampleReceived) / synapseSampleReceived) * 100;
            synapseFeeString =
                "\nSynapse Fee Estimate `" + decimals(synapseFeePercent) + "%`";
        }

        const depositEmbed = new MessageEmbed()
            .setColor("#6CF9D8")
            .setTitle(
                ":bank:  DEPOSITED `" +
                decimals(
                    parseFloat(
                        ethers.utils.formatUnits(depositData.amount, pool.DECIMALS)
                    )
                ) +
                "` **" +
                symbol +
                "**"
            )
            .setDescription(
                ":alarm_clock: <t:" +
                depositData.quoteTimestamp +
                ":R>" +
                "\nDestination `" + destinationChainName + "`" +
                //   "\nDeposit `#" +
                //   depositData.depositId +
                //   "`" +
                hopFeeString +
                synapseFeeString
            )
            .setThumbnail(chain.chainLogo)
            .addField(
                "\u200B",
                "View on [" +
                chain.explorerName +
                "](" +
                chain.explorerURL +
                depositData.transactionHash +
                ")"
            );
        return { depositEmbed: depositEmbed, tweet: tweet };
    } else {
        console.log(
            "deposit not meeting threshold for alert, amt ",
            amount * geckoPrice
        );
        return null;
    }
}

async function processDeposit(depositEvent) {
    let result = ethers.utils.defaultAbiCoder.decode(
        [
            "uint256",
            "uint256",
            "uint256",
            "uint64",
            "uint32",
            "address"
        ],
        depositEvent.data
    );

    let tokenAddress = depositEvent.topics[2]
    tokenAddress = ethers.utils.defaultAbiCoder.decode(["address"], tokenAddress)
    tokenAddress = tokenAddress[0]
    let senderAddress = depositEvent.topics[3]
    senderAddress = ethers.utils.defaultAbiCoder.decode(["address"], senderAddress)
    senderAddress = senderAddress[0]
    //   depositTopic.push(depositEvent.topics[3])

    let deposited = {
        sender: senderAddress,
        originChainId: parseInt(result[1].toString()),
        destinationChainId: parseInt(result[2].toString()),
        // depositId: parseFloat(result[1].toString()),
        recepient: result[5].toString(),
        l2Token: tokenAddress,
        amount: result[0],
        relayFeePct: parseFloat(result[3].toString()),
        // instantRelayFeePct: parseFloat(result[8].toString()),
        quoteTimestamp: parseFloat(result[4].toString()),
        transactionHash: depositEvent.transactionHash,
    };
    console.log(deposited);
    let embed = await depositAlert(deposited);
    return embed;
}

async function sendTweet(tweet) {
    if (twitterOn) {
        T.post("statuses/update", tweet, function (err, data, response) {
            console.log(data.text);
        });
    }
}

async function botGo() {
    client.once("ready", () => {
        console.log("Ready!");
    });

    PROVIDER.OPTIMISM.on(DEPOSITFILTERS.OPTIMISM, (depositEvent) => {
        try {
            processDeposit(depositEvent).then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.depositEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });
    PROVIDER.ETHEREUM.on(DEPOSITFILTERS.ETHEREUM, (depositEvent) => {
        console.log("ETH EVENT")
        try {
            processDeposit(depositEvent).then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.depositEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    PROVIDER.ARBITRUM.on(DEPOSITFILTERS.ARBITRUM, (depositEvent) => {
        console.log("ARBITRUM EVENT")
        try {
            processDeposit(depositEvent).then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.depositEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });
    PROVIDER.BOBA.on(DEPOSITFILTERS.BOBA, (depositEvent) => {
        try {
            processDeposit(depositEvent).then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.depositEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });
    PROVIDER.POLYGON.on(DEPOSITFILTERS.POLYGON, (depositEvent) => {
        try {
            processDeposit(depositEvent).then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.depositEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });


    //   PROVIDER.ETHEREUM.on(RELAYFILTERS.ETHEREUM, (relayEvent) => {
    //     try {
    //       processRelay(relayEvent, DEPOSITBO.ETHEREUM).then((result) => {
    //         if (result) {
    //           const testingChannel = client.channels.cache.get(botTestChannelId);
    //           testingChannel.send({ embeds: [result.relayEmbed] });
    //           sendTweet(result.tweet);
    //         }
    //       });
    //     } catch (error) {
    //       console.log(error);
    //     }
    //   });


    PROVIDER.ETHEREUM.on(RELAYFILTERS.ETHEREUM, (relayEvent) => {
        try {
            processRelay(relayEvent, "null").then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.relayEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });


    PROVIDER.ARBITRUM.on(RELAYFILTERS.ARBITRUM, (relayEvent) => {
        try {
            processRelay(relayEvent, "null").then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.relayEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });
    PROVIDER.OPTIMISM.on(RELAYFILTERS.OPTIMISM, (relayEvent) => {
        try {
            processRelay(relayEvent, "null").then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.relayEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });
    PROVIDER.BOBA.on(RELAYFILTERS.BOBA, (relayEvent) => {
        try {
            processRelay(relayEvent, "null").then((result) => {
                if (result) {
                    const testingChannel = client.channels.cache.get(botTestChannelId);
                    testingChannel.send({ embeds: [result.relayEmbed] });
                    sendTweet(result.tweet);
                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    client.login(process.env.BOT_KEY);
}

botGo();
