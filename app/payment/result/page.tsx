"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<ResultCard status="success" countdown={3} syncing={false} onClose={() => undefined} />}>
      <PaymentResultContent />
    </Suspense>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") === "cancel" ? "cancel" : "success";
  const cpOrderNo = searchParams.get("order")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const [countdown, setCountdown] = useState(3);
  const [syncing, setSyncing] = useState(status === "success");

  useEffect(() => {
    setCountdown(3);
    setSyncing(status === "success");
  }, [status]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    void reconcilePayment(cpOrderNo, token, controller.signal)
      .then(() =>
        fetch("/api/account/sync-quicksdk?force=1&wallet=1", {
          method: "POST",
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        })
      )
      .catch(() => null)
      .finally(() => {
        window.clearTimeout(timeoutId);
        setSyncing(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [cpOrderNo, status, token]);

  useEffect(() => {
    if (syncing) {
      return;
    }

    if (countdown <= 0) {
      window.close();
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, syncing]);

  return (
    <ResultCard
      status={status}
      countdown={countdown}
      syncing={syncing}
      onClose={() => {
        if (!syncing) {
          window.close();
        }
      }}
    />
  );
}

async function reconcilePayment(cpOrderNo: string, token: string, signal: AbortSignal) {
  if (!cpOrderNo) {
    return;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch("/api/payment/quicksdk/reconcile", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpOrderNo, token }),
      signal,
    });

    if (response.ok) {
      return;
    }

    if (response.status !== 202) {
      throw new Error("reconcile_failed");
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1800));
  }
}

function ResultCard({
  status,
  countdown,
  syncing,
  onClose,
}: {
  status: "success" | "cancel";
  countdown: number;
  syncing: boolean;
  onClose: () => void;
}) {
  const copy = useMemo(() => {
    if (status === "cancel") {
      return {
        title: "\u652f\u4ed8\u5df2\u53d6\u6d88",
        description: "\u672c\u6b21\u652f\u4ed8\u672a\u5b8c\u6210\uff0c\u4f18\u60e0\u5238\u4e0d\u4f1a\u88ab\u4f7f\u7528\u3002",
        accent: "#fbbf24",
        icon: "!",
      };
    }

    return {
      title: "\u652f\u4ed8\u6210\u529f",
      description: syncing
        ? "\u652f\u4ed8\u5df2\u5b8c\u6210\uff0c\u6b63\u5728\u540c\u6b65\u4e91\u5e01\u5230\u8d26\u3002"
        : "\u4e91\u5e01\u540c\u6b65\u5df2\u5904\u7406\uff0c\u7a97\u53e3\u5c06\u5728\u5012\u8ba1\u65f6\u7ed3\u675f\u540e\u81ea\u52a8\u5173\u95ed\u3002",
      accent: "#86efac",
      icon: "OK",
    };
  }, [status, syncing]);

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={{ ...iconStyle, color: copy.accent, borderColor: copy.accent }}>{copy.icon}</div>
        <h1 style={titleStyle}>{copy.title}</h1>
        <p style={descriptionStyle}>{copy.description}</p>
        <div style={countdownStyle}>
          {syncing ? "\u6b63\u5728\u540c\u6b65\u4e91\u5e01\u5230\u8d26..." : `${countdown} \u79d2\u540e\u81ea\u52a8\u5173\u95ed`}
        </div>
        <button type="button" onClick={onClose} disabled={syncing} style={{ ...buttonStyle, opacity: syncing ? 0.6 : 1 }}>
          {syncing ? "同步中，请稍候" : "立即关闭"}
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
