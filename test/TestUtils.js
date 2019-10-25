const TokenImplementation = artifacts.require("ERC20RupiahToken");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");

/* Token Details */
const name = "Rupiah Token";
const symbol = "IDRT";
const currency = "IDR";
const decimals = 2;

/* Accounts - Deterministic Ganache Network Only */
const deployer = "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1";
const admin_1 = "0xffcf8fdee72ac11b5c542428b35eef5769c409f0";
const admin_2 = "0x22d491bde2303f2f43325b2108d26f1eaba1e32b";
const admin_3 = "0xe11ba2b4d45eaed5996cd0823791e0c93114882d";
const owner = "0xd03ea8624c8c5987235048901fb614fdca89b117";
const exchanger = "0x95ced938f7991cd0dfcb48f0a06a40fa1af46ebc";
const user_1 = "0x3e5e9111ae8eb78fe1cc3bb8915d5d461f3ef9a9";
const user_2 = "0x28a8746e75304c0780e011bed21c72cd78cd535e";
const attacker = "0xaca94ef8bd5ffee41947b4585a84bda5a3d3da6e";

async function initializeTokenProxy(tokenProxy, options) {
  const {
    deployer,
  } = options;
  return tokenProxy.initialize(name, symbol, currency, decimals, {
    from: deployer
  });
}

async function initializeWalletProxy(walletProxy) {
  return walletProxy.initialize([admin_1, admin_2, admin_3], 2, 100000000, {
    from: deployer
  });
}

async function createProxy(implAddrs, proxyAdminAddrs, data) {
  return AdminUpgradeabilityProxy.new(implAddrs, proxyAdminAddrs, data);
}

async function createProxyAdmin(deployer = deployer) {
  return ProxyAdmin.new({ from: deployer });
}

async function createImplementation(implementationContract) {
  return implementationContract.new();
}

async function transferOwnership(contract, currentOwner, to) {
  return contract.transferOwnership(to, { from: currentOwner });
}

module.exports = {
  createProxyAdmin: createProxyAdmin,
  createImplementation: createImplementation,
  transferOwnership: transferOwnership,
  createProxy: createProxy,
  initializeWalletProxy: initializeWalletProxy,
  initializeTokenProxy: initializeTokenProxy
};
