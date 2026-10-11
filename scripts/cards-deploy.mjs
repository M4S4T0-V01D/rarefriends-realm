// Deploy the Adventurer Cards contract to Robinhood Chain (testnet by default), from a deployer key given in the
// environment, never from a file in the repository. Prints the address and the explorer link; nothing else.
//   DEPLOYER_KEY=0x… MINTER=0x… [ADMIN=0x…] [TREASURY=0x…] [ROYALTY_BPS=500] [BASE_URI=https://…/v1/cards/] [CHAIN=testnet|mainnet] node scripts/cards-deploy.mjs
// The deployer becomes the admin unless ADMIN is given; the treasury receives royalties (the admin unless TREASURY is given).
// Mainnet needs CHAIN=mainnet and CONFIRM_MAINNET=yes, set on purpose.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, formatEther, getAddress, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const CHAINS = {
  testnet: defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } }, blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" } }, testnet: true }),
  mainnet: defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } }, }),   // the mainnet explorer's address isn't published where we looked; the script prints the address
};

const which = process.env.CHAIN ?? "testnet", chain = CHAINS[which];
if (!chain) throw new Error(`CHAIN must be testnet or mainnet`);
if (which === "mainnet" && process.env.CONFIRM_MAINNET !== "yes") throw new Error("mainnet needs CONFIRM_MAINNET=yes, set on purpose");
const key = process.env.DEPLOYER_KEY;
if (!/^0x[0-9a-fA-F]{64}$/.test(key ?? "")) throw new Error("DEPLOYER_KEY (0x…64 hex) is needed in the environment");
const deployer = privateKeyToAccount(key);
const admin = getAddress(process.env.ADMIN ?? deployer.address), treasury = getAddress(process.env.TREASURY ?? admin), minter = process.env.MINTER;
if (!minter || !isAddress(minter)) throw new Error("MINTER (the service's signing address) is needed");
const royaltyBps = BigInt(process.env.ROYALTY_BPS ?? "500"), baseURI = process.env.BASE_URI ?? "https://rarefriends-realm-saves.masato-void.workers.dev/v1/cards/";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifact = JSON.parse(readFileSync(path.join(root, "contracts", "out", "AdventurerCards.json"), "utf8"));
const transport = http(chain.rpcUrls.default.http[0]), pub = createPublicClient({ chain, transport }), wallet = createWalletClient({ chain, transport, account: deployer });
const balance = await pub.getBalance({ address: deployer.address });
console.log(`${chain.name} (${chain.id}) · deployer ${deployer.address} · ${formatEther(balance)} ETH · admin ${admin} · minter ${getAddress(minter)} · treasury ${treasury} · royalty ${royaltyBps} bps · base ${baseURI}`);
if (balance === 0n) throw new Error("the deployer has no ETH on this chain (testnet: https://faucet.testnet.chain.robinhood.com/)");
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [admin, getAddress(minter), treasury, royaltyBps, baseURI] });
console.log(`deploy tx ${hash}`);
const receipt = await pub.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`deploy failed: ${JSON.stringify(receipt)}`);
console.log(`AdventurerCards at ${receipt.contractAddress}${chain.blockExplorers ? `\n${chain.blockExplorers.default.url}/address/${receipt.contractAddress}` : ""}`);
