const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const assert = require('assert').strict;

const DeployedAddresses = require("./" + deployed_addresses_filename);
const Config = require("./config.json");

const ERC20RupiahToken = artifacts.require("./token/ERC20RupiahToken");
const IDRTWallet = artifacts.require("./governance/wallet/IDRTWallet");
const ProxyAdmin = artifacts.require("./zos/upgradeability/ProxyAdmin");

module.exports = async function(deployer, network, accounts) {
    let token, wallet, proxyAdmin;
    switch(network) {
        case 'development': 
            token = await ERC20RupiahToken.at(DeployedAddresses.dev.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.dev.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.dev.proxyAdmin);
            break;
        case 'ropsten':
            token = await ERC20RupiahToken.at(DeployedAddresses.ropsten.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.ropsten.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.ropsten.proxyAdmin);
            break;
        case 'rinkeby':                 
            token = await ERC20RupiahToken.at(DeployedAddresses.rinkeby.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.rinkeby.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.rinkeby.proxyAdmin);
            break;
        case 'mainnet':
            token = await ERC20RupiahToken.at(DeployedAddresses.mainnet.tokenProxy);
            wallet = await IDRTWallet.at(DeployedAddresses.mainnet.walletProxy);
            proxyAdmin = await ProxyAdmin.at(DeployedAddresses.mainnet.proxyAdmin);
            break;
        };
        
    console.log("Change ERC20 Ownership to wallet address...");
    await token.transferOwnership(wallet.address);

    console.log("Change Proxy Admin to wallet address...");
    await proxyAdmin.transferOwnership(wallet.address);

    console.log("Change Wallet owner role to designated address...");
    await wallet.transferOwnership(Config.owner);

    const current_token_owner = await token.owner();
    const current_proxy_admin_owner = await proxyAdmin.owner();
    const current_wallet_owner = await wallet.superOwner();

    assert.strictEqual(current_token_owner, wallet.address);
    assert.strictEqual(current_proxy_admin_owner, wallet.address);
    assert.strictEqual(current_wallet_owner, Config.owner);

    console.log("Current owner of the token", current_token_owner);
    console.log("Current owner of the proxy admin", current_proxy_admin_owner);
    console.log("Current owner of the wallet", current_wallet_owner);
};
