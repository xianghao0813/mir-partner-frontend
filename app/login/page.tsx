"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const callbackError = searchParams.get("error");
  const cancelled = searchParams.get("cancelled") === "1";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <LoginShell>
      <form onSubmit={handleLogin} className="glow-purple" style={formStyle}>
        <h1 style={titleStyle}>登录</h1>

        <p style={subtitleStyle}>可使用邮箱登录，也可直接使用游戏内账号接入本站。</p>

        <Link href="/auth/sdk/start" style={sdkButtonStyle}>
          使用游戏账号登录
        </Link>

        <div style={separatorStyle}>
          <span>或使用邮箱登录</span>
        </div>

        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" disabled={loading} className="glow-purple-strong" style={buttonStyle}>
          {loading ? "登录中..." : "邮箱登录"}
        </button>

        <div style={footerTextStyle}>
          아직 계정이 없나요?{" "}
          <a href="/signup" style={footerLinkStyle}>
            바로 가입
          </a>
        </div>

        {cancelled ? <p style={infoStyle}>已取消 QuickSDK 登录。</p> : null}

        {callbackError ? (
          <p style={errorStyle}>{callbackError}</p>
        ) : message ? (
          <p style={errorStyle}>{message}</p>
        ) : null}
      </form>
    </LoginShell>
  );
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
  maxWidth: "440px",
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
  minHeight: "520px",
  opacity: 0.4,
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "2px",
  fontSize: "32px",
  color: "white",
  textAlign: "center",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "8px",
  textAlign: "center",
  color: "#b8b8c5",
  fontSize: "14px",
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

const sdkButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  textAlign: "center",
  textDecoration: "none",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(192,132,252,0.35)",
  background: "linear-gradient(180deg, rgba(124,58,237,0.18) 0%, rgba(76,29,149,0.28) 100%)",
  color: "white",
  fontWeight: 700,
  fontSize: "15px",
};

const separatorStyle: React.CSSProperties = {
  position: "relative",
  textAlign: "center",
  color: "#8b8b99",
  fontSize: "13px",
  margin: "2px 0",
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

const errorStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#fca5a5",
  textAlign: "center",
  fontSize: "14px",
  lineHeight: 1.6,
};

const infoStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#c4b5fd",
  textAlign: "center",
  fontSize: "14px",
  lineHeight: 1.6,
};
