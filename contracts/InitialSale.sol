pragma solidity ^0.5.6;

import "./klaytn-contracts/ownership/Ownable.sol";
import "./klaytn-contracts/math/SafeMath.sol";
import "./klaytn-contracts/token/KIP7/IKIP7.sol";

contract InitialSale is Ownable {
    using SafeMath for uint256;

    IKIP7 public ijm;
    uint256 public price = uint256(-1);

    constructor(IKIP7 _ijm) public {
        ijm = _ijm;
    }

    function setPrice(uint256 _price) onlyOwner external {
        price = _price;
    }

    function buy(uint256 amount) payable external {
        require(amount.mul(price).div(18) == msg.value);
        ijm.transfer(msg.sender, amount);
    }

    function withdraw() onlyOwner external {
        owner().transfer(address(this).balance);
    }
}
