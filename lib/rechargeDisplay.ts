export function getRechargeDisplayName(productName: string | undefined) {
  const value = typeof productName === "string" ? productName.trim() : "";

  if (value.includes("暮光双龙官网H5")) {
    return "官网云币充值";
  }

  if (value.includes("MirM_iOS")) {
    return "暮光双龙充值（苹果）";
  }

  if (value.includes("暮光双龙PC")) {
    return "暮光双龙充值（PC）";
  }

  return "暮光双龙充值（安卓）";
}
