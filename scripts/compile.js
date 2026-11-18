// Compile AgentVouch (+ mock for tests) with solc, standard JSON output.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const root = path.join(__dirname, "..");
const sources = {
  "contracts/AgentVouch.sol": {
    content: fs.readFileSync(path.join(root, "contracts/AgentVouch.sol"), "utf8"),
  },
  "contracts/MockAgentId.sol": {
    content: fs.readFileSync(path.join(root, "contracts/MockAgentId.sol"), "utf8"),
  },
};

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  for (const e of out.errors) {
    console.log(e.severity.toUpperCase(), e.formattedMessage);
    if (e.severity === "error") process.exitCode = 1;
  }
  if (process.exitCode) process.exit(1);
}

fs.mkdirSync(path.join(root, "build"), { recursive: true });
for (const name of ["AgentVouch", "MockAgentId"]) {
  const c = out.contracts[`contracts/${name}.sol`][name];
  fs.writeFileSync(
    path.join(root, "build", `${name}.json`),
    JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2)
  );
  console.log(name, "bytecode bytes:", c.evm.bytecode.object.length / 2);
}
// Save the standard-json input + compiler version for BscScan verification.
fs.writeFileSync(path.join(root, "build", "standard-input.json"), JSON.stringify(input, null, 2));
fs.writeFileSync(path.join(root, "build", "compiler.json"), JSON.stringify({ version: solc.version() }, null, 2));
console.log("solc:", solc.version());
