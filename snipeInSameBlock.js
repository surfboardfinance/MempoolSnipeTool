require('dotenv').config();
const { ethers } = require("ethers");

const provider = new ethers.providers.WebSocketProvider(process.env.INFURA_WSS_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const uniswapRouterAddress = process.env.UNISWAP_ROUTER_ADDRESS;
const tokenAddress = process.env.TOKEN_ADDRESS;
const amountIn = ethers.utils.parseEther(process.env.AMOUNT_TO_BUY);

const routerABI = [
    // Uniswap V3 Router ABI (truncated for simplicity, only include methods used)
];

const router = new ethers.Contract(uniswapRouterAddress, routerABI, wallet);

async function snipeToken() {
    const params = {
        tokenIn: ethers.constants.AddressZero, // WETH
        tokenOut: tokenAddress,
        fee: 3000, // Pool fee tier (0.3%)
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes from now
        amountIn,
        amountOutMinimum: 0,  // Set low for same-block execution
        sqrtPriceLimitX96: 0
    };

    const tx = await router.exactInputSingle(params, {
        value: amountIn,
        gasLimit: 200000,
        gasPrice: ethers.utils.parseUnits("100", "gwei") // High priority
    });
    console.log("Transaction submitted:", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed.");
}

async function monitorMempoolForLiquidity() {
    provider.on("pending", async (txHash) => {
        const tx = await provider.getTransaction(txHash);
        if (tx && tx.to === uniswapRouterAddress) {
            const isLiquidityTx = checkIfLiquidityTx(tx.data);
            if (isLiquidityTx) {
                console.log("Liquidity transaction detected:", txHash);
                snipeToken();
            }
        }
    });
}

function checkIfLiquidityTx(data) {
    // Custom function to decode the transaction data and identify if it's a liquidity creation event
    return data.includes("0x"); // Simplified; check specific data related to liquidity events
}

monitorMempoolForLiquidity();
