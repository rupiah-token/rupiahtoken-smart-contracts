/**
 * Rupiah Token Smart Contract
 * Copyright (C) 2019 PT. Rupiah Token Indonesia <https://www.rupiahtoken.com/>. 
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *     Ethereum Multisignature Wallet <https://github.com/gnosis/MultiSigWallet>     
 *     Copyright (c) 2016 Gnosis Ltd.
 *     Modified for Rupiah Token by FengkieJ 2019.
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Lesser General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Lesser General Public License for more details.
 *
 *     You should have received a copy of the GNU Lesser General Public License
 *     along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
pragma solidity 0.4.25;

import "./IDRTWalletV1.sol";

/**
 * @title IDRTWalletV2
 * @dev Version 2 for ERC20RupiahToken
 * For demo purpose of zos upgradeability 
 */
contract IDRTWalletV2 is IDRTWallet {
    string constant public shouldBeAString = "Upgraded to V2";
    string public shouldBeEmptyString = "Upgraded to V2";

   /**
    * @dev Function to test new added functionality to the implementation.
    * @param success string to return
    * @return string memory from the input
    */
    function getUpgradeTest(string memory success) public pure returns (string memory) {
      return success;
    }
}
