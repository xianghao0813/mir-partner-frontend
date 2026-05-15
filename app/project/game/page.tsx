const games = [
  {
    id: 1,
    title: "暮光双龙",
    poster: "/games/mir-m.jpg",
    description: "以东方奇幻世界观为背景打造的 MMORPG。",
    homepage: "https://mir.cn/",
    download: "https://example.com/mirm-download",
    community: "https://example.com/mirm-community",
  },
  {
    id: 2,
    title: "夜鸦",
    poster: "/games/night-crows.jpg",
    description: "主打大规模战场玩法的暗黑中世纪奇幻 MMORPG。",
    homepage: "https://example.com/nightcrows",
    download: "https://example.com/nightcrows-download",
    community: "https://example.com/nightcrows-community",
  },
  {
    id: 3,
    title: "Y MIR",
    poster: "/games/ymir.jpg",
    description: "以北欧风情世界观为核心打造的次世代 MMORPG。",
    homepage: "https://example.com/ymir",
    download: "https://example.com/ymir-download",
    community: "https://example.com/ymir-community",
  },
];

export default function GamePage() {
  return (
    <main
      className="hide-scrollbar"
      style={{
        height: "calc(100vh - 81px)",
        overflowY: "auto",
        margin: "-40px",
        width: "calc(100% + 80px)",
        padding: "40px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "50px" }}>
     <h1
     style={{
      fontSize: "42px",
      marginBottom: "12px",
      background: "linear-gradient(90deg, #a855f7, #6366f1)",
      WebkitBackgroundClip: "text",
      color: "transparent",
      }}
     >
    游戏介绍
     </h1>

      <p style={{ color: "#aaa", fontSize: "18px" }}>
     查看与米尔合伙人合作的游戏信息
      </p>

      {/* 🔥 아래 라인 장식 */}
      <div
      style={{
      width: "150px",
      height: "3px",
      background: "#a855f7",
      margin: "20px auto 0",
      borderRadius: "10px",
      }}
     />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
        }}
      >
        {games.map((game) => (
          <div
            key={game.id}
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #2e2e2e",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            }}
          >
            <img
              src={game.poster}
              alt={game.title}
              style={{
                width: "100%",
                height: "360px",
                objectFit: "cover",
                display: "block",
              }}
            />

            <div style={{ padding: "20px" }}>
              <h2 style={{ marginTop: 0, marginBottom: "10px" }}>{game.title}</h2>
              <p style={{ color: "#ccc", lineHeight: 1.6, minHeight: "48px" }}>
                {game.description}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "18px",
                }}
              >
                <a
                  href={game.homepage}
                  target="_blank"
                  rel="noreferrer"
                  style={linkButtonStyle}
                >
                  官网
                </a>
                <a
                  href={game.download}
                  target="_blank"
                  rel="noreferrer"
                  style={downloadButtonStyle}
                >
                  下载
                </a>
                <a
                  href={game.community}
                  target="_blank"
                  rel="noreferrer"
                  style={communityButtonStyle}
                >
                  社群
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

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
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: "10px",
  textDecoration: "none",
  color: "white",
  backgroundColor: "#7c3aed",
  fontSize: "14px",
};

const communityButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: "10px",
  textDecoration: "none",
  color: "white",
  backgroundColor: "#2563eb",
  fontSize: "14px",
};
