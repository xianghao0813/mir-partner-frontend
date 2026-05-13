export type CloudCoinPackage = {
  id: number;
  coins: number;
  amount: string;
  subject: string;
  desc: string;
  goodsId: string;
};

export const CLOUD_COIN_PACKAGES: CloudCoinPackage[] = [
  { id: 1, coins: 100, amount: "100.00", subject: "100云币", desc: "购买100云币", goodsId: "cloud-coins-100" },
  { id: 2, coins: 300, amount: "300.00", subject: "300云币", desc: "购买300云币", goodsId: "cloud-coins-300" },
  { id: 3, coins: 500, amount: "500.00", subject: "500云币", desc: "购买500云币", goodsId: "cloud-coins-500" },
  { id: 4, coins: 1000, amount: "1000.00", subject: "1000云币", desc: "购买1000云币", goodsId: "cloud-coins-1000" },
  { id: 5, coins: 5000, amount: "5000.00", subject: "5000云币", desc: "购买5000云币", goodsId: "cloud-coins-5000" },
  { id: 6, coins: 10000, amount: "10000.00", subject: "10000云币", desc: "购买10000云币", goodsId: "cloud-coins-10000" },
  { id: 7, coins: 20000, amount: "20000.00", subject: "20000云币", desc: "购买20000云币", goodsId: "cloud-coins-20000" },
  { id: 8, coins: 30000, amount: "30000.00", subject: "30000云币", desc: "购买30000云币", goodsId: "cloud-coins-30000" },
];

export const CLOUD_COIN_PACKAGE_MAP = new Map(
  CLOUD_COIN_PACKAGES.map((item) => [item.id, item])
);

export function getCloudCoinPackage(packageId: number) {
  return CLOUD_COIN_PACKAGE_MAP.get(packageId) ?? null;
}
