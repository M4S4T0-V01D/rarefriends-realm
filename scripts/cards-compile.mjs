// Compile the Adventurer Cards contract (contracts/AdventurerCards.sol) with solc, OpenZeppelin from node_modules, and
// write its ABI and bytecode to contracts/out/AdventurerCards.json (what the deploy script, the Worker and the tests use).
//   node scripts/cards-compile.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url), solc = require("solc");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), source = path.join(root, "contracts", "AdventurerCards.sol");
const input = {
  language: "Solidity",
  sources: { "AdventurerCards.sol": { content: readFileSync(source, "utf8") } },
  settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", metadata: { bytecodeHash: "none" }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } } },
};
const findImports = (file) => {
  try { return { contents: readFileSync(path.join(root, "node_modules", file), "utf8") }; } catch { return { error: `not found: ${file}` }; }
};
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors ?? []).filter(e => e.severity === "error");
for (const e of output.errors ?? []) console.error(e.formattedMessage);
if (errors.length) process.exit(1);
const contract = output.contracts["AdventurerCards.sol"].AdventurerCards;
mkdirSync(path.join(root, "contracts", "out"), { recursive: true });
writeFileSync(path.join(root, "contracts", "out", "AdventurerCards.json"), JSON.stringify({ compiler: `solc ${solc.version()}`, abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`, deployedBytecode: `0x${contract.evm.deployedBytecode.object}` }, null, 1));
console.log(`AdventurerCards: ${contract.abi.length} ABI entries, ${contract.evm.bytecode.object.length / 2} bytes, solc ${solc.version()}`);
