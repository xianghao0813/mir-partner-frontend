"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
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
          purpose: "register",
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error || "验证码发送失败。");
        return;
      }

      setMessage("验证码已发送。完成注册后，新账号会立即绑定一个 SDK UID。");
    } catch {
      setMessage("当前无法发送验证码。");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/quicksdk/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          phone,
          code,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        profileUrl?: string;
      };

      if (!response.ok) {
        setMessage(payload.error || "注册失败。");
        return;
      }

      router.push(payload.profileUrl || "/profile");
      router.refresh();
    } catch {
      setMessage("当前无法完成注册。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <form onSubmit={handleSignup} className="glow-purple" style={formStyle}>
        <h1 style={titleStyle}>创建账号</h1>

        <p style={subtitleStyle}>
          如果你还没有 SDK 账号，可以在这里注册。注册完成后，新账号会立即绑定一个新的 SDK UID，并且可以直接用于游戏 SDK 登录。
        </p>

        <div style={featureCardStyle}>
          <div style={featureEyebrowStyle}>绑定流程</div>
          <strong style={featureTitleStyle}>网页注册 + SDK UID 绑定</strong>
          <span style={featureTextStyle}>
            你在这里创建的账号，会成为后续 SDK 登录使用的同一账号身份。
          </span>
        </div>

        <input
          type="text"
          placeholder="账号"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          autoComplete="username"
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="new-password"
        />

        <input
          type="tel"
          placeholder="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
          autoComplete="tel"
        />

        <div style={codeRowStyle}>
          <input
            type="text"
            placeholder="验证码"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ ...inputStyle, marginBottom: 0 }}
          />
          <button
            type="button"
            onClick={handleSendCode}
            disabled={sendingCode}
            style={secondaryButtonStyle}
          >
            {sendingCode ? "发送中..." : "发送验证码"}
          </button>
        </div>

        <button type="submit" disabled={submitting} className="glow-purple-strong" style={buttonStyle}>
          {submitting ? "注册中..." : "创建账号"}
        </button>

        <div style={footerTextStyle}>
          已有 SDK 账号？{" "}
          <Link href="/login" style={footerLinkStyle}>
            去登录
          </Link>
        </div>

        {message ? (
          <p style={message.startsWith("验证码已发送") ? infoStyle : errorStyle}>
            {message}
          </p>
        ) : null}
      </form>
    </main>
  );
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
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "10px",
  fontSize: "32px",
  color: "white",
  textAlign: "center",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "16px",
  textAlign: "center",
  color: "#b8b8c5",
  fontSize: "14px",
  lineHeight: 1.6,
};

const featureCardStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: "4px",
  marginBottom: "12px",
};

const featureEyebrowStyle: React.CSSProperties = {
  color: "#c4b5fd",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const featureTitleStyle: React.CSSProperties = {
  color: "white",
  fontSize: "14px",
};

const featureTextStyle: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginBottom: "12px",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.28)",
  color: "white",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "15px",
};

const codeRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 138px",
  gap: "10px",
  marginBottom: "12px",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "4px",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(90deg, #7c3aed, #a855f7)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "15px",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid rgba(192,132,252,0.35)",
  background: "rgba(76,29,149,0.24)",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "14px",
};

const footerTextStyle: React.CSSProperties = {
  marginTop: "16px",
  textAlign: "center",
  color: "#c4b5fd",
  fontSize: "14px",
};

const footerLinkStyle: React.CSSProperties = {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
};

const infoStyle: React.CSSProperties = {
  marginTop: "14px",
  color: "#c4b5fd",
  textAlign: "center",
  fontSize: "14px",
  lineHeight: 1.6,
};

const errorStyle: React.CSSProperties = {
  marginTop: "14px",
  color: "#fca5a5",
  textAlign: "center",
  fontSize: "14px",
  lineHeight: 1.6,
};
