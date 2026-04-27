"use client";

import Link from "next/link";
import "./globals.css";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type NavGroup = {
  key: string;
  label: string;
  items: { href: string; label: string }[];
};

const navGroups: NavGroup[] = [
  {
    key: "project",
    label: "合作伙伴介绍",
    items: [
      { href: "/project/game", label: "游戏介绍" },
      { href: "/project/partner", label: "项目介绍" },
    ],
  },
  {
    key: "profile",
    label: "合伙人信息",
    items: [
      { href: "/profile", label: "个人资料" },
      { href: "/profile/wallet", label: "我的钱包" },
    ],
  },
  {
    key: "notice",
    label: "新闻",
    items: [
      { href: "/notices/latest", label: "最新消息" },
      { href: "/notices/events", label: "活动" },
      { href: "/notices/updates", label: "更新" },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [supabase] = useState(createClient);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accountDisplayName, setAccountDisplayName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email ?? null);
      setAccountDisplayName(user ? getAccountDisplayName(user) : null);
      setAuthLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setAccountDisplayName(session?.user ? getAccountDisplayName(session.user) : null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    await fetch("/auth/logout", {
      method: "POST",
    });

    setAccountMenuOpen(false);
    setUserEmail(null);
    setAccountDisplayName(null);
    window.location.href = "/";
  }

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          backgroundColor: "#111",
          color: "white",
          fontFamily:
            '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", Arial, sans-serif',
        }}
      >
        <header
          className="site-header"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            backgroundColor: "rgba(15,15,15,0.92)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid #222",
          }}
        >
          <div
            className="site-header-inner"
            style={{
              maxWidth: "1400px",
              margin: "0 auto",
              padding: "18px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "40px",
              flexWrap: "wrap",
            }}
          >
            <Link
              className="site-brand"
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textDecoration: "none",
                color: "white",
                flexShrink: 0,
              }}
            >
              <img
                src="/wp-logo2.png"
                alt="MIR Partner"
                draggable={false}
                style={{
                  width: "62px",
                  height: "auto",
                  display: "block",
                  filter: "drop-shadow(0 0 8px rgba(168,85,247,0.35))",
                }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: "20px" }}>MIR Partner</div>
                <div className="site-brand-tagline" style={{ color: "#9ca3af", fontSize: "12px" }}>
                  创作者与合作伙伴平台
                </div>
              </div>
            </Link>

            <div
              className="site-nav-area"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "36px",
                flex: "1 1 720px",
                flexWrap: "wrap",
              }}
            >
              <nav
                className="site-nav"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px 40px",
                  flexWrap: "wrap",
                }}
              >
                <Link href="/" style={navLinkStyle}>
                  首页
                </Link>

                {navGroups.map((group) => (
                  <div
                    key={group.key}
                    style={{
                      position: "relative",
                      paddingBottom: openMenu === group.key ? "12px" : 0,
                      marginBottom: openMenu === group.key ? "-12px" : 0,
                    }}
                    onMouseEnter={() => setOpenMenu(group.key)}
                    onMouseLeave={() => setOpenMenu(null)}
                  >
                    <button type="button" style={menuButtonStyle}>
                      {group.label}
                    </button>

                    {openMenu === group.key && (
                      <div style={dropdownStyle}>
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            style={dropdownItemStyle}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              <div
                className="site-auth-area"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "12px",
                  minWidth: "180px",
                  flex: "1 0 auto",
                }}
              >
                {authLoading ? (
                  <span style={{ color: "#999", fontSize: "14px" }}>
                    正在确认登录状态...
                  </span>
                ) : userEmail ? (
                  <div ref={accountMenuRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen((prev) => !prev)}
                      style={accountIconButtonStyle}
                      aria-label="账户菜单"
                      aria-expanded={accountMenuOpen}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>

                    {accountMenuOpen && (
                      <div style={accountDropdownStyle}>
                        <div style={accountEmailBlockStyle}>
                          <div style={accountLabelStyle}>当前账号</div>
                          <div style={accountEmailStyle} title={accountDisplayName ?? userEmail}>
                            {accountDisplayName ?? userEmail}
                          </div>
                        </div>

                        <Link
                          href="/profile/password"
                          style={accountDropdownItemStyle}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          修改密码
                        </Link>
                        <button onClick={handleLogout} style={accountActionButtonStyle}>
                          退出登录
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href="/login" style={primaryLinkStyle}>
                    登录
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="site-content" style={{ padding: "40px" }}>{children}</div>
      </body>
    </html>
  );
}

function getAccountDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const displayName =
    readMetadataString(metadata.nickname) ||
    readMetadataString(metadata.quicksdk_username) ||
    readMetadataString(metadata.username);

  return displayName || user.email || "";
}

function readMetadataString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const navLinkStyle: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  fontSize: "16px",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const menuButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  whiteSpace: "nowrap",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  minWidth: "160px",
  backgroundColor: "#171717",
  border: "1px solid #2d2d2d",
  borderRadius: "12px",
  boxShadow: "0 12px 24px rgba(0,0,0,0.3)",
  padding: "8px",
  display: "grid",
  gap: "4px",
};

const dropdownItemStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: "8px",
  color: "white",
  textDecoration: "none",
  whiteSpace: "nowrap",
  backgroundColor: "transparent",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#7c3aed",
  color: "white",
  textDecoration: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  whiteSpace: "nowrap",
  fontWeight: 700,
};

const accountIconButtonStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "999px",
  border: "1px solid rgba(192,132,252,0.35)",
  background:
    "linear-gradient(180deg, rgba(124,58,237,0.22) 0%, rgba(76,29,149,0.3) 100%)",
  color: "white",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 0 18px rgba(124,58,237,0.18)",
};

const accountDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 12px)",
  right: 0,
  minWidth: "260px",
  background: "rgba(18,18,24,0.96)",
  border: "1px solid rgba(192,132,252,0.2)",
  borderRadius: "18px",
  padding: "10px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.38)",
  backdropFilter: "blur(18px)",
  display: "grid",
  gap: "6px",
  zIndex: 120,
};

const accountEmailBlockStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  marginBottom: "4px",
};

const accountLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#b7a9d8",
  marginBottom: "6px",
};

const accountEmailStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  overflowWrap: "anywhere",
};

const accountDropdownItemStyle: React.CSSProperties = {
  display: "block",
  padding: "11px 14px",
  borderRadius: "12px",
  color: "white",
  textDecoration: "none",
  background: "transparent",
  fontSize: "14px",
  fontWeight: 600,
};

const accountActionButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "11px 14px",
  borderRadius: "12px",
  border: "none",
  background: "transparent",
  color: "#f5d0fe",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};
