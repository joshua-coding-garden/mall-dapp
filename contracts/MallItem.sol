// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MallItem (商品 NFT)
 * @notice 商城裡的每一件商品就是一個 ERC-721 NFT，圖片/描述放在 IPFS。
 *         對應作業：HW4(ERC-721 + IPFS metadata + 多項 OpenZeppelin 擴充)
 *
 *  加值功能（多重繼承）：
 *   - ERC721Enumerable：可列舉，方便查 totalSupply 與遍歷某地址持有的 NFT
 *   - ERC721URIStorage：每個 NFT 可設定獨立 tokenURI（指向 IPFS）
 *   - ERC721Pausable  ：擁有者可緊急凍結所有 NFT 轉移
 *   - ERC721Burnable  ：持有者可銷毀自己的 NFT
 */
contract MallItem is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Pausable,
    ERC721Burnable,
    Ownable
{
    uint256 private _nextId;

    event ItemMinted(address indexed owner, uint256 indexed tokenId, string tokenURI);

    constructor() ERC721("MallItem", "ITEM") Ownable(msg.sender) {}

    /**
     * @notice 鑄造一件新商品 NFT（任何使用者皆可上架自己的商品）。
     * @param to  商品擁有者（賣家）
     * @param uri 指向 IPFS 的 metadata 網址
     */
    function mintItem(address to, string memory uri) external returns (uint256) {
        uint256 tokenId = _nextId;
        _nextId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit ItemMinted(to, tokenId, uri);
        return tokenId;
    }

    /// @notice 目前已鑄造的商品總數。
    function totalMinted() external view returns (uint256) {
        return _nextId;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---- 多重繼承必須覆寫的函數（HW4 報告所述）----
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable, ERC721Pausable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
