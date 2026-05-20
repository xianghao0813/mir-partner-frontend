const games = [
  {
    id: 1,
    title: "暮光双龙",
    poster: "/games/mir-m.jpg",
    description: "以东方幻想世界观打造的 MMORPG，也是新版合伙人官网当前重点服务项目。",
    homepage: "https://mir.cn/",
    download: "https://example.com/mirm-download",
    community: "https://example.com/mirm-community",
  },
  {
    id: 2,
    title: "夜鸦",
    poster: "/games/night-crows.jpg",
    description: "以大规模战场和中世纪幻想为核心的 MMORPG，后续可作为品牌矩阵内容展示。",
    homepage: "https://example.com/nightcrows",
    download: "https://example.com/nightcrows-download",
    community: "https://example.com/nightcrows-community",
  },
  {
    id: 3,
    title: "Y MIR",
    poster: "/games/ymir.jpg",
    description: "以北欧风格世界观为核心的次世代 MMORPG，后续可接入统一资讯与活动入口。",
    homepage: "https://example.com/ymir",
    download: "https://example.com/ymir-download",
    community: "https://example.com/ymir-community",
  },
];

export default function GamePage() {
  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div style={headerStyle}>
        <p style={eyebrowStyle}>GAME PORTFOLIO</p>
        <h1 style={titleStyle}>游戏介绍</h1>
        <p style={subtitleStyle}>
          新版官网将逐步承担 Wemade 游戏矩阵的品牌展示、资讯发布与活动导流功能。
        </p>
      </div>

      <div style={gridStyle}>
        {games.map((game) => (
          <article key={game.id} style={cardStyle}>
            <img src={game.poster} alt={game.title} style={posterStyle} />
            <div style={contentStyle}>
              <h2 style={gameTitleStyle}>{game.title}</h2>
              <p style={descStyle}>{game.description}</p>

              <div style={actionsStyle}>
                <a href={game.homepage} target="_blank" rel="noreferrer" style={linkButtonStyle}>
                  官网
                </a>
                <a href={game.download} target="_blank" rel="noreferrer" style={downloadButtonStyle}>
                  下载
                </a>
                <a href={game.community} target="_blank" rel="noreferrer" style={communityButtonStyle}>
                  社区
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 81px)",
  overflowY: "auto",
  margin: "-40px",
  width: "calc(100% + 80px)",
  padding: "56px 40px",
  boxSizing: "border-box",
  color: "#f8fafc",
  background: "#09090f",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "42px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#c4b5fd",
  fontSize: "13px",
  letterSpacing: "0.18em",
  fontWeight: 800,
};

const titleStyle: React.CSSProperties = {
  fontSize: "42px",
  margin: "0 0 12px",
};

const subtitleStyle: React.CSSProperties = {
  color: "#b9b6c8",
  fontSize: "18px",
  margin: 0,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "24px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#17171f",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
};

const posterStyle: React.CSSProperties = {
  width: "100%",
  height: "360px",
  objectFit: "cover",
  display: "block",
};

const contentStyle: React.CSSProperties = {
  padding: "20px",
};

const gameTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "10px",
};

const descStyle: React.CSSProperties = {
  color: "#ccc",
  lineHeight: 1.6,
  minHeight: "48px",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: "10px",
  textDecoration: "none",
  color: "white",
  backgroundColor: "#3b3b3b",
  fontSize: "14px",
};

const downloadButtonStyle: React.CSSProperties = {
  ...linkButtonStyle,
  backgroundColor: "#7c3aed",
};

const communityButtonStyle: React.CSSProperties = {
  ...linkButtonStyle,
  backgroundColor: "#2563eb",
};
