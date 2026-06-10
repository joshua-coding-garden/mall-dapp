import { expect } from "chai";
import { network } from "hardhat";

// Hardhat 3：透過 network.create() 取得綁定本地模擬鏈的 ethers 實例
const { ethers } = await network.create();

describe("Mall DApp - 混合型商城完整流程", function () {
  let token: any, item: any, market: any;
  let owner: any, seller: any, buyer: any;
  let itemAddr: string, marketAddr: string;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    token = await ethers.deployContract("MallToken");
    item = await ethers.deployContract("MallItem");
    market = await ethers.deployContract("Marketplace", [await token.getAddress()]);

    itemAddr = await item.getAddress();
    marketAddr = await market.getAddress();
  });

  it("使用者可以從 faucet 領 1000 MTK", async function () {
    await token.connect(buyer).claim();
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("1000"));
  });

  it("冷卻時間內不能重複領取（require 防呆）", async function () {
    await token.connect(buyer).claim();
    await expect(token.connect(buyer).claim()).to.be.revertedWith(
      "MallToken: still in cooldown, try later"
    );
  });

  it("發行總量受 cap 上限保護（ERC20Capped）", async function () {
    // 初始 100 萬，上限 500 萬；增發 410 萬會超過上限而失敗
    await expect(
      token.mint(owner.address, ethers.parseEther("4100000"))
    ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");
  });

  it("賣家可以鑄造商品 NFT，tokenURI 指向 IPFS", async function () {
    await item.connect(seller).mintItem(seller.address, "ipfs://demo-metadata");
    expect(await item.ownerOf(0)).to.equal(seller.address);
    expect(await item.tokenURI(0)).to.equal("ipfs://demo-metadata");
    expect(await item.totalSupply()).to.equal(1n); // ERC721Enumerable
  });

  it("完整流程：mint → 上架 → 用 MTK 購買，資產與代幣正確轉移", async function () {
    const price = ethers.parseEther("100");

    // 賣家：鑄造 → 授權 → 上架
    await item.connect(seller).mintItem(seller.address, "ipfs://item-0");
    await item.connect(seller).approve(marketAddr, 0);
    await expect(market.connect(seller).list(itemAddr, 0, price)).to.emit(market, "Listed");

    // 買家：領代幣 → 授權 → 購買
    await token.connect(buyer).claim();
    await token.connect(buyer).approve(marketAddr, price);
    await expect(market.connect(buyer).buy(0)).to.emit(market, "Purchased");

    // 驗證結果
    expect(await item.ownerOf(0)).to.equal(buyer.address);
    expect(await token.balanceOf(seller.address)).to.equal(price);
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("900"));
  });

  it("沒有授權 NFT 就不能上架", async function () {
    await item.connect(seller).mintItem(seller.address, "ipfs://x");
    await expect(
      market.connect(seller).list(itemAddr, 0, ethers.parseEther("10"))
    ).to.be.revertedWith("Marketplace: NFT not approved for marketplace");
  });

  it("賣家不能購買自己的商品", async function () {
    const price = ethers.parseEther("50");
    await item.connect(seller).mintItem(seller.address, "ipfs://y");
    await item.connect(seller).approve(marketAddr, 0);
    await market.connect(seller).list(itemAddr, 0, price);

    await token.connect(seller).claim();
    await token.connect(seller).approve(marketAddr, price);
    await expect(market.connect(seller).buy(0)).to.be.revertedWith(
      "Marketplace: seller cannot buy own item"
    );
  });

  it("getActiveListings 只回傳仍在販售的商品", async function () {
    await item.connect(seller).mintItem(seller.address, "ipfs://a");
    await item.connect(seller).mintItem(seller.address, "ipfs://b");
    await item.connect(seller).setApprovalForAll(marketAddr, true);
    await market.connect(seller).list(itemAddr, 0, ethers.parseEther("10"));
    await market.connect(seller).list(itemAddr, 1, ethers.parseEther("20"));

    await market.connect(seller).cancel(0);
    const active = await market.getActiveListings();
    expect(active.length).to.equal(1);
    expect(active[0].tokenId).to.equal(1n);
  });
});
