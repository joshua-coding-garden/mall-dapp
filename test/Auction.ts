import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// 推進區塊鏈時間（讓拍賣結束）
async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("Auction - 英式競價拍賣", function () {
  let token: any, item: any, auction: any;
  let seller: any, bidderA: any, bidderB: any;
  let itemAddr: string, auctionAddr: string;

  beforeEach(async function () {
    [seller, bidderA, bidderB] = await ethers.getSigners();

    token = await ethers.deployContract("MallToken");
    item = await ethers.deployContract("MallItem");
    auction = await ethers.deployContract("Auction", [await token.getAddress()]);
    itemAddr = await item.getAddress();
    auctionAddr = await auction.getAddress();

    // 賣家鑄造一個 NFT 並授權拍賣合約
    await item.connect(seller).mintItem(seller.address, "ipfs://art-0");
    await item.connect(seller).approve(auctionAddr, 0);

    // 兩位競標者各領 MTK 並授權拍賣合約
    for (const b of [bidderA, bidderB]) {
      await token.connect(b).claim(); // 1000 MTK
      await token.connect(b).approve(auctionAddr, ethers.parseEther("1000"));
    }
  });

  it("賣家可以建立拍賣，NFT 被託管進合約", async function () {
    await expect(
      auction.connect(seller).createAuction(itemAddr, 0, ethers.parseEther("50"), 120)
    ).to.emit(auction, "AuctionCreated");
    expect(await item.ownerOf(0)).to.equal(auctionAddr); // NFT 在合約託管中
  });

  it("出價必須高於目前最高價，賣家不能出價", async function () {
    await auction.connect(seller).createAuction(itemAddr, 0, ethers.parseEther("50"), 120);
    // 低於起標價
    await expect(
      auction.connect(bidderA).bid(0, ethers.parseEther("40"))
    ).to.be.revertedWith("Auction: bid not high enough");
    // 賣家不能出價
    await expect(
      auction.connect(seller).bid(0, ethers.parseEther("60"))
    ).to.be.revertedWith("Auction: seller cannot bid");
  });

  it("被超越的出價者，MTK 自動退回", async function () {
    await auction.connect(seller).createAuction(itemAddr, 0, ethers.parseEther("50"), 120);

    await auction.connect(bidderA).bid(0, ethers.parseEther("60"));
    expect(await token.balanceOf(bidderA.address)).to.equal(ethers.parseEther("940")); // 1000-60

    // B 出更高價 → A 被退回
    await auction.connect(bidderB).bid(0, ethers.parseEther("80"));
    expect(await token.balanceOf(bidderA.address)).to.equal(ethers.parseEther("1000")); // 退回
    expect(await token.balanceOf(bidderB.address)).to.equal(ethers.parseEther("920")); // 1000-80
  });

  it("時間未到不能結算", async function () {
    await auction.connect(seller).createAuction(itemAddr, 0, ethers.parseEther("50"), 120);
    await auction.connect(bidderA).bid(0, ethers.parseEther("60"));
    await expect(auction.endAuction(0)).to.be.revertedWith("Auction: not ended yet");
  });

  it("完整流程：兩人競價 → 時間到 → 價高者得 NFT、賣家收 MTK", async function () {
    await auction.connect(seller).createAuction(itemAddr, 0, ethers.parseEther("50"), 120);

    await auction.connect(bidderA).bid(0, ethers.parseEther("60"));
    await auction.connect(bidderB).bid(0, ethers.parseEther("80")); // B 最高

    await increaseTime(130); // 時間到
    await expect(auction.endAuction(0)).to.emit(auction, "AuctionEnded");

    expect(await item.ownerOf(0)).to.equal(bidderB.address); // B 得標
    expect(await token.balanceOf(seller.address)).to.equal(ethers.parseEther("1000080")); // 初始100萬 + 80
    expect(await token.balanceOf(bidderA.address)).to.equal(ethers.parseEther("1000")); // A 全額退回
    expect(await token.balanceOf(bidderB.address)).to.equal(ethers.parseEther("920")); // B 付了 80
  });

  it("無人出價：結算後 NFT 退還賣家", async function () {
    await auction.connect(seller).createAuction(itemAddr, 0, ethers.parseEther("50"), 120);
    await increaseTime(130);
    await auction.endAuction(0);
    expect(await item.ownerOf(0)).to.equal(seller.address);
  });
});
