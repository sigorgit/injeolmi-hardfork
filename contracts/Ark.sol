pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./klaytn-contracts/token/KIP7/IKIP7.sol";

contract Ark is Ownable {
    using SafeMath for uint256;

    IKIP7 public oldIjm;
    IKIP7 public newIjm;

    uint256 public total = 0;
    mapping(address => uint256) public records;
    mapping(address => bool) public received;
    address[] public users;
    uint256 public step = 0;

    constructor(IKIP7 _oldIjm) public {
        oldIjm = _oldIjm;
    }

    function setNewIjm(IKIP7 _newIjm) onlyOwner external {
        newIjm = _newIjm;
    }

    function setStep(uint256 _step) onlyOwner external {
        step = _step;
    }

    function usersCount() external view returns (uint256) {
        return users.length;
    }

    // 단계1: 기록
    function record() external {
        uint256 balance = oldIjm.balanceOf(msg.sender);
        require(step == 0 && balance > 0 && records[msg.sender] == 0);
        records[msg.sender] = balance;
        users.push(msg.sender);
        total = total.add(balance);
    }

    // 단계2: 기존 인절미 입금
    function sendOld() external {
        require(step == 1);
        oldIjm.transferFrom(msg.sender, address(this), records[msg.sender]);
    }

    // 단계3: 뉴 인절미 받아가기
    function receiveNew() external {
        require(step == 2 && received[msg.sender] != true);

        // decimals 8 -> 18
        newIjm.transfer(msg.sender, records[msg.sender].mul(1e10));
        received[msg.sender] = true;
    }

    function withdrawOld() onlyOwner external {
        oldIjm.transfer(owner(), oldIjm.balanceOf(address(this)));
    }

    function withdrawNew() onlyOwner external {
        newIjm.transfer(owner(), newIjm.balanceOf(address(this)));
    }
}
