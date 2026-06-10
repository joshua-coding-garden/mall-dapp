// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace (商城交易合約)
 * @notice 把「代幣」與「NFT 商品」串起來的核心：上架、用 MTK 購買、取消。
 *         這就是「混合型商城」的關鍵 — 用自製 ERC-20 買 ERC-721 商品。
 *         對應作業：HW2 全部 (modifier / require / event / 呼叫其他合約 / 繼承)
 *
 *  交易流程（去中心化、買賣雙方自己保管資產）：
 *   1. 賣家 mint 一個 MallItem NFT，並 approve 本合約可轉移它
 *   2. 賣家呼叫 list() 上架，設定 MTK 價格
 *   3. 買家先 approve 本合約可動用足額 MTK，再呼叫 buy()
 *   4. buy() 同時：把 MTK 從買家轉給賣家、把 NFT 從賣家轉給買家（原子操作）
 */
contract Marketplace is ReentrancyGuard, IERC721Receiver {
    /// 用來付款的平台代幣（MallToken）
    IERC20 public immutable paymentToken;

    struct Listing {
        uint256 listingId;
        address seller;
        address nft; // 商品 NFT 合約位址
        uint256 tokenId; // 商品編號
        uint256 price; // 售價（以 MTK 計）
        bool active; // 是否仍在販售
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    // ---- 事件（HW2 #5）：前端與 Etherscan 都靠這些追蹤交易 ----
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address nft,
        uint256 tokenId,
        uint256 price
    );
    event Purchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event Cancelled(uint256 indexed listingId);

    /// HW2 #2 Function Modifier：限定只有賣家本人能操作該上架
    modifier onlySeller(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Marketplace: not the seller");
        _;
    }

    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Marketplace: zero token address");
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice 賣家上架一件商品。需先 approve 本合約可轉移該 NFT。
     * @dev HW2 #6 呼叫其他合約：這裡讀取 IERC721 的擁有權與授權狀態。
     */
    function list(address nft, uint256 tokenId, uint256 price) external returns (uint256) {
        require(price > 0, "Marketplace: price must be > 0");
        require(IERC721(nft).ownerOf(tokenId) == msg.sender, "Marketplace: you are not the owner");
        require(
            IERC721(nft).getApproved(tokenId) == address(this) ||
                IERC721(nft).isApprovedForAll(msg.sender, address(this)),
            "Marketplace: NFT not approved for marketplace"
        );

        uint256 id = nextListingId;
        nextListingId++;
        listings[id] = Listing(id, msg.sender, nft, tokenId, price, true);

        emit Listed(id, msg.sender, nft, tokenId, price);
        return id;
    }

    /**
     * @notice 買家購買一件商品：付 MTK 給賣家、收下 NFT。
     * @dev HW2 #4 require 防呆 + #6 呼叫兩個合約；nonReentrant 防重入攻擊。
     */
    function buy(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.active, "Marketplace: listing not active");
        require(msg.sender != l.seller, "Marketplace: seller cannot buy own item");

        // 先標記成已售出（Checks-Effects-Interactions 安全模式）
        l.active = false;

        // 1) 收款：把買家的 MTK 轉給賣家（買家須先 approve 本合約）
        require(
            paymentToken.transferFrom(msg.sender, l.seller, l.price),
            "Marketplace: MTK payment failed (did you approve & have enough?)"
        );

        // 2) 交貨：把 NFT 從賣家轉給買家（賣家上架時已 approve 本合約）
        IERC721(l.nft).safeTransferFrom(l.seller, msg.sender, l.tokenId);

        emit Purchased(listingId, msg.sender, l.seller, l.price);
    }

    /// @notice 賣家可取消尚未售出的上架。
    function cancel(uint256 listingId) external onlySeller(listingId) {
        require(listings[listingId].active, "Marketplace: listing not active");
        listings[listingId].active = false;
        emit Cancelled(listingId);
    }

    /**
     * @notice 回傳目前所有「仍在販售」的商品，給前端一次抓取顯示。
     */
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 count;
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) count++;
        }

        Listing[] memory result = new Listing[](count);
        uint256 j;
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) {
                result[j] = listings[i];
                j++;
            }
        }
        return result;
    }

    /// 讓本合約能安全接收 ERC-721（IERC721Receiver 標準回呼）
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
