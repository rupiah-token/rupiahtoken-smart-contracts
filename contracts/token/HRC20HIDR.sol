/**
 * Rupiah Token Smart Contract
 * Copyright (C) 2020 PT. Rupiah Token Indonesia <https://www.rupiahtoken.com/>. 
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
 * This file incorporates work covered byt the following copyright and
 * permission notice:
 *
 *     OpenZeppelin <https://github.com/OpenZeppelin/openzeppelin-solidity/>     
 *     Copyright (c) 2016 Smart Contract Solutions, Inc.
 *     Modified for Rupiah Token by FengkieJ 2019.
 * 
 *     centre-tokens <https://github.com/centrehq/centre-tokens>
 *     Copyright CENTRE SECZ 2018.
 *     Modified for Rupiah Token by FengkieJ 2019.
 *
 *     ZeppelinOS (zos) <https://github.com/zeppelinos/zos>
 *     Copyright (c) 2018 ZeppelinOS Global Limited.
 *
 *     The MIT License (MIT)
 *
 *     Permission is hereby granted, free of charge, to any person obtaining a copy 
 *     of this software and associated documentation files (the "Software"), to deal 
 *     in the Software without restriction, including without limitation the rights 
 *     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 *     copies of the Software, and to permit persons to whom the Software is furnished to 
 *     do so, subject to the following conditions:
 *
 *     The above copyright notice and this permission notice shall be included in all 
 *     copies or substantial portions of the Software.
 *
 *     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 *     WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
 *     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
pragma solidity 0.4.25;

import "./ERC20RupiahTokenV1.sol";

/**
 * @title HRC20HIDR
 * @dev HRC20 & Harmony-ETH bridge compliant HIDR
 * Changelogs 2020-09-01: 
                - Implement Harmony's https://github.com/harmony-one/ethhmy-bridge MyERC20.sol functions.
                - Inherits all original owner priviledges except mint which now can only be done by wards.
                - burnFrom now doesn't impose approve requirement as bridge safety function by multisig admins.
 */
contract HRC20HIDR is ERC20RupiahToken {

    mapping(address => uint256) public wards;

    function redenominateDecimals(uint8 y) public whenNotPaused onlyOwner returns (uint8) {
        _decimals = _decimals + y;

        return _decimals;
    }

    function rely(address guy) external whenNotPaused notBlacklisted(guy) onlyOwner {
        wards[guy] = 1;
    }

    function deny(address guy) external whenNotPaused onlyOwner {
        wards[guy] = 0;
    }

    modifier auth {
        require(wards[msg.sender] == 1, "HIDR/not-authorized");
        _;
    }

    function mint(address beneficiary, uint256 amount) public whenNotPaused auth {
        require(beneficiary != address(0));

        _totalSupply = _totalSupply.add(amount);
        _balances[beneficiary] = _balances[beneficiary].add(amount);
        emit Transfer(address(0), beneficiary, amount);
    }

    function burn(address beneficiary, uint256 amount) public whenNotPaused auth {
        require(beneficiary == msg.sender);

        _totalSupply = _totalSupply.sub(amount);
        _balances[beneficiary] = _balances[beneficiary].sub(amount);
        emit Transfer(beneficiary, address(0), amount);
    }

    function burnFrom(address beneficiary, uint256 amount) public whenNotPaused onlyOwner {
        require(beneficiary != address(0));
        
        _totalSupply = _totalSupply.sub(amount);
        _balances[beneficiary] = _balances[beneficiary].sub(amount);
        emit Transfer(beneficiary, address(0), amount);
    }
}