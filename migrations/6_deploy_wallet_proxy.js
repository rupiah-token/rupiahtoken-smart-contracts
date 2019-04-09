const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const IDRTWalletImplementation = artifacts.require("./governance/wallet/IDRTWallet");
const ProxyAdmin = artifacts.require("./zos/upgradeability/ProxyAdmin");
const AdminUpgradeabilityProxy = artifacts.require("./zos/upgradeability/AdminUpgradeabilityProxy");

module.exports = function(deployer, network, accounts) {
    console.log("deploying wallet proxy contract...");
    deployer.then(function() {
		switch(network) {
            case 'development':	
  				return AdminUpgradeabilityProxy.new(DeployedAddresses.dev.walletImplementationV1, DeployedAddresses.dev.proxyAdmin, []);
    		case 'ropsten':
		  		return AdminUpgradeabilityProxy.new(DeployedAddresses.ropsten.walletImplementationV1, DeployedAddresses.ropsten.proxyAdmin, []);
            case 'rinkeby':    				
            	return AdminUpgradeabilityProxy.new(DeployedAddresses.rinkeby.walletImplementationV1, DeployedAddresses.rinkeby.proxyAdmin, []);
            case 'mainnet':
		  		return AdminUpgradeabilityProxy.new(DeployedAddresses.mainnet.walletImplementationV1, DeployedAddresses.mainnet.proxyAdmin, []);
    		};
	}).then(async function(instance) {
		console.log("Wallet Proxy at:", instance.address);
		switch(network) {
            case 'development':	
  				DeployedAddresses.dev.walletProxy = instance.address;
    			break;
    		case 'ropsten':
		  		DeployedAddresses.ropsten.walletProxy = instance.address;                
		  		break;
            case 'rinkeby':    				
            	DeployedAddresses.rinkeby.walletProxy = instance.address;
            	break;
            case 'mainnet':
		  		DeployedAddresses.mainnet.walletProxy = instance.address;
                break;
    		}
  		fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
  	});
};
