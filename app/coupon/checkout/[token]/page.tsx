"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type CheckoutPackage = {
  id: number;
  coins: number;
  subject: string;
  originalAmount: string;
  finalAmount: string;
  discountAmount: string;
};

type CheckoutPayload = {
  session: {
    token: string;
    expiresAt: string;
  };
  coupon: {
    id: string;
    code: string;
    title: string;
    description: string;
    discountType: "amount" | "percent";
    discountValue: number;
    minAmount: number;
    expiresAt: string;
  };
  packages: CheckoutPackage[];
};

export default function CouponCheckoutPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [message, setMessage] = useState("正在加载优惠券...");
  const [submitting, setSubmitting] = useState(false);
  const paymentStartedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadCheckout();
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const closeSession = () => {
      if (paymentStartedRef.current) {
        return;
      }
      navigator.sendBeacon(`/api/coupons/checkout/${token}/close`);
    };

    window.addEventListener("pagehide", closeSession);
    return () => {
      window.removeEventListener("pagehide", closeSession);
    };
  }, [token]);

  async function loadCheckout() {
    try {
      const response = await fetch(`/api/coupons/checkout/${token}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as CheckoutPayload | { message?: string } | null;

      if (!response.ok || !data || !("packages" in data)) {
        setMessage(readMessage(data) || "优惠券使用链接已失效。");
        return;
      }

      setPayload(data);
      setSelectedPackageId(data.packages[0]?.id ?? null);
      setMessage("");
    } catch {
      setMessage("优惠券使用链接加载失败。");
    }
  }

  async function startPayment(payMethod: "wechat" | "alipay") {
    if (!selectedPackageId) {
      setMessage("请选择可使用优惠券的商品。");
      return;
    }

    setSubmitting(true);
    setMessage("正在生成支付链接...");

    try {
      const response = await fetch(`/api/coupons/checkout/${token}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: selectedPackageId,
          payMethod,
        }),
      });
      const data = (await response.json().catch(() => null)) as { payUrl?: string; message?: string } | null;

      if (!response.ok || !data?.payUrl) {
        setMessage(data?.message ?? "创建支付链接失败。");
        setSubmitting(false);
        return;
      }

      setMessage("正在跳转支付页面...");
      paymentStartedRef.current = true;
      window.location.replace(data.payUrl);
    } catch {
      setMessage("创建支付链接失败。");
      setSubmitting(false);
    }
  }

  const selectedPackage = payload?.packages.find((item) => item.id === selectedPackageId) ?? null;

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={eyebrowStyle}>COUPON CHECKOUT</div>
        <h1 style={titleStyle}>优惠券专用支付</h1>
        <p style={textStyle}>该页面为一次性链接。完成一次下单后链接会立即失效，不能重复购买或转发给其他用户使用。</p>

        {message ? <div style={messageStyle}>{message}</div> : null}

        {payload ? (
          <>
            <article style={couponStyle}>
              <div>
                <div style={couponTitleStyle}>{payload.coupon.title}</div>
                <div style={couponMetaStyle}>
                  券码 {payload.coupon.code} · 有效期至 {formatDate(payload.coupon.expiresAt)}
                </div>
                {payload.coupon.description ? <p style={couponDescriptionStyle}>{payload.coupon.description}</p> : null}
              </div>
              <div style={discountStyle}>{renderDiscount(payload.coupon)}</div>
            </article>

            <div style={packageGridStyle}>
              {payload.packages.length === 0 ? (
                <div style={emptyStyle}>暂无符合该优惠券条件的商品。</div>
              ) : (
                payload.packages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPackageId(item.id)}
                    style={packageButtonStyle(selectedPackageId === item.id)}
                  >
                    <span style={packageNameStyle}>{item.subject}</span>
                    <span style={packageMetaStyle}>{item.coins.toLocaleString()} 云币</span>
                    <span style={priceRowStyle}>
                      <del style={oldPriceStyle}>¥{item.originalAmount}</del>
                      <strong style={newPriceStyle}>¥{item.finalAmount}</strong>
                    </span>
                    <span style={saveStyle}>已优惠 ¥{item.discountAmount}</span>
                  </button>
                ))
              )}
            </div>

            <div style={checkoutBarStyle}>
              <div>
                <div style={checkoutLabelStyle}>应付金额</div>
                <div style={checkoutAmountStyle}>{selectedPackage ? `¥${selectedPackage.finalAmount}` : "-"}</div>
              </div>
              <div style={payButtonsStyle}>
                <button type="button" disabled={submitting || !selectedPackage} onClick={() => void startPayment("wechat")} style={payButtonStyle("#16a34a")}>
                  微信支付
                </button>
                <button type="button" disabled={submitting || !selectedPackage} onClick={() => void startPayment("alipay")} style={payButtonStyle("#2563eb")}>
                  支付宝
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function renderDiscount(coupon: CheckoutPayload["coupon"]) {
  return coupon.discountType === "percent" ? `${coupon.discountValue}% OFF` : `¥${coupon.discountValue}`;
}

