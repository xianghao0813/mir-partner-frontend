"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type CoinTier = {
  id: number;
  coins: number;
  priceLabel: string;
  image: string;
};

type PayMethod = "wechat" | "alipay";
type CouponTab = "unused" | "expired" | "used";

type WalletTransaction = {
  id: string;
  type: "recharge" | "consume";
  amount: number;
  coins: number;
  desc: string;
  date: string;
  payMethod?: "wechat" | "alipay" | "";
  status?: "pending" | "success" | "failed";
};

type WalletSummary = {
  account: string;
  nickname: string;
  uid: string;
  partnerCode: string;
  status: string;
  cloudCoins: number;
  transactions: WalletTransaction[];
};

type CouponItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: "amount" | "percent";
  discountValue: number;
  minAmount: number;
  applicablePackageIds: number[];
  startsAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedOrderNo: string | null;
  giftTransfer: {
    id: string;
    status: "pending";
    giftUrl: string;
    expiresAt: string;
  } | null;
  giftClaimed: boolean;
  status: CouponTab;
};

type CouponGroups = {
  unused: CouponItem[];
  expired: CouponItem[];
  used: CouponItem[];
};

const coinTiers: CoinTier[] = [
  { id: 1, coins: 100, priceLabel: "¥100", image: "/cloud-coins/tier-1.png" },
  { id: 2, coins: 300, priceLabel: "¥300", image: "/cloud-coins/tier-2.png" },
  { id: 3, coins: 500, priceLabel: "¥500", image: "/cloud-coins/tier-3.png" },
  { id: 4, coins: 1000, priceLabel: "¥1,000", image: "/cloud-coins/tier-4.png" },
  { id: 5, coins: 5000, priceLabel: "¥5,000", image: "/cloud-coins/tier-5.png" },
  { id: 6, coins: 10000, priceLabel: "¥10,000", image: "/cloud-coins/tier-6.png" },
  { id: 7, coins: 20000, priceLabel: "¥20,000", image: "/cloud-coins/tier-7.png" },
  { id: 8, coins: 30000, priceLabel: "¥30,000", image: "/cloud-coins/tier-8.png" },
];

const emptyCouponGroups: CouponGroups = {
  unused: [],
  expired: [],
  used: [],
};

