export type CloudCoinPackage = {
  id: number;
  coins: number;
  amount: string;
  subject: string;
  desc: string;
  goodsId: string;
};

export const CLOUD_COIN_PACKAGES: CloudCoinPackage[] = [
  { id: 1, coins: 1, amount: "1.00", subject: "1\u4e91\u5e01", desc: "\u8d2d\u4e701\u4e91\u5e01", goodsId: "cloud-coins-100" },
  { id: 2, coins: 300, amount: "300.00", subject: "300\u4e91\u5e01", desc: "\u8d2d\u4e70300\u4e91\u5e01", goodsId: "cloud-coins-300" },
  { id: 3, coins: 500, amount: "500.00", subject: "500\u4e91\u5e01", desc: "\u8d2d\u4e70500\u4e91\u5e01", goodsId: "cloud-coins-500" },
  { id: 4, coins: 1000, amount: "1000.00", subject: "1000\u4e91\u5e01", desc: "\u8d2d\u4e701000\u4e91\u5e01", goodsId: "cloud-coins-1000" },
  { id: 5, coins: 5000, amount: "5000.00", subject: "5000\u4e91\u5e01", desc: "\u8d2d\u4e705000\u4e91\u5e01", goodsId: "cloud-coins-5000" },
  { id: 6, coins: 10000, amount: "10000.00", subject: "10000\u4e91\u5e01", desc: "\u8d2d\u4e7010000\u4e91\u5e01", goodsId: "cloud-coins-10000" },
  { id: 7, coins: 20000, amount: "20000.00", subject: "20000\u4e91\u5e01", desc: "\u8d2d\u4e7020000\u4e91\u5e01", goodsId: "cloud-coins-20000" },
  { id: 8, coins: 30000, amount: "30000.00", subject: "30000\u4e91\u5e01", desc: "\u8d2d\u4e7030000\u4e91\u5e01", goodsId: "cloud-coins-30000" },
];

export const CLOUD_COIN_PACKAGE_MAP = new Map(
  CLOUD_COIN_PACKAGES.map((item) => [item.id, item])
);

export function getCloudCoinPackage(packageId: number) {
  return CLOUD_COIN_PACKAGE_MAP.get(packageId) ?? null;
}
