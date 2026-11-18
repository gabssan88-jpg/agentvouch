// Local EVM tests for AgentVouch using ganache + ethers.
const ganache = require("ganache");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const build = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "build", `${n}.json`), "utf8"));

async function main() {
  const provider = new ethers.BrowserProvider(ganache.provider({ logging: { quiet: true } }));
  const [deployer, alice, bob, carol, stranger] = await Promise.all([0,1,2,3,4].map(i => provider.getSigner(i)));

  const mockF = new ethers.ContractFactory(build("MockAgentId").abi, build("MockAgentId").bytecode, deployer);
  const mock = await mockF.deploy(); await mock.waitForDeployment();

  const avF = new ethers.ContractFactory(build("AgentVouch").abi, build("AgentVouch").bytecode, deployer);
  const av = await avF.deploy(await mock.getAddress()); await av.waitForDeployment();
  console.log("AgentVouch (local):", await av.getAddress());

  // alice, bob, carol hold Agent IDs; stranger does not
  for (const s of [alice, bob, carol]) await (await mock.connect(deployer).mint(await s.getAddress())).wait();

  const results = [];
  const check = (name, cond) => { results.push([name, !!cond]); console.log(cond ? "PASS" : "FAIL", name); };
  const reverts = async (name, txp) => {
    try { const tx = await txp; await tx.wait(); check(name, false); }
    catch { check(name, true); }
  };

  // non-holder cannot register
  await reverts("non-holder register reverts", av.connect(stranger).register("X","misc","d",""));
  // holder registers
  await (await av.connect(alice).register("AliceAgent","research","Research agent","https://example.com")).wait();
  check("alice registered", await av.isRegistered(await alice.getAddress()));
  check("totalAgents=1", (await av.totalAgents()) === 1n);
  // duplicate register reverts
  await reverts("duplicate register reverts", av.connect(alice).register("Again","x","d",""));
  // bob registers, alice vouches bob
  await (await av.connect(bob).register("BobAgent","trading","Trading helper","")).wait();
  await (await av.connect(alice).vouch(await bob.getAddress())).wait();
  check("bob vouchCount=1", (await av.vouchCount(await bob.getAddress())) === 1n);
  // self vouch reverts, double vouch reverts, non-holder vouch reverts
  await reverts("self vouch reverts", av.connect(alice).vouch(await alice.getAddress()));
  await reverts("double vouch reverts", av.connect(alice).vouch(await bob.getAddress()));
  await reverts("non-holder vouch reverts", av.connect(stranger).vouch(await bob.getAddress()));
  // carol vouches bob too, then unvouches
  await (await av.connect(carol).register("CarolAgent","support","Support agent","")).wait();
  await (await av.connect(carol).vouch(await bob.getAddress())).wait();
  check("bob vouchCount=2", (await av.vouchCount(await bob.getAddress())) === 2n);
  await (await av.connect(carol).unvouch(await bob.getAddress())).wait();
  check("bob vouchCount back to 1", (await av.vouchCount(await bob.getAddress())) === 1n);
  // profile read + pagination
  const prof = await av.getProfile(await bob.getAddress());
  check("bob profile name", prof.name === "BobAgent");
  const page = await av.getAgents(0, 10);
  check("getAgents returns 3", page.length === 3);
  check("isAgentIdHolder(alice)=true", await av.isAgentIdHolder(await alice.getAddress()));
  check("isAgentIdHolder(stranger)=false", !(await av.isAgentIdHolder(await stranger.getAddress())));

  const failed = results.filter(r => !r[1]);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
