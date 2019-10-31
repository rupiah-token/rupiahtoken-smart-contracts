pragma solidity 0.4.25;

interface IFeeCollector {
    event CalcFee(address indexed _from, address indexed _to, uint _value);
    event Withdraw(address indexed _from, uint256 value);

    function withdraw() external returns (uint256);
    function withdrawAll() external returns (uint256);
    function calcFee(address _from, address _to, uint256 _value) external returns (uint256);
}
