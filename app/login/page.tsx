"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const callbackError = searchParams.get("error");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/quicksdk/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const payload = await readJsonResponse<{
        error?: string;
        profileUrl?: string;
      }>(response);

      if (!response.ok) {
        setMessage(payload?.error || "登录服务异常，请重新构建并重启服务器后再试。");
        return;
      }

      window.location.href = payload?.profileUrl || "/profile";
    } catch {
      setMessage("当前无法连接登录服务。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell>
      <form onSubmit={handleLogin} className="glow-purple" style={formStyle}>
        <h1 style={titleStyle}>账号登录</h1>

        <div style={featureCardStyle}>
          <div style={featureEyebrowStyle}>直接登录</div>
          <strong style={featureTitleStyle}>不再跳转额外网页登录页</strong>
          <span style={featureTextStyle}>
            如果你已拥有娱美德旗下游戏的注册账号，可使用该账号和密码直接登录。
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
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading} className="glow-purple-strong" style={buttonStyle}>
          {loading ? "登录中..." : "登录"}
        </button>

        <div style={footerTextStyle}>
          <Link href="/forgot-password" style={footerLinkStyle}>
            找回密码
          </Link>
          <span style={footerDividerStyle}>|</span>
          还没有账号？{" "}
          <Link href="/signup" style={footerLinkStyle}>
            去注册
          </Link>
        </div>

        {callbackError ? (
          <p style={errorStyle}>{callbackError}</p>
        ) : message ? (
          <p style={errorStyle}>{message}</p>
        ) : null}
      </form>
    </LoginShell>
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

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <main style={pageStyle}>
      <div className="auth-bg" />
      <div className="auth-overlay" />
      {children ?? <div style={fallbackPanelStyle} />}
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
  maxWidth: "480px",
  padding: "32px",
  borderRadius: "22px",
  background: "rgba(16,16,24,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(14px)",
  display: "grid",
  gap: "12px",
};

const fallbackPanelStyle: React.CSSProperties = {
  ...formStyle,
  minHeight: "440px",
  opacity: 0.4,
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
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: "4px",
  marginBottom: "4px",
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
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.28)",
  color: "white",
  boxSizing: "border-box",
  outline: "none",
  fontSize: "15px",
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

const footerTextStyle: React.CSSProperties = {
  marginTop: "4px",
  textAlign: "center",
  color: "#c4b5fd",
  fontSize: "14px",
};

const footerLinkStyle: React.CSSProperties = {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
};

const footerDividerStyle: React.CSSProperties = {
  display: "inline-block",
  margin: "0 10px",
  color: "#71717a",
};

const errorStyle: React.CSSProperties = {
  color: "#fca5a5",
  textAlign: "center",
  fontSize: "14px",
  margin: 0,
  lineHeight: 1.6,
};
