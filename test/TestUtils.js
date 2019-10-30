const TokenImplementation = artifacts.require("ERC20RupiahToken");
const ProxyAdmin = artifacts.require("ProxyAdmin");
const AdminUpgradeabilityProxy = artifacts.require("AdminUpgradeabilityProxy");
const RupiahFeeCollector = artifacts.require('RupiahFeeCollector');

/* Token Details */
const name = "Rupiah Token";
const symbol = "IDRT";
const currency = "IDR";
const decimals = 2;

/* Accounts - Deterministic Ganache Network Only */
const {
  deployer,
  admin_1,
  admin_2,
  admin_3,
  owner,
  exchanger,
  user_1,
  user_2,
  attacker,
  feeCollector,
} = require('./test_config');

const {
  fromWhitelist,
  toWhitelist,
  feeCollectors,
  feeCollectorRatio,
  feeRatioNumerator,
  feeRatioDenominator
} = feeCollector;

async function initializeTokenProxy(tokenProxy) {
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

async function createProxyAdmin(from) {
  return ProxyAdmin.new({ from });
}

async function createImplementation(implementationContract) {
  return implementationContract.new();
}

async function transferOwnership(contract, currentOwner, to) {
  return contract.transferOwnership(to, { from: currentOwner });
}

async function createFeeCollector(tokenAddress, from) {
  return RupiahFeeCollector.new(fromWhitelist, toWhitelist, feeCollectors, feeCollectorRatio, tokenAddress, feeRatioNumerator, feeRatioDenominator, { from });
}

module.exports = {
  createProxyAdmin: createProxyAdmin,
  createImplementation: createImplementation,
  transferOwnership: transferOwnership,
  createProxy: createProxy,
  initializeWalletProxy: initializeWalletProxy,
  initializeTokenProxy: initializeTokenProxy,
  createFeeCollector,
};
