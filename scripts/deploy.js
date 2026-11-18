// Deploy AgentVouch via baw: fresh preview -> verify simulation -> execute.
// Approved by Gabriel in chat on 2026-11-18 ("Ya, deploy sekarang").
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FROM = "0xFC6B228c349bE4cE6CfE7c39C039e764afdFE454";
const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "build", "deployment.json"), "utf8"));

function baw(args) {
  const out = execFileSync("baw", args, { encoding: "utf8", env: { ...process.env, PATH: process.env.HOME + "/workspace/tools/baw/bin:" + process.env.PATH } });
  return JSON.parse(out);
}

const settings = baw(["wallet", "settings", "--json"]);
if (!settings.success || !settings.data.devMode.enabled) throw new Error("Developer Mode not enabled: " + JSON.stringify(settings));
console.log("devMode enabled, expires:", settings.data.devMode.expiresAt);

const preview = baw(["contract-call", "preview", "--binanceChainId", "56", "--from", FROM, "--to", dep.proxy, "--value", "0", "--inputData", dep.calldata, "--json"]);
fs.writeFileSync(path.join(__dirname, "..", "build", "preview-execute.json"), JSON.stringify(preview, null, 2));
if (!preview.success) throw new Error("Preview failed: " + JSON.stringify(preview));
const sim = preview.data.simulationResult;
console.log("simulationCode:", sim.simulationCode, "error:", sim.simulationErrorDetail);
console.log("risks:", JSON.stringify(preview.data.risks));
console.log("requireConfirmation:", preview.data.requireConfirmation);
if (sim.simulationCode !== "000000000" || sim.simulationErrorDetail) throw new Error("Simulation not clean, aborting");
if ((preview.data.risks.riskDetails || []).length) throw new Error("Risk details present, aborting");

const exec = baw(["contract-call", "execute", "--requestId", preview.data.requestId, "--json"]);
fs.writeFileSync(path.join(__dirname, "..", "build", "execute.json"), JSON.stringify(exec, null, 2));
console.log("EXECUTE:", JSON.stringify(exec, null, 2));
