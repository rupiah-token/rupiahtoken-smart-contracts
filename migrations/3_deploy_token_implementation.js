const fs = require('fs');
const deployed_addresses_filename = "deployed_addresses.json";
const DeployedAddresses = require("./" + deployed_addresses_filename);

const ERC20RupiahTokenImplementation = artifacts.require("./token/ERC20RupiahToken");

module.exports = function(deployer, network, accounts) {
    console.log("deploying token implementation contract...");
    deployer.deploy(ERC20RupiahTokenImplementation)
    	.then(async function () {
    		switch(network) {
                case 'development':
		    		DeployedAddresses.dev.tokenImplementationV1 = (await ERC20RupiahTokenImplementation.deployed()).address;
		    		break;
		    	case 'ropsten':
                    DeployedAddresses.ropsten.tokenImplementationV1 = (await ERC20RupiahTokenImplementation.deployed()).address;
                    break;
                case 'rinkeby':
                    DeployedAddresses.rinkeby.tokenImplementationV1 = (await ERC20RupiahTokenImplementation.deployed()).address;
                    break;
                case 'mainnet':
                    DeployedAddresses.mainnet.tokenImplementationV1 = (await ERC20RupiahTokenImplementation.deployed()).address;
                    break;
		    }
    	});
    fs.writeFileSync("./migrations/" + deployed_addresses_filename, JSON.stringify(DeployedAddresses, null, 2));
};