export default function WalletPage() {
  const rechargeRef = useRef<HTMLDivElement | null>(null);
  const messageClearTimerRef = useRef<number | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponTab, setCouponTab] = useState<CouponTab>("unused");
  const [coupons, setCoupons] = useState<CouponGroups>(emptyCouponGroups);
  const [historyMonth, setHistoryMonth] = useState(getCurrentMonth());
  const [submittingTierId, setSubmittingTierId] = useState<number | null>(null);
  const [submittingCouponId, setSubmittingCouponId] = useState<string | null>(null);
  const [giftingCouponId, setGiftingCouponId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadWallet();
    void loadCoupons();
    return () => {
      if (messageClearTimerRef.current) {
        window.clearTimeout(messageClearTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const paymentState = new URLSearchParams(window.location.search).get("payment");
    if (paymentState === "success") {
      setMessage("支付已完成，请等待服务器到账通知。");
      void loadWallet();
      void loadCoupons();
    } else if (paymentState === "cancel") {
      setMessage("你已取消本次支付。");
      void loadCoupons();
    }
  }, []);

  const accountInfo = useMemo(
    () => [
      { label: "账号", value: wallet?.nickname ?? "MIR Partner 玩家" },
      { label: "UID", value: wallet?.uid ?? extractAccountUid(wallet?.account ?? "") },
      { label: "状态", value: wallet?.status ?? "正常" },
    ],
    [wallet]
  );

  const visibleTransactions = useMemo(() => {
    const transactions = wallet?.transactions ?? [];
    return historyMonth ? transactions.filter((item) => item.date.startsWith(historyMonth)) : transactions;
  }, [historyMonth, wallet]);

  const historyRechargeTotal = useMemo(
    () => sumTransactions(visibleTransactions, "recharge"),
    [visibleTransactions]
  );
  const historyConsumeTotal = useMemo(
    () => Math.abs(sumTransactions(visibleTransactions, "consume")),
    [visibleTransactions]
  );

  async function loadWallet() {
    try {
      const response = await fetch("/api/payment/quicksdk/wallet", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as WalletSummary | { message?: string } | null;

      if (!response.ok || !isWalletSummary(payload)) {
        setMessage(payload && "message" in payload ? payload.message ?? "钱包数据加载失败。" : "钱包数据加载失败。");
        return;
      }

      setWallet(payload);
    } catch {
      setMessage("钱包数据加载失败。");
    }
  }

  async function loadCoupons() {
    try {
      const response = await fetch("/api/coupons", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as Partial<CouponGroups> & { message?: string } | null;

      if (!response.ok || !payload) {
        return;
      }

      setCoupons({
        unused: Array.isArray(payload.unused) ? payload.unused : [],
        expired: Array.isArray(payload.expired) ? payload.expired : [],
        used: Array.isArray(payload.used) ? payload.used : [],
      });

      if (payload.message) {
        setMessage(payload.message);
      }
    } catch {
      // Coupon tables may not be initialized yet; wallet should still work.
    }
  }

  function moveToRecharge() {
    rechargeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showTemporaryMessage(text: string, durationMs = 5000) {
    if (messageClearTimerRef.current) {
      window.clearTimeout(messageClearTimerRef.current);
    }

    setMessage(text);
    messageClearTimerRef.current = window.setTimeout(() => {
      setMessage((current) => (current === text ? "" : current));
      messageClearTimerRef.current = null;
    }, durationMs);
  }

  function watchPopupClose(popup: Window, messageText: string) {
    const intervalId = window.setInterval(() => {
      if (!popup.closed) {
        return;
      }

      window.clearInterval(intervalId);
      setMessage((current) => (current === messageText ? "" : current));
      void loadWallet();
      void loadCoupons();
    }, 1000);

    window.setTimeout(() => window.clearInterval(intervalId), 10 * 60 * 1000);
  }

  function schedulePaymentExpiry(popup: Window, messageText: string, onExpire: () => Promise<void>) {
    window.setTimeout(() => {
      void (async () => {
        await onExpire();

        if (!popup.closed) {
          popup.close();
        }

        setMessage((current) => (current === messageText ? "支付窗口已超过 1 分钟有效期，订单已取消。" : current));
        void loadWallet();
        void loadCoupons();
      })();
    }, 60 * 1000);
  }

  async function startPayment(payMethod: PayMethod, tierArg?: CoinTier) {
    const tier = tierArg ?? null;
    if (!tier) {
      setMessage("请先选择充值档位。");
      moveToRecharge();
      return;
    }

    const popup = window.open("", "quicksdk-payment", buildPopupFeatures());
    if (!popup) {
      setMessage("浏览器拦截了支付弹窗，请允许弹窗后重试。");
      return;
    }

    popup.document.write("<title>正在打开支付页面...</title><body style='margin:0;background:#07070a;color:#fff;font-family:Microsoft YaHei,sans-serif;display:grid;place-items:center;height:100vh;'>正在打开支付页面...</body>");
    setSubmittingTierId(tier.id);
    setMessage("正在生成支付链接...");

    try {
      const response = await fetch("/api/payment/quicksdk/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: tier.id, payMethod }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string; payUrl?: string; cpOrderNo?: string } | null;

      if (!response.ok || !payload?.payUrl) {
        popup.close();
        setMessage(payload?.message || "创建支付链接失败。");
        return;
      }

      showTemporaryMessage("支付弹窗已打开。");
      watchPopupClose(popup, "支付弹窗已打开。");
      if (payload.cpOrderNo) {
        schedulePaymentExpiry(popup, "支付弹窗已打开。", async () => {
          await fetch("/api/payment/quicksdk/order/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cpOrderNo: payload.cpOrderNo }),
          }).catch(() => null);
        });
      }
      popup.location.replace(payload.payUrl);
    } catch {
      popup.close();
      setMessage("创建支付链接失败。");
    } finally {
      setSubmittingTierId(null);
    }
  }

  async function useCoupon(coupon: CouponItem) {
    if (coupon.giftTransfer) {
      setMessage("该优惠券正在赠送中，请先撤回后再使用。");
      return;
    }

    const popup = window.open("", `coupon-checkout-${coupon.id}-${Date.now()}`, buildPopupFeatures());
    if (!popup) {
      setMessage("浏览器拦截了优惠券使用窗口，请允许弹窗后重试。");
      return;
    }

    popup.document.write("<title>正在打开优惠券...</title><body style='margin:0;background:#07070a;color:#fff;font-family:Microsoft YaHei,sans-serif;display:grid;place-items:center;height:100vh;'>正在打开优惠券专用支付页...</body>");
    setSubmittingCouponId(coupon.id);
    setMessage("正在生成一次性优惠券链接...");

    try {
      const response = await fetch(`/api/coupons/${coupon.id}/checkout-session`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; message?: string } | null;

      if (!response.ok || !payload?.checkoutUrl) {
        popup.close();
        setMessage(payload?.message || "优惠券链接生成失败。");
        return;
      }

      popup.location.replace(payload.checkoutUrl);
      showTemporaryMessage("优惠券专用支付窗口已打开。");
      watchPopupClose(popup, "优惠券专用支付窗口已打开。");
      schedulePaymentExpiry(popup, "优惠券专用支付窗口已打开。", async () => {
        const closeUrl = payload.checkoutUrl?.replace("/coupon/checkout/", "/api/coupons/checkout/");
        if (closeUrl) {
          await fetch(`${closeUrl}/close`, { method: "POST" }).catch(() => null);
        }
      });
      void loadCoupons();
    } catch {
      popup.close();
      setMessage("优惠券链接生成失败。");
    } finally {
      setSubmittingCouponId(null);
    }
  }

  async function giftCoupon(coupon: CouponItem) {
    setGiftingCouponId(coupon.id);
    setMessage("正在生成赠送链接...");

    try {
      const response = await fetch(`/api/coupons/${coupon.id}/gift`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { giftUrl?: string; message?: string; expiresAt?: string } | null;

      if (!response.ok || !payload?.giftUrl) {
        setMessage(payload?.message || "赠送链接生成失败。");
        return;
      }

      await copyGiftLink(payload.giftUrl);
      setMessage("赠送链接已生成并复制，24 小时内有效。");
      void loadCoupons();
    } catch {
      setMessage("赠送链接生成失败。");
    } finally {
      setGiftingCouponId(null);
    }
  }

  async function cancelGiftCoupon(coupon: CouponItem) {
    setGiftingCouponId(coupon.id);
    setMessage("正在撤回赠送链接...");

    try {
      const response = await fetch(`/api/coupons/${coupon.id}/gift`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setMessage(payload?.message || "撤回失败。");
        return;
      }

      setMessage("已撤回赠送链接，优惠券恢复可用。");
      void loadCoupons();
    } catch {
      setMessage("撤回失败。");
    } finally {
      setGiftingCouponId(null);
    }
  }

  async function copyGiftLink(giftUrl: string) {
    const fullUrl = giftUrl.startsWith("http") ? giftUrl : `${window.location.origin}${giftUrl}`;
    await navigator.clipboard.writeText(fullUrl);
  }

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" style={fixedBackgroundStyle} />
      <div className="auth-overlay" style={fixedOverlayStyle} />

      <div style={shellStyle}>
        <section style={heroCardStyle}>
          <div style={heroHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>WALLET</div>
              <h1 style={titleStyle}>我的钱包</h1>
              <p style={subtitleStyle}>查看账号状态、云币余额、充值记录与优惠券。充值会跳转到 QuickSDK 外部支付页面继续完成。</p>
            </div>

            <div style={balanceBadgeStyle}>
              <div style={balanceLabelStyle}>当前持有</div>
              <div style={balanceValueStyle}>{(wallet?.cloudCoins ?? 0).toLocaleString()} 云币</div>
              <button type="button" onClick={() => setHistoryOpen(true)} style={balanceDetailButtonStyle}>
                使用明细
              </button>
            </div>
          </div>

          {message ? <div style={messageStyle}>{message}</div> : null}

          <div style={infoGridStyle}>
            {accountInfo.map((item) => (
              <article key={item.label} style={infoCardStyle}>
                <div style={infoLabelStyle}>{item.label}</div>
                <div style={infoValueStyle}>{item.value}</div>
              </article>
            ))}
          </div>

          <div style={heroActionRowStyle}>
            <button type="button" onClick={() => { setCouponOpen(true); void loadCoupons(); }} style={couponButtonStyle}>
              优惠券
            </button>
            <button type="button" onClick={moveToRecharge} style={primaryButtonStyle}>
              充值
            </button>
          </div>
        </section>

        <section ref={rechargeRef} style={rechargeCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>CHARGE</div>
              <h2 style={sectionTitleStyle}>云币充值</h2>
              <p style={sectionTextStyle}>点击卡片即可直接前往充值。优惠券请先从“优惠券”弹窗进入专用支付页使用。</p>
            </div>

          </div>

          <div style={tierGridStyle}>
            {coinTiers.map((tier) => {
              return (
                <button key={tier.id} type="button" onClick={() => void startPayment("wechat", tier)} style={tierCardButtonStyle}>
                  <article style={tierCardStyle(false)}>
                    <div style={tierImageWrapStyle}>
                      <img src={tier.image} alt={`${tier.coins} 云币`} style={tierImageStyle} />
                    </div>
                    <div style={tierCoinsStyle}>{tier.coins.toLocaleString()} 云币</div>
                    <div style={tierPriceCenterStyle}>{tier.priceLabel}</div>
                    {submittingTierId === tier.id ? <div style={tierLoadingStyle}>跳转中...</div> : null}
                  </article>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {historyOpen ? (
        <Modal title="使用明细" onClose={() => setHistoryOpen(false)}>
          <div style={historyToolbarStyle}>
            <input type="month" value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)} style={historyMonthInputStyle} aria-label="选择月份" />
            <button type="button" onClick={() => setHistoryMonth("")} style={historyFilterButtonStyle}>全部</button>
            <div style={historySummaryStyle}>充值 +{historyRechargeTotal.toLocaleString()} / 使用 {historyConsumeTotal.toLocaleString()}</div>
          </div>

          <div style={historyListStyle}>
            {visibleTransactions.length === 0 ? (
              <div style={emptyHistoryStyle}>暂无云币使用明细。</div>
            ) : (
              visibleTransactions.map((item) => (
                <article key={item.id} style={historyItemStyle}>
                  <div>
                    <div style={historyDescStyle}>{item.desc}</div>
                    <div style={historyMetaStyle}>
                      {item.date}
                      {item.payMethod ? ` · ${item.payMethod === "wechat" ? "微信" : "支付宝"}` : ""}
                      {item.status ? ` · ${renderStatus(item.status)}` : ""}
                    </div>
                  </div>
                  <div style={historyValueStyle(item.coins >= 0)}>
                    {item.coins >= 0 ? "+" : ""}
                    {item.coins}
                  </div>
                </article>
              ))
            )}
          </div>
        </Modal>
      ) : null}

      {couponOpen ? (
        <Modal title="我的优惠券" onClose={() => setCouponOpen(false)}>
          <div style={couponTabRowStyle}>
            {(["unused", "expired", "used"] as CouponTab[]).map((tab) => (
              <button key={tab} type="button" onClick={() => setCouponTab(tab)} style={couponTabStyle(couponTab === tab)}>
                {renderCouponTab(tab)} ({coupons[tab].length})
              </button>
            ))}
          </div>

          <div style={couponListStyle}>
            {coupons[couponTab].length === 0 ? (
              <div style={emptyHistoryStyle}>暂无{renderCouponTab(couponTab)}优惠券。</div>
            ) : (
              coupons[couponTab].map((coupon) => (
                <article key={coupon.id} style={couponCardStyle}>
                  <div>
                    <div style={couponTitleStyle}>{coupon.title}</div>
                    <div style={couponCodeStyle}>券码 {coupon.code}</div>
                    <div style={couponMetaStyle}>
                      {renderCouponDiscount(coupon)} · 满 ¥{coupon.minAmount.toLocaleString()} 可用 · 有效期至 {formatDate(coupon.expiresAt)}
                    </div>
                    {coupon.description ? <p style={couponDescriptionStyle}>{coupon.description}</p> : null}
                    {coupon.usedOrderNo ? <div style={couponMetaStyle}>订单号 {coupon.usedOrderNo}</div> : null}
                  </div>

                  {coupon.status === "unused" ? (
                    <div style={couponActionGroupStyle}>
                      {coupon.giftTransfer ? (
                        <>
                          <div style={couponStatusBadgeStyle}>赠送中</div>
                          <button type="button" onClick={() => void copyGiftLink(coupon.giftTransfer!.giftUrl).then(() => setMessage("赠送链接已复制。"))} style={secondarySmallButtonStyle}>
                            复制链接
                          </button>
                          <button type="button" onClick={() => void cancelGiftCoupon(coupon)} disabled={giftingCouponId === coupon.id} style={dangerSmallButtonStyle}>
                            {giftingCouponId === coupon.id ? "撤回中..." : "撤回"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => void useCoupon(coupon)} disabled={submittingCouponId === coupon.id} style={primaryButtonStyle}>
                            {submittingCouponId === coupon.id ? "生成中..." : "立即使用"}
                          </button>
                          <button type="button" onClick={() => void giftCoupon(coupon)} disabled={giftingCouponId === coupon.id || coupon.giftClaimed} style={secondarySmallButtonStyle}>
                            {giftingCouponId === coupon.id ? "生成中..." : coupon.giftClaimed ? "已赠送" : "赠送"}
                          </button>
                        </>
                      )}
                    </div>
                  ) : coupon.giftClaimed ? (
                    <div style={couponStatusBadgeStyle}>已赠送</div>
                  ) : (
                    <div style={couponStatusBadgeStyle}>{renderCouponTab(coupon.status)}</div>
                  )}
                </article>
              ))
            )}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h3 style={modalTitleStyle}>{title}</h3>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>关闭</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function renderStatus(status: WalletTransaction["status"]) {
  switch (status) {
    case "success":
      return "成功";
    case "failed":
      return "失败";
    case "pending":
      return "处理中";
    default:
      return "未知";
  }
}

function renderCouponTab(tab: CouponTab) {
  if (tab === "unused") {
    return "未使用";
  }
  if (tab === "expired") {
    return "已过期";
  }
  return "已使用";
}

function renderCouponDiscount(coupon: CouponItem) {
  return coupon.discountType === "percent" ? `${coupon.discountValue}% 折扣` : `立减 ¥${coupon.discountValue}`;
}

function isWalletSummary(value: unknown): value is WalletSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.account === "string" &&
    typeof candidate.nickname === "string" &&
    typeof candidate.uid === "string" &&
    typeof candidate.partnerCode === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.cloudCoins === "number" &&
    Array.isArray(candidate.transactions)
  );
}

function extractAccountUid(account: string) {
  const localPart = account.split("@")[0] ?? account;
  return localPart.replace(/\D/g, "") || localPart.trim() || "-";
}

function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function sumTransactions(items: WalletTransaction[], type: WalletTransaction["type"]) {
  return items.filter((item) => item.type === type).reduce((total, item) => total + item.coins, 0);
}

function buildPopupFeatures() {
  const width = 560;
  const height = 760;
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2));
  const top = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2));
  return `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

const pageStyle: CSSProperties = {
  height: "calc(100vh - 81px)",
  position: "relative",
  margin: "-40px",
  width: "calc(100% + 80px)",
  overflowX: "hidden",
  overflowY: "auto",
  backgroundColor: "#07070a",
  boxSizing: "border-box",
  padding: "72px 24px 120px",
};

const fixedBackgroundStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
};

const fixedOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
};

const shellStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1120px",
  margin: "0 auto",
  display: "grid",
  gap: "20px",
};

const baseCardStyle: CSSProperties = {
  borderRadius: "24px",
  background: "rgba(16,16,24,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(14px)",
  padding: "28px",
};

const heroCardStyle: CSSProperties = { ...baseCardStyle, display: "grid", gap: "22px" };
const rechargeCardStyle: CSSProperties = { ...baseCardStyle, display: "grid", gap: "22px" };

const eyebrowStyle: CSSProperties = {
  color: "#c4b5fd",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const titleStyle: CSSProperties = { margin: 0, fontSize: "32px", color: "#fff" };
const subtitleStyle: CSSProperties = { marginTop: "8px", marginBottom: 0, color: "#b8b8c5", fontSize: "14px", lineHeight: 1.6 };
const heroHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" };

const balanceBadgeStyle: CSSProperties = {
  minWidth: "240px",
  padding: "18px 20px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(59,130,246,0.16))",
  border: "1px solid rgba(196,181,253,0.25)",
};

const balanceLabelStyle: CSSProperties = { color: "#cbd5e1", fontSize: "13px" };
const balanceValueStyle: CSSProperties = { marginTop: "8px", fontSize: "30px", fontWeight: 700, color: "#fff" };
const balanceDetailButtonStyle: CSSProperties = {
  marginTop: "14px",
  width: "100%",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};
const infoGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" };
const infoCardStyle: CSSProperties = { padding: "18px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: "8px" };
const infoLabelStyle: CSSProperties = { color: "#9ca3af", fontSize: "13px" };
const infoValueStyle: CSSProperties = { fontSize: "20px", fontWeight: 700, color: "#fff", wordBreak: "break-word" };
const heroActionRowStyle: CSSProperties = { display: "flex", gap: "12px", flexWrap: "wrap" };

const primaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(139,92,246,0.4)",
  background: "linear-gradient(135deg, rgba(139,92,246,0.85), rgba(79,70,229,0.85))",
  color: "#fff",
  borderRadius: "999px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const couponButtonStyle: CSSProperties = {
  border: "1px solid rgba(250,204,21,0.5)",
  background: "linear-gradient(135deg, rgba(250,204,21,0.95), rgba(245,158,11,0.92))",
  color: "#111827",
  borderRadius: "999px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(245,158,11,0.2)",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  borderRadius: "999px",
  padding: "12px 18px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: "16px",
  background: "rgba(59,130,246,0.16)",
  border: "1px solid rgba(96,165,250,0.24)",
  color: "#dbeafe",
  fontSize: "14px",
};

const sectionHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "28px", color: "#fff" };
const sectionTextStyle: CSSProperties = { marginTop: "8px", marginBottom: 0, color: "#b8b8c5", fontSize: "14px", lineHeight: 1.6 };
const tierGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" };
const tierCardButtonStyle: CSSProperties = { appearance: "none", border: "none", background: "transparent", padding: 0, margin: 0, textAlign: "left", cursor: "pointer" };
const tierCardStyle = (active: boolean): CSSProperties => ({ borderRadius: "18px", padding: "18px", background: active ? "rgba(139,92,246,0.16)" : "rgba(255,255,255,0.04)", border: active ? "1px solid rgba(196,181,253,0.42)" : "1px solid rgba(255,255,255,0.06)", display: "grid", gap: "12px" });
const tierImageWrapStyle: CSSProperties = { height: "146px", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0 2px" };
const tierImageStyle: CSSProperties = { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.35))" };
const tierCoinsStyle: CSSProperties = { color: "#fff", fontSize: "28px", fontWeight: 700, textAlign: "center" };
const tierPriceCenterStyle: CSSProperties = { color: "#f8fafc", fontWeight: 800, fontSize: "20px", textAlign: "center" };
const tierLoadingStyle: CSSProperties = { marginTop: "4px", color: "#c4b5fd", fontSize: "13px", fontWeight: 700, textAlign: "center" };

const overlayStyle: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "grid", placeItems: "center", padding: "24px", zIndex: 20 };
const modalStyle: CSSProperties = { width: "100%", maxWidth: "800px", maxHeight: "82vh", overflowY: "auto", borderRadius: "24px", background: "#11111a", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", padding: "24px" };
const modalHeaderStyle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" };
const modalTitleStyle: CSSProperties = { margin: 0, fontSize: "22px", color: "#fff" };
const historyToolbarStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "16px" };
const historyMonthInputStyle: CSSProperties = { height: "42px", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "12px", background: "rgba(255,255,255,0.06)", color: "#fff", padding: "0 12px", fontSize: "14px", outline: "none" };
const historyFilterButtonStyle: CSSProperties = { border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)", color: "#fff", borderRadius: "12px", height: "42px", padding: "0 14px", fontSize: "14px", fontWeight: 700, cursor: "pointer" };
const historySummaryStyle: CSSProperties = { color: "#cbd5e1", fontSize: "14px", marginLeft: "auto" };
const historyListStyle: CSSProperties = { display: "grid", gap: "12px" };
const emptyHistoryStyle: CSSProperties = { padding: "22px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#9ca3af", textAlign: "center" };
const historyItemStyle: CSSProperties = { padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px" };
const historyDescStyle: CSSProperties = { color: "#fff", fontWeight: 700 };
const historyMetaStyle: CSSProperties = { marginTop: "6px", color: "#9ca3af", fontSize: "13px" };
const historyValueStyle = (positive: boolean): CSSProperties => ({ color: positive ? "#86efac" : "#fca5a5", fontWeight: 700, fontSize: "22px", whiteSpace: "nowrap" });

const couponTabRowStyle: CSSProperties = { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" };
const couponTabStyle = (active: boolean): CSSProperties => ({ border: active ? "1px solid rgba(250,204,21,0.42)" : "1px solid rgba(255,255,255,0.12)", background: active ? "rgba(250,204,21,0.12)" : "rgba(255,255,255,0.05)", color: "#fff", borderRadius: "999px", padding: "10px 14px", cursor: "pointer", fontWeight: 800 });
const couponListStyle: CSSProperties = { display: "grid", gap: "12px" };
const couponCardStyle: CSSProperties = { padding: "18px", borderRadius: "18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" };
const couponTitleStyle: CSSProperties = { color: "#fff", fontSize: "18px", fontWeight: 900 };
const couponCodeStyle: CSSProperties = { marginTop: "6px", color: "#facc15", fontSize: "13px", fontWeight: 800 };
const couponMetaStyle: CSSProperties = { marginTop: "8px", color: "#cbd5e1", fontSize: "13px", lineHeight: 1.6 };
const couponDescriptionStyle: CSSProperties = { margin: "8px 0 0", color: "#9ca3af", fontSize: "13px", lineHeight: 1.6 };
const couponStatusBadgeStyle: CSSProperties = { padding: "10px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: "13px", fontWeight: 800 };
const couponActionGroupStyle: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" };
const secondarySmallButtonStyle: CSSProperties = { border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)", color: "#fff", borderRadius: "999px", padding: "10px 14px", cursor: "pointer", fontWeight: 800 };
const dangerSmallButtonStyle: CSSProperties = { border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.12)", color: "#fecaca", borderRadius: "999px", padding: "10px 14px", cursor: "pointer", fontWeight: 800 };
