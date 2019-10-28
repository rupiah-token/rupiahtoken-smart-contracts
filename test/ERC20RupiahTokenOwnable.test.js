require("openzeppelin-test-helpers");
const { shouldBehaveLikeOwnable } = require("./Ownable.behavior");

const TestUtils = require("./TestUtils");
const ERC20RupiahToken = artifacts.require("ERC20RupiahToken");

contract("ERC20RupiahToken Ownable", function([owner, ...otherAccounts]) {
  beforeEach(async function() {
    proxyAdmin = await TestUtils.createProxyAdmin(owner);
    tokenImplementation = await TestUtils.createImplementation(
      ERC20RupiahToken
    );
    tokenProxy = await TestUtils.createProxy(
      tokenImplementation.address,
      proxyAdmin.address,
      []
    );

    this.ownable = await ERC20RupiahToken.at(tokenProxy.address);
    await TestUtils.initializeTokenProxy(this.ownable);
  });

  shouldBehaveLikeOwnable(owner, otherAccounts);
});
