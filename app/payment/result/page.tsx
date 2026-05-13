"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<ResultCard status="success" countdown={3} onClose={() => undefined} />}>
      <PaymentResultContent />
    </Suspense>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);
  const status = searchParams.get("status") === "cancel" ? "cancel" : "success";

  useEffect(() => {
    if (countdown <= 0) {
      window.close();
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  return <ResultCard status={status} countdown={countdown} onClose={() => window.close()} />;
}

function ResultCard({ status, countdown, onClose }: { status: "success" | "cancel"; countdown: number; onClose: () => void }) {
  const copy = useMemo(() => {
    if (status === "cancel") {
      return {
        title: "支付已取消",
        description: "本次支付未完成，优惠券不会被使用。",
        accent: "#fbbf24",
        icon: "!",
      };
    }

    return {
      title: "支付成功",
      description: "支付已完成，窗口将在倒计时结束后自动关闭。",
      accent: "#86efac",
      icon: "OK",
    };
  }, [status]);

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ ...iconStyle, color: copy.accent, borderColor: copy.accent }}>{copy.icon}</div>
        <h1 style={titleStyle}>{copy.title}</h1>
        <p style={descriptionStyle}>{copy.description}</p>
        <div style={countdownStyle}>{countdown} 秒后自动关闭</div>
        <button type="button" onClick={onClose} style={buttonStyle}>
          立即关闭
        </button>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "radial-gradient(circle at top, rgba(124,58,237,0.22), transparent 38%), #07070a",
  color: "#fff",
  fontFamily: "Microsoft YaHei, Noto Sans SC, sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: "min(420px, 100%)",
  display: "grid",
  justifyItems: "center",
  gap: "14px",
  padding: "30px 24px",
  borderRadius: "18px",
  background: "rgba(16,16,24,0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
  textAlign: "center",
};

const iconStyle: React.CSSProperties = {
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  border: "2px solid",
  fontSize: "22px",
  fontWeight: 900,
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "28px",
};

const descriptionStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.7,
};

const countdownStyle: React.CSSProperties = {
  marginTop: "8px",
  color: "#c4b5fd",
  fontWeight: 900,
};

const buttonStyle: React.CSSProperties = {
  marginTop: "8px",
  minHeight: "42px",
  border: "none",
  borderRadius: "13px",
  padding: "0 18px",
  background: "linear-gradient(90deg, #7c3aed, #a855f7)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
