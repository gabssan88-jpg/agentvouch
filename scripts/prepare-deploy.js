// Prepare a CREATE2 deployment of AgentVouch through the canonical
// deterministic-deployment proxy (deployed on BNB Chain), so the deploy
// transaction is a normal contract call from Gabriel's Agentic Wallet
// (baw contract-call requires a --to address; a raw creation tx has none).
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const PROXY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
const AGENT_ID_REGISTRY = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

const build = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "build", "AgentVouch.json"), "utf8"));
const ctorArg = ethers.AbiCoder.defaultAbiCoder().encode(["address"], [AGENT_ID_REGISTRY]);
const initCode = build.bytecode + ctorArg.slice(2);
const salt = ethers.id("AgentVouch.v1.hunterbiru.ai");
const initCodeHash = ethers.keccak256(initCode);
const address = ethers.getCreate2Address(PROXY, salt, initCodeHash);
const calldata = salt + initCode.slice(2); // proxy format: salt (32B) ++ initCode

const out = { proxy: PROXY, registry: AGENT_ID_REGISTRY, salt, initCodeHash, predictedAddress: address, calldata, initCodeBytes: (initCode.length - 2) / 2 };
fs.writeFileSync(path.join(__dirname, "..", "build", "deployment.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
