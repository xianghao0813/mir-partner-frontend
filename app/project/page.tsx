import Link from "next/link";

const projectCards = [
  {
    title: "游戏项目",
    desc: "了解暮光双龙及后续 Wemade 游戏内容，查看官网、下载与社区入口。",
    href: "/project/game",
  },
  {
    title: "合伙人计划",
    desc: "查看积分、星级、优惠券、签到、小游戏等新版合伙人成长体系。",
    href: "/project/partner",
  },
];

export default function ProjectPage() {
  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>PROJECT CENTER</p>
        <h1 style={titleStyle}>项目介绍</h1>
        <p style={descStyle}>
          新版官网将作为游戏资讯、合伙人权益、积分活动、优惠券与账号服务的统一入口。
          原官网保留充值能力，新版官网承接更完整的用户成长与长期运营功能。
        </p>
      </section>

      <section style={gridStyle}>
        {projectCards.map((card) => (
          <Link key={card.href} href={card.href} style={cardStyle}>
            <span style={cardTitleStyle}>{card.title}</span>
            <span style={cardDescStyle}>{card.desc}</span>
            <span style={cardActionStyle}>查看详情</span>
          </Link>
        ))}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 81px)",
  margin: "-40px",
  padding: "72px 40px",
  boxSizing: "border-box",
  color: "#f5f3ff",
  background:
    "linear-gradient(180deg, rgba(6,6,10,0.78), rgba(6,6,10,0.96)), url('/login-bg.png') center/cover fixed",
};

const heroStyle: React.CSSProperties = {
  maxWidth: "980px",
  margin: "0 auto 44px",
  textAlign: "center",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#c4b5fd",
  fontSize: "13px",
  letterSpacing: "0.18em",
  fontWeight: 800,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: "46px",
  lineHeight: 1.15,
};

const descStyle: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "780px",
  color: "#d8d5e5",
  fontSize: "18px",
  lineHeight: 1.85,
};

const gridStyle: React.CSSProperties = {
  maxWidth: "980px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
};

const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  padding: "28px",
  borderRadius: "18px",
  textDecoration: "none",
  color: "inherit",
  background: "rgba(17,17,24,0.88)",
  border: "1px solid rgba(196,181,253,0.18)",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 900,
};

const cardDescStyle: React.CSSProperties = {
  color: "#c9c6d8",
  lineHeight: 1.7,
};

const cardActionStyle: React.CSSProperties = {
  color: "#c4b5fd",
  fontWeight: 800,
};
