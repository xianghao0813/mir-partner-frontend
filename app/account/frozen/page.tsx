import Link from "next/link";

const supportHref = process.env.NEXT_PUBLIC_CUSTOMER_SERVICE_URL || "mailto:support@mirpartner.com";

export default function FrozenAccountPage() {
  return (
    <main style={pageStyle}>
      <section style={modalStyle} role="alertdialog" aria-labelledby="frozen-title" aria-describedby="frozen-description">
        <div style={iconStyle}>!</div>
        <div>
          <p style={eyebrowStyle}>Account Security</p>
          <h1 id="frozen-title" style={titleStyle}>账号已被冻结</h1>
          <p id="frozen-description" style={descriptionStyle}>
            系统检测到账户存在异常情况，当前账号已被冻结。请联系客户中心处理。
          </p>
        </div>
        <div style={buttonRowStyle}>
          <Link href="/" style={secondaryButtonStyle}>
            确认
          </Link>
          <a href={supportHref} style={primaryButtonStyle}>
            联系客服
          </a>
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "radial-gradient(circle at top, rgba(220,38,38,0.16), transparent 34%), #0f1117",
  color: "#f9fafb",
};

const modalStyle: React.CSSProperties = {
  width: "min(460px, 100%)",
  display: "grid",
  gap: "18px",
  padding: "28px",
  borderRadius: "18px",
  background: "rgba(17, 24, 39, 0.94)",
  border: "1px solid rgba(248,113,113,0.24)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
};

const iconStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "rgba(239,68,68,0.16)",
  border: "1px solid rgba(248,113,113,0.34)",
  color: "#fecaca",
  fontWeight: 900,
  fontSize: "24px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#fca5a5",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0,
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "28px",
  lineHeight: 1.2,
};

const descriptionStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: "#d1d5db",
  lineHeight: 1.7,
};

const buttonRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: "44px",
  display: "grid",
  placeItems: "center",
  borderRadius: "12px",
  background: "linear-gradient(90deg, #dc2626, #f97316)",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: "44px",
  display: "grid",
  placeItems: "center",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#f9fafb",
  fontWeight: 800,
  textDecoration: "none",
};
