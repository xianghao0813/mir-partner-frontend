"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("注册请求已提交，请查看邮箱完成验证。");
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 81px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        margin: "-40px",
        width: "calc(100% + 80px)",
        overflow: "hidden",
        backgroundColor: "#07070a",
      }}
    >
      <div className="auth-bg" />
      <div className="auth-overlay" />

      <form
        onSubmit={handleSignup}
        className="glow-purple"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          borderRadius: "22px",
          background: "rgba(16,16,24,0.82)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          backdropFilter: "blur(14px)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "10px",
            fontSize: "32px",
            color: "white",
            textAlign: "center",
          }}
        >
          注册
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: "24px",
            textAlign: "center",
            color: "#b8b8c5",
            fontSize: "14px",
          }}
        >
          加入米尔合伙人平台，开启你的成长之路
        </p>

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

        <button type="submit" className="glow-purple-strong" style={buttonStyle}>
          注册
        </button>

        <div
          style={{
            marginTop: "16px",
            textAlign: "center",
            color: "#c4b5fd",
            fontSize: "14px",
          }}
        >
          已有账号？{" "}
          <a
            href="/login"
            style={{
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            去登录
          </a>
        </div>

        {message && (
          <p
            style={{
              marginTop: "14px",
              color: message.includes("已提交") ? "#c4b5fd" : "#fca5a5",
              textAlign: "center",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
        )}
      </form>
    </main>
  );
}

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