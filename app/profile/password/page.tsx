"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
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

      setEmail(user.email ?? "");
      setLoading(false);
    }

    loadUser();
  }, [router, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("新密码至少需要 8 位。");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("密码已更新。");
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 81px)",
        background:
          "radial-gradient(circle at top, rgba(124,58,237,0.12) 0%, rgba(10,10,14,1) 32%, rgba(6,6,10,1) 100%)",
        margin: "-40px",
        width: "calc(100% + 80px)",
        color: "white",
        padding: "50px 0",
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          margin: "0 auto",
          background: "rgba(16,16,24,0.82)",
          border: "1px solid rgba(124,58,237,0.18)",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#c084fc", fontSize: "14px", marginBottom: "8px", fontWeight: 700 }}>
              安全设置
            </div>
            <h1 style={{ margin: 0, fontSize: "34px" }}>修改密码</h1>
          </div>
          <Link href="/profile" style={backLinkStyle}>
            返回账户信息
          </Link>
        </div>

        {loading ? (
          <div style={stateTextStyle}>加载中...</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: "28px" }}>
            <div style={fieldBlockStyle}>
              <label style={labelStyle}>当前账号</label>
              <div style={readonlyValueStyle}>{email}</div>
            </div>

            <div style={fieldBlockStyle}>
              <label htmlFor="new-password" style={labelStyle}>
                新密码
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入新密码"
                style={inputStyle}
              />
            </div>

            <div style={fieldBlockStyle}>
              <label htmlFor="confirm-password" style={labelStyle}>
                确认新密码
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                style={inputStyle}
              />
            </div>

            {error && <p style={errorStyle}>{error}</p>}
            {message && <p style={successStyle}>{message}</p>}

            <button type="submit" disabled={submitting} style={submitButtonStyle}>
              {submitting ? "保存中..." : "保存新密码"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

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