function readMessage(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const message = (value as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #08080d, #171021)",
  color: "#fff",
  padding: "32px 16px",
  display: "grid",
  placeItems: "center",
};

const panelStyle: CSSProperties = {
  width: "100%",
  maxWidth: "840px",
  borderRadius: "22px",
  background: "rgba(17,17,26,0.92)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
  padding: "28px",
  display: "grid",
  gap: "18px",
};

const eyebrowStyle: CSSProperties = {
  color: "#c4b5fd",
  fontSize: "12px",
  fontWeight: 800,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
};

const textStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.7,
};

const messageStyle: CSSProperties = {
  padding: "13px 15px",
  borderRadius: "14px",
  background: "rgba(59,130,246,0.14)",
  border: "1px solid rgba(96,165,250,0.24)",
  color: "#dbeafe",
};

const couponStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
  padding: "18px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(234,179,8,0.12))",
  border: "1px solid rgba(255,255,255,0.1)",
};

const couponTitleStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 800,
};

const couponMetaStyle: CSSProperties = {
  marginTop: "8px",
  color: "#cbd5e1",
  fontSize: "13px",
};

const couponDescriptionStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#e5e7eb",
  lineHeight: 1.6,
};

const discountStyle: CSSProperties = {
  fontSize: "28px",
  fontWeight: 900,
  color: "#facc15",
};

const packageGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const packageButtonStyle = (active: boolean): CSSProperties => ({
  border: active ? "1px solid rgba(250,204,21,0.55)" : "1px solid rgba(255,255,255,0.1)",
  background: active ? "rgba(250,204,21,0.12)" : "rgba(255,255,255,0.05)",
  color: "#fff",
  borderRadius: "16px",
  padding: "16px",
  cursor: "pointer",
  display: "grid",
  gap: "8px",
  textAlign: "left",
});

const packageNameStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 800,
};

const packageMetaStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: "13px",
};

const priceRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "10px",
};

const oldPriceStyle: CSSProperties = {
  color: "#94a3b8",
};

const newPriceStyle: CSSProperties = {
  color: "#facc15",
  fontSize: "22px",
};

const saveStyle: CSSProperties = {
  color: "#86efac",
  fontSize: "13px",
};

const emptyStyle: CSSProperties = {
  padding: "20px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.05)",
  color: "#cbd5e1",
};

const checkoutBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  paddingTop: "8px",
};

const checkoutLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: "13px",
};

const checkoutAmountStyle: CSSProperties = {
  color: "#facc15",
  fontSize: "32px",
  fontWeight: 900,
};

const payButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const payButtonStyle = (background: string): CSSProperties => ({
  border: "none",
  background,
  color: "#fff",
  borderRadius: "14px",
  minWidth: "120px",
  minHeight: "44px",
  padding: "0 18px",
  fontWeight: 800,
  cursor: "pointer",
});
