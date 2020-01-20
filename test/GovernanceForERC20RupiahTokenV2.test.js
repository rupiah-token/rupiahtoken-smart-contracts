const {
  BN,
  constants,
  expectEvent,
  shouldFail
} = require("openzeppelin-test-helpers");
const { ZERO_ADDRESS } = constants;
const TestUtils = require("./TestUtils");
const ERC20RupiahToken = artifacts.require("ERC20RupiahToken");
const ERC20RupiahTokenV2 = artifacts.require("ERC20RupiahTokenV2");
const IDRTWallet = artifacts.require("IDRTWallet");
const IDRTWalletV2 = artifacts.require("IDRTWalletV2");
const ProxyAdmin = artifacts.require("ProxyAdmin");

contract("Governance for V2", function([
  deployer,
  account_1,
  account_2,
  account_3,
  anotherAccount,
  ...otherAccounts
]) {
  const _name = "Rupiah Token";
  const _symbol = "IDRT";
  const _currency = "IDR";
  const _decimals = new BN(2);

  beforeEach(async function() {
    proxyAdmin = await TestUtils.createProxyAdmin(deployer);

    tokenImplementation = await TestUtils.createImplementation(
      ERC20RupiahToken
    );
    tokenProxy = await TestUtils.createProxy(
      tokenImplementation.address,
      proxyAdmin.address,
      []
    );

    walletImplementation = await TestUtils.createImplementation(IDRTWallet);
    walletProxy = await TestUtils.createProxy(
      walletImplementation.address,
      proxyAdmin.address,
      []
    );

    this.token = await ERC20RupiahToken.at(tokenProxy.address);
    this.wallet = await IDRTWallet.at(walletProxy.address);
    this.proxyAdmin = await ProxyAdmin.at(proxyAdmin.address);

    await TestUtils.initializeTokenProxy(this.token);
    await TestUtils.initializeWalletProxy(this.wallet);

    await this.token.mint(walletProxy.address, 5);
    await this.token.mint(anotherAccount, 5);

    this.proxyAdmin = await ProxyAdmin.at(proxyAdmin.address);
    tokenImplementationV2 = await TestUtils.createImplementation(
        ERC20RupiahTokenV2
    );
    await this.proxyAdmin.upgrade(
        tokenProxy.address,
        tokenImplementationV2.address,
        {from: deployer }
    );
    (await this.proxyAdmin.getProxyImplementation(
        tokenProxy.address
    )).should.equal(tokenImplementationV2.address);
    this.token = await ERC20RupiahTokenV2.at(tokenProxy.address)
  });

  describe("transfer _superOwner", function() {
    describe("when the sender is not _superOwner", function() {
      it("reverts", async function() {
        await shouldFail.reverting(
          this.wallet.transferOwnership(anotherAccount, { from: account_1 })
        );
      });
    });

    describe("when the sender is _superOwner", function() {
      it("should be transferred", async function() {
        const { logs } = await this.wallet.transferOwnership(anotherAccount, {
          from: deployer
        });
        expectEvent.inLogs(logs, "OwnershipTransferred", {
          previousOwner: deployer,
          newOwner: anotherAccount
        });
      });
    });
  });

  describe("print limit", function() {
    describe("set print limit", function() {
      describe("called by non _superOwner", function() {
        it("reverts", async function() {
          await shouldFail.reverting(
            this.wallet.setPrintLimit(10000, { from: account_1 })
          );
        });
      });

      describe("called by _superOwner", function() {
        it("should success", async function() {
          await this.wallet.setPrintLimit(100000, { from: deployer });
        });

        it("should emit PrintLimitChanged", async function() {
          const { logs } = await this.wallet.setPrintLimit(10000, {
            from: deployer
          });
          expectEvent.inLogs(logs, "PrintLimitChanged", {
            oldValue: "100000000",
            newValue: "10000"
          });
        });
      });
    });
  });

  describe("Wallet multisig tx", function() {
    describe("addAdmin", function() {
      describe("called by non wallet account", function() {
        describe("addOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.addOwner(anotherAccount, { from: anotherAccount })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("addOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                walletProxy.address,
                0,
                `0x7065cb48000000000000000000000000${anotherAccount.substring(2)}`,
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("addOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                proxyAdmin.address,
                0,
                `0x7065cb48000000000000000000000000${anotherAccount.substring(2)}`,
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("addOwner", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              walletProxy.address,
              0,
              `0x7065cb48000000000000000000000000${anotherAccount.substring(2)}`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.wallet.isOwner(anotherAccount)).should.equal(false);
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("approved by other admin but requireFinalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.wallet.isOwner(anotherAccount)).should.equal(false);
          });

          it("execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            (await this.wallet.isOwner(anotherAccount)).should.equal(true);
          });

          it("cannot re-execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            await shouldFail.reverting(
              this.wallet.finalizeTransaction(0, { from: deployer })
            );
          });
        });
      });
    });

    describe("removeAdmin", function() {
      describe("called by non wallet account", function() {
        describe("removeOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.removeOwner(account_3, { from: anotherAccount })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("removeOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                walletProxy.address,
                0,
                `0x173825d9000000000000000000000000${account_3.substring(2)}`,
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("removeOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                proxyAdmin.address,
                0,
                `0x173825d9000000000000000000000000${account_3.substring(2)}`,
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("removeOwner", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              walletProxy.address,
              0,
              `0x173825d9000000000000000000000000${account_3.substring(2)}`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.wallet.isOwner(account_3)).should.equal(true);
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("approved by other admin but requireFinalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            (await this.wallet.isOwner(account_3)).should.equal(true);
          });

          it("execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            (await this.wallet.isOwner(account_3)).should.equal(false);
          });

          it("cannot re-execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            await shouldFail.reverting(
              this.wallet.finalizeTransaction(0, { from: deployer })
            );
          });
        });
      });
    });

    describe("replaceAdmin", function() {
      describe("called by non wallet account", function() {
        describe("replaceOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.replaceOwner(account_3, anotherAccount, {
                from: anotherAccount
              })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("replaceOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                walletProxy.address,
                0,
                `0xe20056e6000000000000000000000000${account_3.substring(2)}000000000000000000000000${anotherAccount.substring(2)}`,
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("replaceOwner", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                proxyAdmin.address,
                0,
                `0xe20056e6000000000000000000000000${account_3.substring(2)}000000000000000000000000${anotherAccount.substring(2)}`,
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("replaceOwner", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              walletProxy.address,
              0,
              `0xe20056e6000000000000000000000000${account_3.substring(2)}000000000000000000000000${anotherAccount.substring(2)}`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.wallet.isOwner(account_3)).should.equal(true);
            (await this.wallet.isOwner(anotherAccount)).should.equal(false);
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("approved by other admin but requireFinalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            (await this.wallet.isOwner(account_3)).should.equal(true);
            (await this.wallet.isOwner(anotherAccount)).should.equal(false);
          });

          it("execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            (await this.wallet.isOwner(account_3)).should.equal(false);
            (await this.wallet.isOwner(anotherAccount)).should.equal(true);
          });

          it("cannot re-execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            await shouldFail.reverting(
              this.wallet.finalizeTransaction(0, { from: deployer })
            );
          });
        });

        describe("replaceOwner", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              walletProxy.address,
              0,
              `0xe20056e6000000000000000000000000${account_3.substring(2)}000000000000000000000000${anotherAccount.substring(2)}`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.wallet.isOwner(anotherAccount)).should.equal(false);
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("approved by other admin but requireFinalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            (await this.wallet.isOwner(anotherAccount)).should.equal(false);
          });

          it("execute after owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_3 });
            await this.wallet.finalizeTransaction(0, { from: deployer });

            (await this.wallet.isOwner(anotherAccount)).should.equal(true);
          });
        });
      });
    });
  });

  describe("ProxyAdmin multisig tx", function() {
    beforeEach(async function() {
      /* Transfer ownership to multisig wallet */
      await this.proxyAdmin.transferOwnership(walletProxy.address);

      /* Create new implementation for V2 */
      this.tokenImplementationV2 = await ERC20RupiahTokenV2.new();
      this.walletImplementationV2 = await IDRTWalletV2.new();
    });
  });

  describe("ERC20 multisig tx", function() {
    beforeEach(async function() {
      /* Transfer ownership to multisig wallet */
      await this.token.transferOwnership(walletProxy.address);
    });
    describe("mint", function() {
      describe("called by non wallet account", function() {
        describe("below print limit", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.mint(anotherAccount, 50000000, {
                from: anotherAccount
              })
            );
          });
        });

        describe("above print limit", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.mint(anotherAccount, 100000000, {
                from: anotherAccount
              })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("below print limit", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000002faf080`,
                { from: anotherAccount }
              )
            );
          });
        });

        describe("above print limit", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000002faf080`,
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("below print limit", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000002faf080`,
                { from: deployer }
              )
            );
          });
        });

        describe("above print limit", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000002faf080`,
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("below print limit", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000002faf080`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.totalSupply()).should.be.bignumber.equal("1000");
            (await this.wallet.requireFinalization(0)).should.equal(false);
          });

          it("execute transaction if approved by other admin", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.totalSupply()).should.be.bignumber.equal(
              "5000001000"
            );
            (await this.token.balanceOf(
              anotherAccount
            )).should.be.bignumber.equal("5000000500");
          });
        });

        describe("equal to print limit", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000005f5e100`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.totalSupply()).should.be.bignumber.equal("1000");
            (await this.wallet.requireFinalization(0)).should.equal(false);
          });

          it("execute transaction if approved by other admin", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.totalSupply()).should.be.bignumber.equal(
              "10000001000"
            );
            (await this.token.balanceOf(
              anotherAccount
            )).should.be.bignumber.equal("10000000500");
          });
        });

        describe("above print limit", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              `0x40c10f19000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000008f0d180`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and require finalization", async function() {
            (await this.token.totalSupply()).should.be.bignumber.equal("1000");
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("does not execute transaction and require owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.totalSupply()).should.be.bignumber.equal("1000");
            (await this.token.balanceOf(
              anotherAccount
            )).should.be.bignumber.equal("500");
          });

          it("execute transaction if approved by other admin and owner finalizes", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            (await this.token.totalSupply()).should.be.bignumber.equal(
              "15000001000"
            );
            (await this.token.balanceOf(
              anotherAccount
            )).should.be.bignumber.equal("15000000500");
          });
        });
      });
    });

    describe("pause/unpause", function() {
      describe("called by non wallet account", function() {
        describe("pause", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.pause({ from: anotherAccount })
            );
          });
        });

        describe("unpause", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.unpause({ from: anotherAccount })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("pause", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x8456cb59",
                { from: anotherAccount }
              )
            );
          });
        });

        describe("unpause", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x3f4ba83a",
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("pause", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x8456cb59",
                { from: deployer }
              )
            );
          });
        });

        describe("unpause", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x3f4ba83a",
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("pause", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              "0x8456cb59",
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.paused()).should.equal(false);
            (await this.wallet.requireFinalization(0)).should.equal(false);
          });

          it("execute transaction if approved by other admin", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.paused()).should.equal(true);
          });
        });

        describe("unpause", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              "0x3f4ba83a",
              { from: account_1 }
            );
          });

          it("submitted but not executed and require finalization", async function() {
            (await this.token.paused()).should.equal(false);
            (await this.wallet.requireFinalization(0)).should.equal(false);
          });

          it("execute transaction and does not require owner finalization", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.paused()).should.equal(false);
          });
        });
      });
    });

    describe("transfer ownership", function() {
      describe("called by non wallet account", function() {
        describe("transferOwnership", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.transferOwnership(anotherAccount, {
                from: anotherAccount
              })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("transferOwnership", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0xf2fde38b000000000000000000000000${anotherAccount.substring(2)}`,
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("transferOwnership", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0xf2fde38b000000000000000000000000${anotherAccount.substring(2)}`,
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("transferOwnership", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              `0xf2fde38b000000000000000000000000${anotherAccount.substring(2)}`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.owner()).should.equal(walletProxy.address);
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("approved by other admin but does not execute transaction", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.owner()).should.equal(walletProxy.address);
          });

          it("executes if confirmed by other admin and finalized by owner", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            (await this.token.owner()).should.equal(anotherAccount);
          });
        });
      });
    });

    describe("renounce ownership", function() {
      describe("called by non wallet account", function() {
        describe("renounceOwnership", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.renounceOwnership({ from: anotherAccount })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("renounceOwnership", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x715018a6",
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("renounceOwnership", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x715018a6",
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("renounceOwnership", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              "0x715018a6",
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.owner()).should.equal(walletProxy.address);
            (await this.wallet.requireFinalization(0)).should.equal(true);
          });

          it("do not execute transaction if approved by other admin", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.owner()).should.equal(walletProxy.address);
          });

          it("executes if confirmed by other admin and finalized by owner", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            await this.wallet.finalizeTransaction(0, { from: deployer });
            (await this.token.owner()).should.equal(ZERO_ADDRESS);
          });
        });
      });
    });

    describe("burn", function() {
      describe("called by non wallet account", function() {
        describe("burn", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.burn(0, { from: anotherAccount })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("burn", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x42966c680000000000000000000000000000000000000000000000000000000000000000",
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("burn", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                "0x42966c680000000000000000000000000000000000000000000000000000000000000000",
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("burn", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              "0x42966c680000000000000000000000000000000000000000000000000000000000000005",
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.totalSupply()).should.be.bignumber.equal("1000");
            (await this.wallet.requireFinalization(0)).should.equal(false);
          });

          it("execute transaction if approved by other admin", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.totalSupply()).should.be.bignumber.equal("500");
          });
        });
      });
    });

    describe("burn from", function() {
      beforeEach("allow walletProxy to burn from an account", async function() {
        await this.token.approve(walletProxy.address, 500, {
          from: anotherAccount
        });
      });

      describe("called by non wallet account", function() {
        describe("burn from", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.token.burnFrom(anotherAccount, 5, { from: anotherAccount })
            );
          });
        });
      });

      describe("called by non admin account", function() {
        describe("burn from", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0x79cc6790000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000000000005`,
                { from: anotherAccount }
              )
            );
          });
        });
      });

      describe("called by superOwner account", function() {
        describe("burn from", function() {
          it("reverts", async function() {
            await shouldFail.reverting(
              this.wallet.submitTransaction(
                tokenProxy.address,
                0,
                `0x79cc6790000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000000000005`,
                { from: deployer }
              )
            );
          });
        });
      });

      describe("called by an admin account", function() {
        describe("burn from", function() {
          beforeEach("submit transaction", async function() {
            await this.wallet.submitTransaction(
              tokenProxy.address,
              0,
              `0x79cc6790000000000000000000000000${anotherAccount.substring(2)}0000000000000000000000000000000000000000000000000000000000000005`,
              { from: account_1 }
            );
          });

          it("submitted but not executed and does not require finalization", async function() {
            (await this.token.totalSupply()).should.be.bignumber.equal("1000");
            (await this.wallet.requireFinalization(0)).should.equal(false);
          });

          it("execute transaction if approved by other admin", async function() {
            await this.wallet.confirmTransaction(0, { from: account_2 });
            (await this.token.totalSupply()).should.be.bignumber.equal("500");
          });
        });
      });
    });
  });
});
