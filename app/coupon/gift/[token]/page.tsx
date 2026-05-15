"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";

type GiftPayload = {
  coupon: {
    title: string;
    description: string;
    discountType: "amount" | "percent";
    discountValue: number;
    minAmount: number;
    expiresAt: string;
  };
  transfer: {
    expiresAt: string;
  };
};

export default function CouponGiftPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [payload, setPayload] = useState<GiftPayload | null>(null);
  const [message, setMessage] = useState("正在读取赠送链接...");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    void loadGift();
  }, [token]);

  async function loadGift() {
    try {
      const response = await fetch(`/api/coupons/gift/${token}`, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as GiftPayload & { message?: string } | null;

      if (!response.ok || !data?.coupon) {
        setMessage(data?.message || "赠送链接无效或已过期。");
        return;
      }

      setPayload(data);
      setMessage("");
    } catch {
      setMessage("赠送链接读取失败。");
    }
  }

  async function claimGift() {
    setClaiming(true);
    setMessage("");

    try {
      const response = await fetch(`/api/coupons/gift/${token}`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        if (response.status === 401) {
          setMessage("请先登录后领取优惠券。");
          router.push(`/login?redirect=/coupon/gift/${token}`);
          return;
        }
        setMessage(data?.message || "领取失败。");
        return;
      }

      setMessage(data?.message || "优惠券已领取到你的钱包。");
      window.setTimeout(() => router.push("/profile/wallet"), 1200);
    } catch {
      setMessage("领取失败。");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" style={fixedBackgroundStyle} />
      <div className="auth-overlay" style={fixedOverlayStyle} />
      <section style={cardStyle}>
        <div style={eyebrowStyle}>COUPON GIFT</div>
        <h1 style={titleStyle}>领取优惠券</h1>

        {payload ? (
          <article style={couponStyle}>
            <div style={couponTitleStyle}>{payload.coupon.title}</div>
            <div style={couponMetaStyle}>
              {renderDiscount(payload.coupon)} · 满 ¥{payload.coupon.minAmount.toLocaleString()} 可用
            </div>
            <div style={couponMetaStyle}>优惠券有效期至 {formatDate(payload.coupon.expiresAt)}</div>
            <div style={couponMetaStyle}>赠送链接有效期至 {formatDate(payload.transfer.expiresAt)}</div>
            {payload.coupon.description ? <p style={couponDescriptionStyle}>{payload.coupon.description}</p> : null}
            <button type="button" onClick={() => void claimGift()} disabled={claiming} style={primaryButtonStyle}>
              {claiming ? "领取中..." : "领取到我的钱包"}
            </button>
          </article>
        ) : null}

        {message ? <div style={messageStyle}>{message}</div> : null}
      </section>
    </main>
  );
}

function renderDiscount(coupon: GiftPayload["coupon"]) {
  return coupon.discountType === "percent" ? `${coupon.discountValue}% 折扣` : `立减 ¥${coupon.discountValue}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const pageStyle: CSSProperties = { minHeight: "100vh", color: "#fff", position: "relative", overflow: "hidden", padding: "120px 20px 64px" };
const fixedBackgroundStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 0 };
const fixedOverlayStyle: CSSProperties = { position: "fixed", inset: 0, zIndex: 1 };
const cardStyle: CSSProperties = { position: "relative", zIndex: 2, width: "min(680px, 100%)", margin: "0 auto", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(7,7,10,0.78)", borderRadius: "24px", padding: "30px", boxShadow: "0 24px 80px rgba(0,0,0,0.38)" };
const eyebrowStyle: CSSProperties = { color: "#facc15", fontSize: "12px", fontWeight: 900, letterSpacing: "0.12em" };
const titleStyle: CSSProperties = { margin: "10px 0 22px", fontSize: "34px", lineHeight: 1.1 };
const couponStyle: CSSProperties = { display: "grid", gap: "10px", padding: "20px", borderRadius: "18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(250,204,21,0.18)" };
const couponTitleStyle: CSSProperties = { fontSize: "22px", fontWeight: 900 };
const couponMetaStyle: CSSProperties = { color: "#cbd5e1", fontSize: "14px", lineHeight: 1.6 };
const couponDescriptionStyle: CSSProperties = { margin: 0, color: "#9ca3af", fontSize: "14px", lineHeight: 1.7 };
const primaryButtonStyle: CSSProperties = { marginTop: "10px", border: "none", background: "linear-gradient(135deg,#facc15,#f97316)", color: "#111827", borderRadius: "999px", padding: "13px 18px", cursor: "pointer", fontWeight: 900 };
const messageStyle: CSSProperties = { marginTop: "16px", color: "#fde68a", fontSize: "14px", lineHeight: 1.7 };
