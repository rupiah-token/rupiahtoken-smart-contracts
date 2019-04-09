const { BN, constants, expectEvent, shouldFail } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;
const TestUtils = require('./TestUtils');
const ERC20RupiahToken = artifacts.require('ERC20RupiahToken');
const ERC20RupiahTokenV2 = artifacts.require('ERC20RupiahTokenV2');
const IDRTWallet = artifacts.require('IDRTWallet');
const IDRTWalletV2 = artifacts.require('IDRTWalletV2');
const ProxyAdmin = artifacts.require('ProxyAdmin');

contract('Upgradeability', function ([deployer, account_1, account_2, account_3, anotherAccount, ...otherAccounts]) {
  const _name = 'Rupiah Token';
  const _symbol = 'RPT';
  const _currency = 'IDR';
  const _decimals = new BN(2);

  beforeEach(async function () {
    proxyAdmin = await TestUtils.createProxyAdmin();

    tokenImplementation = await TestUtils.createImplementation(ERC20RupiahToken);
    tokenProxy = await TestUtils.createProxy(tokenImplementation.address, proxyAdmin.address, []); 

    walletImplementation = await TestUtils.createImplementation(IDRTWallet);
    walletProxy = await TestUtils.createProxy(walletImplementation.address, proxyAdmin.address, []);
    
    this.token = await ERC20RupiahToken.at(tokenProxy.address);
    this.wallet = await IDRTWallet.at(walletProxy.address);
    this.proxyAdmin = await ProxyAdmin.at(proxyAdmin.address);

    await TestUtils.initializeTokenProxy(this.token);
    await TestUtils.initializeWalletProxy(this.wallet);
    
    await this.token.mint(account_1, 100);
  });

  describe('upgrade', function () {
    describe('token', function () {
      beforeEach(async function() {
        tokenImplementationV2 = await TestUtils.createImplementation(ERC20RupiahTokenV2);
      });

      describe('when the sender is not proxyAdmin owner', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.proxyAdmin.upgrade(tokenProxy.address, tokenImplementationV2.address, { from : account_1 }));
        });
      });

      describe('when the sender is proxyAdmin owner', function () {
        it('upgraded', async function () {
          await this.proxyAdmin.upgrade(tokenProxy.address, tokenImplementationV2.address, { from : deployer });
          (await this.proxyAdmin.getProxyImplementation(tokenProxy.address)).should.equal(tokenImplementationV2.address);
        });
      });

      describe('when upgraded', function () {
        beforeEach(async function () {
          await this.proxyAdmin.upgrade(tokenProxy.address, tokenImplementationV2.address, { from : deployer });
          this.token = await ERC20RupiahTokenV2.at(tokenProxy.address);
        });

        it('should retain the previous storage', async function () {
          (await this.token.balanceOf(account_1)).should.be.bignumber.equal('10000');
          (await this.token.totalSupply()).should.be.bignumber.equal('10000');
        });

        it('should acquire V2 functions and storage', async function () {
          (await this.token.shouldBeAString()).should.equal('Upgraded to V2');
          (await this.token.shouldBeEmptyString()).should.equal('');
          (await this.token.getUpgradeTest('success')).should.equal('success');
        });

        it('should not reenable initialize function', async function () {
          await shouldFail.reverting(this.token.initialize(_name, _symbol, _currency, _decimals, { from : deployer }));
        });
      });
    });
  });

  describe('upgrade', function () {
    describe('wallet', function () {
      beforeEach(async function() {
        walletImplementationV2 = await TestUtils.createImplementation(IDRTWalletV2);
      });

      describe('when the sender is not proxyAdmin owner', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.proxyAdmin.upgrade(walletProxy.address, walletImplementationV2.address, { from : account_1 }));
        });
      });

      describe('when the sender is proxyAdmin owner', function () {
        it('upgraded', async function () {
          await this.proxyAdmin.upgrade(walletProxy.address, walletImplementationV2.address, { from : deployer });
          (await this.proxyAdmin.getProxyImplementation(walletProxy.address)).should.equal(walletImplementationV2.address);
        });
      });

      describe('when upgraded', function () {
        beforeEach(async function () {
          await this.proxyAdmin.upgrade(walletProxy.address, walletImplementationV2.address, { from : deployer });
          this.wallet = await IDRTWalletV2.at(walletProxy.address);
        });

        it('should retain the previous storage', async function () {
          (await this.wallet.required()).should.be.bignumber.equal('2');

        });

        it('should acquire V2 functions and storage', async function () {
          (await this.wallet.shouldBeAString()).should.equal('Upgraded to V2');
          (await this.wallet.shouldBeEmptyString()).should.equal('');
          (await this.wallet.getUpgradeTest('success')).should.equal('success');
        });

        it('should not reenable initialize function', async function () {
          await shouldFail.reverting(this.wallet.initialize([account_1, account_2, account_3], 2, 100000, { from : deployer }));
        });
      });
    });
  });

    describe('upgrade and call', function () {
    describe('token', function () {
      beforeEach(async function() {
        tokenImplementationV2 = await TestUtils.createImplementation(ERC20RupiahTokenV2);
      });

      describe('when the sender is not proxyAdmin owner', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.proxyAdmin.upgradeAndCall(tokenProxy.address, tokenImplementationV2.address, "0x70a08231", { from : account_1 }));
        });
      });

      describe('when the sender is proxyAdmin owner', function () {
        it('upgraded', async function () {
          await this.proxyAdmin.upgradeAndCall(tokenProxy.address, tokenImplementationV2.address, "0x70a08231", { from : deployer });
          (await this.proxyAdmin.getProxyImplementation(tokenProxy.address)).should.equal(tokenImplementationV2.address);
        });
      });

      describe('when upgraded', function () {
        beforeEach(async function () {
          await this.proxyAdmin.upgradeAndCall(tokenProxy.address, tokenImplementationV2.address, "0x70a08231", { from : deployer });
          this.token = await ERC20RupiahTokenV2.at(tokenProxy.address);
        });

        it('should retain the previous storage', async function () {
          (await this.token.balanceOf(account_1)).should.be.bignumber.equal('10000');
          (await this.token.totalSupply()).should.be.bignumber.equal('10000');
        });

        it('should acquire V2 functions and storage', async function () {
          (await this.token.shouldBeAString()).should.equal('Upgraded to V2');
          (await this.token.shouldBeEmptyString()).should.equal('');
          (await this.token.getUpgradeTest('success')).should.equal('success');
        });

        it('should not reenable initialize function', async function () {
          await shouldFail.reverting(this.token.initialize(_name, _symbol, _currency, _decimals, { from : deployer }));
        });
      });
    });
  });

  describe('upgrade and call', function () {
    describe('wallet', function () {
      beforeEach(async function() {
        walletImplementationV2 = await TestUtils.createImplementation(IDRTWalletV2);
      });

      describe('when the sender is not proxyAdmin owner', function () {
        it('reverts', async function () {
          await shouldFail.reverting(this.proxyAdmin.upgradeAndCall(walletProxy.address, walletImplementationV2.address, [], { from : account_1 }));
        });
      });

      describe('when the sender is proxyAdmin owner', function () {
        it('upgraded', async function () {
          await this.proxyAdmin.upgradeAndCall(walletProxy.address, walletImplementationV2.address, [], { from : deployer });
          (await this.proxyAdmin.getProxyImplementation(walletProxy.address)).should.equal(walletImplementationV2.address);
        });
      });

      describe('when upgraded', function () {
        beforeEach(async function () {
          await this.proxyAdmin.upgradeAndCall(walletProxy.address, walletImplementationV2.address, [], { from : deployer });
          this.wallet = await IDRTWalletV2.at(walletProxy.address);
        });

        it('should retain the previous storage', async function () {
          (await this.wallet.required()).should.be.bignumber.equal('2');

        });

        it('should acquire V2 functions and storage', async function () {
          (await this.wallet.shouldBeAString()).should.equal('Upgraded to V2');
          (await this.wallet.shouldBeEmptyString()).should.equal('');
          (await this.wallet.getUpgradeTest('success')).should.equal('success');
        });

        it('should not reenable initialize function', async function () {
          await shouldFail.reverting(this.wallet.initialize([account_1, account_2, account_3], 2, 100000, { from : deployer }));
        });
      });
    });
  });
});
