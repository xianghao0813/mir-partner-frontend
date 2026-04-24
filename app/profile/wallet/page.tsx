"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type CoinTier = {
  id: number;
  coins: number;
  priceLabel: string;
  label: string;
  bonus: string;
  image: string;
};

type PayMethod = "wechat" | "alipay";

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
  status: string;
  cloudCoins: number;
  transactions: WalletTransaction[];
};

const coinTiers: CoinTier[] = [
  { id: 1, coins: 100, priceLabel: "¥100", label: "入门", bonus: "", image: "/cloud-coins/tier-1.png" },
  { id: 2, coins: 300, priceLabel: "¥300", label: "推荐", bonus: "+20 云币", image: "/cloud-coins/tier-2.png" },
  { id: 3, coins: 500, priceLabel: "¥500", label: "热卖", bonus: "+50 云币", image: "/cloud-coins/tier-3.png" },
  { id: 4, coins: 1000, priceLabel: "¥1,000", label: "BEST", bonus: "+120 云币", image: "/cloud-coins/tier-4.png" },
  { id: 5, coins: 5000, priceLabel: "¥5,000", label: "超值", bonus: "+800 云币", image: "/cloud-coins/tier-5.png" },
  { id: 6, coins: 10000, priceLabel: "¥10,000", label: "豪华", bonus: "+1800 云币", image: "/cloud-coins/tier-6.png" },
  { id: 7, coins: 20000, priceLabel: "¥20,000", label: "尊享", bonus: "+4200 云币", image: "/cloud-coins/tier-7.png" },
  { id: 8, coins: 30000, priceLabel: "¥30,000", label: "至尊", bonus: "+7000 云币", image: "/cloud-coins/tier-8.png" },
];

