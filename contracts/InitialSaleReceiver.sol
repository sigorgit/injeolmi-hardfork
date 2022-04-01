pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./klaytn-contracts/token/KIP7/IKIP7.sol";
import "./InitialSale.sol";

contract InitialSaleReceiver is Ownable {
    using SafeMath for uint256;

    IKIP7 public newIjm;
    InitialSale public initialSale;

    function setNewIjm(IKIP7 _newIjm) onlyOwner external {
        newIjm = _newIjm;
    }

    function setInitialSale(InitialSale _initialSale) onlyOwner external {
        initialSale = _initialSale;
    }

    mapping(address => bool) public received;

    function receiveNew() external {
        require(received[msg.sender] != true);
        newIjm.transfer(msg.sender, initialSale.bought(msg.sender).mul(11).div(10));
        received[msg.sender] = true;
    }

    function withdrawIjm() onlyOwner external {
        newIjm.transfer(owner(), newIjm.balanceOf(address(this)));
    }
}
