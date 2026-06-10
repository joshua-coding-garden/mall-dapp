// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MallToken (MTK)
 * @notice 商城平台代幣，使用者用它購買商品 NFT。
 *         對應作業：HW2(modifier/require/event/繼承)、HW3(ERC-20 + OpenZeppelin 多重繼承)
 *
 *  加值功能（多重繼承 OpenZeppelin 擴充模組）：
 *   - ERC20Burnable：持有者可銷毀代幣（通縮機制）
 *   - ERC20Capped  ：發行硬上限 5,000,000 MTK，杜絕無限增發
 *   - ERC20Pausable：擁有者可緊急凍結所有轉帳（Circuit Breaker）
 *   - Ownable      ：權限控管
 *   另內建 faucet：任何人可 claim() 領測試代幣（含冷卻時間防濫領）
 */
contract MallToken is ERC20, ERC20Burnable, ERC20Capped, ERC20Pausable, Ownable {
    uint256 public constant FAUCET_AMOUNT = 1000 * 10 ** 18;
    uint256 public constant CLAIM_COOLDOWN = 1 hours;

    /// 紀錄每個地址上次領取時間
    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed user, uint256 amount);

    /**
     * @dev 建構子：設定名稱/符號、發行上限 5M，並先鑄造 100 萬給部署者。
     *      多重繼承需依序呼叫各父合約建構子。
     */
    constructor()
        ERC20("MallToken", "MTK")
        ERC20Capped(5_000_000 * 10 ** 18)
        Ownable(msg.sender)
    {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /**
     * @notice 任何人可領一次測試代幣（受冷卻時間限制；合約暫停時自動失效）。
     * @dev HW2 #4 Error Handling：用 require 防呆。
     */
    function claim() external {
        require(
            lastClaim[msg.sender] == 0 ||
                block.timestamp >= lastClaim[msg.sender] + CLAIM_COOLDOWN,
            "MallToken: still in cooldown, try later"
        );
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Claimed(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice 只有擁有者能額外增發（不可超過 cap 上限）。
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice 擁有者可暫停 / 解除暫停所有轉帳。
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev 多重繼承必須覆寫 _update，串接三個父合約的檢查邏輯
     *      （上限檢查 ERC20Capped、暫停檢查 ERC20Pausable）。
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Capped, ERC20Pausable) {
        super._update(from, to, value);
    }
}
