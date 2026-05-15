"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode() {
    setSendingCode(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/quicksdk/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          purpose: "reset-password",
        }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        setMessage(payload?.error || "验证码发送失败。");
        return;
      }

      setMessage("验证码已发送，请查看手机短信。");
    } catch {
      setMessage("当前无法发送验证码。");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("新密码至少需要 8 位。");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("两次输入的新密码不一致。");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/quicksdk/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          code,
          newPassword: password,
        }),
      });
      const payload = await readJsonResponse<{ error?: string; success?: boolean }>(response);

      if (!response.ok || !payload?.success) {
        setMessage(payload?.error || "找回密码失败。");
        return;
      }

      setMessage("密码已重置，请使用新密码登录。");
      setTimeout(() => {
        router.replace("/login");
      }, 900);
    } catch {
      setMessage("当前无法连接找回密码服务。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <form onSubmit={handleSubmit} className="glow-purple" style={formStyle}>
        <h1 style={titleStyle}>找回密码</h1>

        <div style={featureCardStyle}>
          <div style={featureEyebrowStyle}>短信验证</div>
          <strong style={featureTitleStyle}>使用绑定手机号重置密码</strong>
          <span style={featureTextStyle}>
            输入账号绑定的手机号，获取验证码后即可设置新的登录密码。
          </span>
        </div>

        <input
          type="tel"
          placeholder="手机号"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          style={inputStyle}
          autoComplete="tel"
        />

        <div style={codeRowStyle}>
          <input
            type="text"
            placeholder="验证码"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            style={{ ...inputStyle, marginBottom: 0 }}
          />
          <button type="button" onClick={handleSendCode} disabled={sendingCode} style={secondaryButtonStyle}>
            {sendingCode ? "发送中..." : "发送验证码"}
          </button>
        </div>

        <input
          type="password"
          placeholder="新密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={inputStyle}
          autoComplete="new-password"
        />

        <input
          type="password"
          placeholder="确认新密码"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          style={inputStyle}
          autoComplete="new-password"
        />

        <button type="submit" disabled={submitting} className="glow-purple-strong" style={buttonStyle}>
          {submitting ? "提交中..." : "重置密码"}
        </button>

        <div style={footerTextStyle}>
          想起密码了？{" "}
          <Link href="/login" style={footerLinkStyle}>
            返回登录
          </Link>
        </div>

        {message ? <p style={message.includes("已") || message.includes("请") ? infoStyle : errorStyle}>{message}</p> : null}
      </form>
    </main>
  );
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  margin: "-40px",
  width: "calc(100% + 80px)",
  overflow: "hidden",
  backgroundColor: "#07070a",
};

const formStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: "460px",
  padding: "32px",
  borderRadius: "22px",
  background: "rgba(16,16,24,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(14px)",
  display: "grid",
  gap: "12px",
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "2px",
  fontSize: "32px",
  color: "white",
  textAlign: "center",
};

const featureCardStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, rgba(168,85,247,0.16), rgba(59,130,246,0.08))",
  border: "1px solid rgba(192,132,252,0.16)",
  display: "grid",
  gap: "5px",
};

const featureEyebrowStyle: React.CSSProperties = {
  color: "#d8b4fe",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const featureTitleStyle: React.CSSProperties = {
  color: "white",
  fontSize: "15px",
};

const featureTextStyle: React.CSSProperties = {
  color: "#c7c7d1",
  fontSize: "13px",
  lineHeight: 1.55,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
  boxSizing: "border-box",
};

const codeRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: "999px",
  padding: "14px 18px",
  background: "linear-gradient(90deg, #7c3aed, #a855f7)",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: "15px",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(192,132,252,0.35)",
  borderRadius: "14px",
  padding: "0 14px",
  background: "rgba(124,58,237,0.14)",
  color: "#f5d0fe",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const footerTextStyle: React.CSSProperties = {
  color: "#a1a1aa",
  textAlign: "center",
  fontSize: "14px",
};

const footerLinkStyle: React.CSSProperties = {
  color: "#c084fc",
  textDecoration: "none",
  fontWeight: 800,
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "#fca5a5",
  textAlign: "center",
  fontSize: "14px",
};

const infoStyle: React.CSSProperties = {
  margin: 0,
  color: "#86efac",
  textAlign: "center",
  fontSize: "14px",
};
