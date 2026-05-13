"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StatusResponse = {
  paymentPasswordSet?: boolean;
  maskedPhone?: string;
  phoneBound?: boolean;
  message?: string;
};

export default function PaymentPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [account, setAccount] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [paymentPasswordSet, setPaymentPasswordSet] = useState(false);
  const [code, setCode] = useState("");
  const [paypass, setPaypass] = useState("");
  const [confirmPaypass, setConfirmPaypass] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const username =
        readMetadataString(user.user_metadata?.quicksdk_username) ||
        readMetadataString(user.user_metadata?.username) ||
        user.email ||
        "";

      setAccount(username);

      const response = await fetch("/api/account/security/payment-password", {
        cache: "no-store",
      });
      const result = await readJsonResponse<StatusResponse>(response);

      if (!response.ok) {
        setError(result?.message ?? "无法读取支付密码状态，请稍后再试。");
      } else {
        setPaymentPasswordSet(Boolean(result?.paymentPasswordSet));
        setMaskedPhone(result?.maskedPhone ?? "");
        if (!result?.phoneBound) {
          setError("请先绑定手机号后再设置支付密码。");
        }
      }

      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function handleSendCode() {
    setMessage("");
    setError("");
    setSendingCode(true);

    const response = await fetch("/api/account/security/payment-password/send-code", {
      method: "POST",
    });
    const result = await readJsonResponse<StatusResponse & { success?: boolean }>(response);

    setSendingCode(false);

    if (!response.ok || !result?.success) {
      setError(result?.message ?? "验证码发送失败，请稍后再试。");
      return;
    }

    setMaskedPhone(result.maskedPhone ?? maskedPhone);
    setCountdown(60);
    setMessage("验证码已发送，请查看绑定手机号。");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!code.trim()) {
      setError("请输入短信验证码。");
      return;
    }

    if (!/^\d{6}$/.test(paypass)) {
      setError("支付密码必须是 6 位数字。");
      return;
    }

    if (paypass !== confirmPaypass) {
      setError("两次输入的支付密码不一致。");
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/account/security/payment-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        paypass,
        confirmPaypass,
      }),
    });

    const result = await readJsonResponse<{ success?: boolean; message?: string }>(response);
    setSubmitting(false);

    if (!response.ok || !result?.success) {
      setError(result?.message ?? "支付密码设置失败，请稍后再试。");
      return;
    }

    setCode("");
    setPaypass("");
    setConfirmPaypass("");
    setPaymentPasswordSet(true);
    setMessage(paymentPasswordSet ? "支付密码已修改。" : "支付密码已设置。");
  }

  const title = paymentPasswordSet ? "修改支付密码" : "设置支付密码";

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>安全设置</div>
            <h1 style={titleStyle}>{title}</h1>
            <p style={descriptionStyle}>用于游戏内使用云币时验证，不会用于官网登录。</p>
          </div>
          <Link href="/profile" style={backLinkStyle}>
            返回合伙人信息
          </Link>
        </div>

        {loading ? (
          <div style={stateTextStyle}>加载中...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: "28px" }}>
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>当前账号</label>
              <div style={readonlyValueStyle}>{account}</div>
            </div>

            <div style={fieldBlockStyle}>
              <label style={labelStyle}>绑定手机</label>
              <div style={phoneRowStyle}>
                <div style={readonlyValueStyle}>{maskedPhone || "未绑定"}</div>
                <button
                  type="button"
                  disabled={sendingCode || countdown > 0 || !maskedPhone}
                  onClick={handleSendCode}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: sendingCode || countdown > 0 || !maskedPhone ? 0.6 : 1,
                    cursor: sendingCode || countdown > 0 || !maskedPhone ? "not-allowed" : "pointer",
                  }}
                >
                  {sendingCode ? "发送中..." : countdown > 0 ? `${countdown}s` : "获取验证码"}
                </button>
              </div>
            </div>

            <div style={fieldBlockStyle}>
              <label htmlFor="payment-code" style={labelStyle}>
                短信验证码
              </label>
              <input
                id="payment-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="请输入短信验证码"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                style={inputStyle}
              />
            </div>

            <div style={fieldBlockStyle}>
              <label htmlFor="payment-password" style={labelStyle}>
                {paymentPasswordSet ? "新支付密码" : "支付密码"}
              </label>
              <input
                id="payment-password"
                type="password"
                value={paypass}
                onChange={(event) => setPaypass(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="请输入 6 位数字支付密码"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                style={inputStyle}
              />
            </div>

            <div style={fieldBlockStyle}>
              <label htmlFor="confirm-payment-password" style={labelStyle}>
                确认支付密码
              </label>
              <input
                id="confirm-payment-password"
                type="password"
                value={confirmPaypass}
                onChange={(event) => setConfirmPaypass(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="请再次输入支付密码"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                style={inputStyle}
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={successStyle}>{message}</p>}

            <button type="submit" disabled={submitting || !maskedPhone} style={submitButtonStyle}>
              {submitting ? "保存中..." : paymentPasswordSet ? "保存新支付密码" : "设置支付密码"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function readMetadataString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readJsonResponse<T>(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 81px)",
  background:
    "radial-gradient(circle at top, rgba(124,58,237,0.12) 0%, rgba(10,10,14,1) 32%, rgba(6,6,10,1) 100%)",
  margin: "-40px",
  width: "calc(100% + 80px)",
  color: "white",
  padding: "50px 16px",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "640px",
  margin: "0 auto",
  background: "rgba(16,16,24,0.82)",
  border: "1px solid rgba(124,58,237,0.18)",
  borderRadius: "24px",
  padding: "32px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
  backdropFilter: "blur(14px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#c084fc",
  fontSize: "14px",
  marginBottom: "8px",
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
};

const descriptionStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#b7a9d8",
  lineHeight: 1.6,
};

const backLinkStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  textDecoration: "none",
  color: "white",
  padding: "10px 16px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontWeight: 700,
};

const stateTextStyle: React.CSSProperties = {
  marginTop: "28px",
  color: "#a1a1aa",
  fontSize: "15px",
};

const fieldBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  marginBottom: "18px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#ddd6fe",
};

const readonlyValueStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#e5e7eb",
  overflowWrap: "anywhere",
};

const phoneRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
  alignItems: "stretch",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.28)",
  color: "white",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "15px",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "0 16px",
  borderRadius: "14px",
  border: "1px solid rgba(192,132,252,0.28)",
  background: "rgba(124,58,237,0.18)",
  color: "white",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const submitButtonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "none",
  background: "linear-gradient(90deg, #7c3aed, #a855f7)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px",
};

const errorStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#fca5a5",
  fontSize: "14px",
};

const successStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#86efac",
  fontSize: "14px",
};