export default function WalletPage() {
  const rechargeRef = useRef<HTMLDivElement | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [selectedTier, setSelectedTier] = useState<CoinTier | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submittingTierId, setSubmittingTierId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadWallet();
  }, []);

  useEffect(() => {
    const paymentState = new URLSearchParams(window.location.search).get("payment");
    if (paymentState === "success") {
      setMessage("支付已完成，请等待服务器到账通知。");
      void loadWallet();
    } else if (paymentState === "cancel") {
      setMessage("你已取消本次支付。");
    }
  }, []);

  const accountInfo = useMemo(
    () => [
      { label: "账号", value: wallet?.account ?? "当前登录账号" },
      { label: "昵称", value: wallet?.nickname ?? "MIR Partner 玩家" },
      { label: "状态", value: wallet?.status ?? "正常" },
    ],
    [wallet]
  );

  async function loadWallet() {
    try {
      const response = await fetch("/api/payment/quicksdk/wallet", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as WalletSummary | { message?: string } | null;

      if (!response.ok || !isWalletSummary(payload)) {
        setMessage(
          payload && typeof payload === "object" && "message" in payload
            ? payload.message ?? "钱包数据加载失败。"
            : "钱包数据加载失败。"
        );
        return;
      }

      setWallet(payload);
    } catch {
      setMessage("钱包数据加载失败。");
    }
  }

  function moveToRecharge() {
    rechargeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function startPayment(payMethod: PayMethod, tierArg?: CoinTier) {
    const tier = tierArg ?? selectedTier;
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
    setSelectedTier(tier);
    setMessage("正在生成支付链接...");

    try {
      const response = await fetch("/api/payment/quicksdk/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: tier.id,
          payMethod,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            payUrl?: string;
          }
        | null;

      if (!response.ok || !payload?.payUrl) {
        popup.close();
        setMessage(payload?.message || "创建支付链接失败。");
        return;
      }

      setMessage("支付弹窗已打开。");
      popup.location.replace(payload.payUrl);
    } catch {
      popup.close();
      setMessage("创建支付链接失败。");
    } finally {
      setSubmittingTierId(null);
    }
  }

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <div style={shellStyle}>
        <section style={heroCardStyle}>
          <div style={heroHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>MIR Partner</div>
              <h1 style={titleStyle}>钱包</h1>
              <p style={subtitleStyle}>
                查看账户状态、云币余额与充值记录。充值将跳转到 QuickSDK 外部支付页面继续完成。
              </p>
            </div>

            <div style={balanceBadgeStyle}>
              <div style={balanceLabelStyle}>当前持有</div>
              <div style={balanceValueStyle}>{(wallet?.cloudCoins ?? 0).toLocaleString()} 云币</div>
            </div>
          </div>

          <div style={infoGridStyle}>
            {accountInfo.map((item) => (
              <article key={item.label} style={infoCardStyle}>
                <div style={infoLabelStyle}>{item.label}</div>
                <div style={infoValueStyle}>{item.value}</div>
              </article>
            ))}
          </div>

          <div style={heroActionRowStyle}>
            <button type="button" onClick={() => setHistoryOpen(true)} style={secondaryButtonStyle}>
              使用明细
            </button>
            <button type="button" onClick={moveToRecharge} style={primaryButtonStyle}>
              充值
            </button>
          </div>

          {message ? <div style={messageStyle}>{message}</div> : null}
        </section>

        <section ref={rechargeRef} style={rechargeCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>QuickSDK</div>
              <h2 style={sectionTitleStyle}>云币充值</h2>
              <p style={sectionTextStyle}>点击整张卡片即可直接前往充值，不再显示单独的支付方式区域。</p>
            </div>

            <div style={selectedBadgeStyle}>{selectedTier ? `${selectedTier.coins.toLocaleString()} 云币 / ${selectedTier.priceLabel}` : "点击卡片立即充值"}</div>
          </div>

          <div style={tierGridStyle}>
            {coinTiers.map((tier) => {
              const active = selectedTier?.id === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => void startPayment("wechat", tier)}
                  style={tierCardButtonStyle}
                  className="wallet-tier-button"
                >
                <article style={tierCardStyle(active)} className="wallet-tier-card">
                  <div className="wallet-tier-glow" />
                  <div style={tierTopStyle}>
                    <div style={tierTagStyle(active)}>{tier.label}</div>
                  </div>

                  <div style={tierImageWrapStyle}>
                    <img src={tier.image} alt={`${tier.coins} 云币`} style={tierImageStyle} />
                  </div>

                  <div style={tierCoinsStyle}>{tier.coins.toLocaleString()} 云币</div>
                  <div style={tierPriceCenterStyle}>{tier.priceLabel}</div>
                  <div style={tierBonusStyle}>{tier.bonus || "标准档位"}</div>

                  {submittingTierId === tier.id ? <div style={tierLoadingStyle}>跳转中...</div> : null}
                </article>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {historyOpen ? (
        <div style={overlayStyle} onClick={() => setHistoryOpen(false)}>
          <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>使用明细</h3>
              <button type="button" onClick={() => setHistoryOpen(false)} style={secondaryButtonStyle}>
                关闭
              </button>
            </div>

            <div style={historyListStyle}>
              {(wallet?.transactions ?? []).map((item) => (
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
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
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

function isWalletSummary(value: unknown): value is WalletSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.account === "string" &&
    typeof candidate.nickname === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.cloudCoins === "number" &&
    Array.isArray(candidate.transactions)
  );
}

function buildPopupFeatures() {
  const width = 520;
  const height = 760;
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2));
  const top = Math.max(0, window.screenY + Math.round((window.outerHeight - height) / 2));
  return `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
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

const heroCardStyle: CSSProperties = {
  ...baseCardStyle,
  display: "grid",
  gap: "22px",
};

const rechargeCardStyle: CSSProperties = {
  ...baseCardStyle,
  display: "grid",
  gap: "22px",
};

const eyebrowStyle: CSSProperties = {
  color: "#c4b5fd",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "32px",
  color: "#fff",
};

const subtitleStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#b8b8c5",
  fontSize: "14px",
  lineHeight: 1.6,
};

const heroHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const balanceBadgeStyle: CSSProperties = {
  minWidth: "240px",
  padding: "18px 20px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(59,130,246,0.16))",
  border: "1px solid rgba(196,181,253,0.25)",
};

const balanceLabelStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: "13px",
};

const balanceValueStyle: CSSProperties = {
  marginTop: "8px",
  fontSize: "30px",
  fontWeight: 700,
  color: "#fff",
};

const infoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const infoCardStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: "8px",
};

const infoLabelStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
};

const infoValueStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#fff",
  wordBreak: "break-word",
};

const heroActionRowStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

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

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  color: "#fff",
};

const sectionTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#b8b8c5",
  fontSize: "14px",
  lineHeight: 1.6,
};

const selectedBadgeStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  fontSize: "14px",
  fontWeight: 700,
};

const tierGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const tierCardButtonStyle: CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  textAlign: "left",
  cursor: "pointer",
};

const tierCardStyle = (active: boolean): CSSProperties => ({
  borderRadius: "18px",
  padding: "18px",
  background: active ? "rgba(139,92,246,0.16)" : "rgba(255,255,255,0.04)",
  border: active ? "1px solid rgba(196,181,253,0.42)" : "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: "12px",
});

const tierTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const tierTagStyle = (active: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "28px",
  padding: "0 10px",
  borderRadius: "999px",
  background: active ? "rgba(167,139,250,0.22)" : "rgba(255,255,255,0.08)",
  color: active ? "#f5d0fe" : "#e5e7eb",
  fontSize: "12px",
  fontWeight: 700,
});

const tierPriceStyle: CSSProperties = {
  color: "#f8fafc",
  fontWeight: 700,
};

const tierCoinsStyle: CSSProperties = {
  color: "#fff",
  fontSize: "28px",
  fontWeight: 700,
  textAlign: "center",
};

const tierImageWrapStyle: CSSProperties = {
  height: "146px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 0 2px",
};

const tierImageStyle: CSSProperties = {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  filter: "drop-shadow(0 14px 28px rgba(0,0,0,0.35))",
};

const tierPriceCenterStyle: CSSProperties = {
  color: "#f8fafc",
  fontWeight: 700,
  fontSize: "16px",
  textAlign: "center",
};

const tierBonusStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  minHeight: "18px",
  textAlign: "center",
};

const tierActionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const tierLoadingStyle: CSSProperties = {
  marginTop: "4px",
  color: "#c4b5fd",
  fontSize: "13px",
  fontWeight: 700,
  textAlign: "center",
};

const tierSelectButtonStyle = (active: boolean): CSSProperties => ({
  border: "1px solid rgba(255,255,255,0.12)",
  background: active ? "rgba(255,255,255,0.12)" : "transparent",
  color: "#fff",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  flex: "1 1 110px",
});

const tierPayButtonStyle = (color: string): CSSProperties => ({
  border: "none",
  background: color,
  color: "#fff",
  borderRadius: "12px",
  padding: "10px 12px",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  flex: "1 1 110px",
});

const checkoutPanelStyle: CSSProperties = {
  borderRadius: "18px",
  padding: "20px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: "14px",
};

const checkoutTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  color: "#fff",
};

const checkoutHintStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: 1.6,
};

const checkoutButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const payMethodButtonStyle = (color: string): CSSProperties => ({
  border: "none",
  background: color,
  color: "#fff",
  borderRadius: "14px",
  padding: "14px 20px",
  minWidth: "180px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
});

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.72)",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  zIndex: 20,
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: "760px",
  maxHeight: "80vh",
  overflowY: "auto",
  borderRadius: "24px",
  background: "#11111a",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  padding: "24px",
};

const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "22px",
  color: "#fff",
};

const historyListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const historyItemStyle: CSSProperties = {
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
};

const historyDescStyle: CSSProperties = {
  color: "#fff",
  fontWeight: 700,
};

const historyMetaStyle: CSSProperties = {
  marginTop: "6px",
  color: "#9ca3af",
  fontSize: "13px",
};

const historyValueStyle = (positive: boolean): CSSProperties => ({
  color: positive ? "#86efac" : "#fca5a5",
  fontWeight: 700,
  fontSize: "22px",
  whiteSpace: "nowrap",
});
