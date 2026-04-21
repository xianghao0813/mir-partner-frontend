"use client";

import { useRef, useState } from "react";

const coinTiers = [
  {
    id: 1,
    coins: 100,
    price: "¥100",
    image: "/cloud-coins/tier-1.png",
    label: "入门",
    bonus: "",
  },
  {
    id: 2,
    coins: 300,
    price: "¥300",
    image: "/cloud-coins/tier-2.png",
    label: "推荐",
    bonus: "+20 云币",
  },
  {
    id: 3,
    coins: 500,
    price: "¥500",
    image: "/cloud-coins/tier-3.png",
    label: "热卖",
    bonus: "+50 云币",
  },
  {
    id: 4,
    coins: 1000,
    price: "¥1,000",
    image: "/cloud-coins/tier-4.png",
    label: "BEST",
    bonus: "+120 云币",
  },
  {
    id: 5,
    coins: 5000,
    price: "¥5,000",
    image: "/cloud-coins/tier-5.png",
    label: "超值",
    bonus: "+800 云币",
  },
  {
    id: 6,
    coins: 10000,
    price: "¥10,000",
    image: "/cloud-coins/tier-6.png",
    label: "豪华",
    bonus: "+1800 云币",
  },
  {
    id: 7,
    coins: 20000,
    price: "¥20,000",
    image: "/cloud-coins/tier-7.png",
    label: "尊享",
    bonus: "+4200 云币",
  },
  {
    id: 8,
    coins: 30000,
    price: "¥30,000",
    image: "/cloud-coins/tier-8.png",
    label: "至尊",
    bonus: "+7000 云币",
  },
];

const usageHistory = [
  { id: 1, date: "2026-04-01", type: "消费", amount: "-120 云币", desc: "云币消耗" },
  { id: 2, date: "2026-04-03", type: "充值", amount: "+500 云币", desc: "云币充值" },
  { id: 3, date: "2026-04-06", type: "消费", amount: "-80 云币", desc: "云币消耗" },
  { id: 4, date: "2026-04-08", type: "充值", amount: "+1000 云币", desc: "云币充值" },
];

export default function WalletPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const secondSectionRef = useRef<HTMLDivElement | null>(null);

  const handleMoveToRecharge = () => {
    secondSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main
      className="hide-scrollbar"
      style={{
        height: "calc(100vh - 81px)",
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        scrollBehavior: "smooth",
        background:
          "linear-gradient(180deg, #07070a 0%, #0d0b14 55%, #07070a 100%)",
        color: "white",
        margin: "-40px",
        width: "calc(100% + 80px)",
        userSelect: "none",
        caretColor: "transparent",
      }}
    >
      {/* 첫 번째 섹터 */}
      <section
        style={{
          height: "calc(100vh - 81px)",
          scrollSnapAlign: "start",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "520px",
            height: "520px",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0.08) 35%, rgba(0,0,0,0) 72%)",
            filter: "blur(30px)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: "980px",
            padding: "40px",
            borderRadius: "28px",
            background: "rgba(16,16,24,0.75)",
            border: "1px solid rgba(168,85,247,0.22)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            backdropFilter: "blur(14px)",
            position: "relative",
            zIndex: 2,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "36px" }}>
            <h1
              style={{
                fontSize: "42px",
                marginBottom: "12px",
                background: "linear-gradient(90deg, #a855f7, #6366f1)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              个人钱包
            </h1>
            <p style={{ color: "#aaa", fontSize: "18px", margin: 0 }}>
              查看账户信息、云币余额，并快速进行充值。
            </p>
            <div
              style={{
                width: "80px",
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
              gridTemplateColumns: "1.2fr 1fr",
              gap: "24px",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "20px",
                padding: "28px",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "18px", fontSize: "26px" }}>
                账户信息
              </h2>

              <div style={{ display: "grid", gap: "14px", color: "#ddd" }}>
                <div>
                  <strong style={{ color: "#fff" }}>账号：</strong> user_demo_001
                </div>
                <div>
                  <strong style={{ color: "#fff" }}>昵称：</strong> 米尔玩家
                </div>
                <div>
                  <strong style={{ color: "#fff" }}>邮箱：</strong> demo@email.com
                </div>
                <div>
                  <strong style={{ color: "#fff" }}>状态：</strong> 正常
                </div>
              </div>
            </div>

            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(124,58,237,0.18) 0%, rgba(30,30,40,0.65) 100%)",
                border: "1px solid rgba(168,85,247,0.28)",
                borderRadius: "20px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ color: "#c4b5fd", fontSize: "15px", marginBottom: "10px" }}>
                  当前持有
                </div>
                <div
                  style={{
                    fontSize: "44px",
                    fontWeight: 800,
                    marginBottom: "10px",
                  }}
                >
                  2,580 云币
                </div>
                <p style={{ color: "#b8b8b8", lineHeight: 1.6, marginTop: 0 }}>
                  云币可用于指定游戏及相关功能中进行服务、内容兑换。
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  style={{
                    backgroundColor: "#23232d",
                    color: "white",
                    border: "1px solid #3a3a48",
                    padding: "12px 18px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "15px",
                  }}
                >
                  使用明细
                </button>

                <button
                  onClick={handleMoveToRecharge}
                  style={{
                    backgroundColor: "#7c3aed",
                    color: "white",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "15px",
                    boxShadow: "0 0 18px rgba(124,58,237,0.35)",
                  }}
                >
                  充值
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 두 번째 섹터 */}
      <section
        ref={secondSectionRef}
        style={{
          minHeight: "calc(100vh - 81px)",
          scrollSnapAlign: "start",
          padding: "50px 40px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "34px" }}>
          <h2
            style={{
              fontSize: "40px",
              marginBottom: "12px",
              background: "linear-gradient(90deg, #a855f7, #6366f1)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            云币充值
          </h2>
          <p style={{ color: "#aaa", fontSize: "18px", margin: 0 }}>
            请选择适合你的云币档位进行充值。
          </p>
          <div
            style={{
              width: "80px",
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
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "28px",
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%",
          }}
        >
        {coinTiers.map((tier) => (
          <div
            key={tier.id}
            style={{
              position: "relative",
              background:
                tier.id >= 7
                  ? "linear-gradient(180deg, rgba(40,32,18,0.95) 0%, rgba(18,16,12,1) 100%)"
                  : "linear-gradient(180deg, rgba(24,24,28,1) 0%, rgba(12,12,16,1) 100%)",
              border:
                tier.id >= 7
                  ? "1px solid rgba(255,215,120,0.35)"
                  : "1px solid rgba(124,58,237,0.22)",
              borderRadius: "22px",
              padding: "20px 16px 18px",
              boxShadow:
                tier.id >= 7
                  ? "0 14px 30px rgba(0,0,0,0.38), 0 0 22px rgba(255,215,120,0.10)"
                  : "0 10px 24px rgba(0,0,0,0.35)",
              textAlign: "center",
              overflow: "hidden",
            }}
          >
            {/* 배경 글로우 */}
            <div
              style={{
                position: "absolute",
                top: "-30px",
                right: "-30px",
                width: "140px",
                height: "140px",
                borderRadius: "999px",
                background:
                  tier.id >= 7
                    ? "rgba(255,215,120,0.10)"
                    : "rgba(124,58,237,0.10)",
                filter: "blur(26px)",
                pointerEvents: "none",
              }}
            />

            {/* 라벨 */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                left: "14px",
                padding: "6px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: tier.id >= 7 ? "#2b2110" : "white",
                background:
                  tier.id >= 7
                    ? "linear-gradient(90deg, #fcd34d, #fde68a)"
                    : "linear-gradient(90deg, #7c3aed, #a855f7)",
                boxShadow:
                  tier.id >= 7
                    ? "0 0 12px rgba(252,211,77,0.25)"
                    : "0 0 12px rgba(168,85,247,0.18)",
              }}
            >
              {tier.label}
            </div>

            {/* 이미지 */}
            <div
              style={{
                width: "90px",
                height: "90px",
                margin: "6px auto 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={tier.image}
                alt={`${tier.coins} 云币`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  filter:
                    tier.id >= 7
                      ? "drop-shadow(0 10px 18px rgba(255,215,120,0.22))"
                      : "drop-shadow(0 8px 16px rgba(255,215,100,0.16))",
                }}
              />
            </div>

            {/* 수량 */}
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: tier.id >= 7 ? "#fde68a" : "#f8fafc",
                marginBottom: "4px",
                lineHeight: 1.1,
              }}
            >
              {tier.coins.toLocaleString()}
            </div>

            <div
              style={{
                fontSize: "15px",
                color: "#cfcfcf",
                marginBottom: "6px",
              }}
            >
              云币
            </div>

            {/* 보너스 */}
            <div
              style={{
                minHeight: "24px",
                fontSize: "14px",
                fontWeight: 700,
                color: tier.bonus ? "#86efac" : "#777",
                marginBottom: "8px",
              }}
            >
              {tier.bonus ? `赠送 ${tier.bonus}` : "无额外赠送"}
            </div>

            {/* 가격 */}
            <div
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "white",
                marginBottom: "10px",
              }}
            >
              {tier.price}
            </div>

            {/* 버튼 */}
            <button
              style={{
                width: "100%",
                background:
                  tier.id >= 7
                    ? "linear-gradient(90deg, #f59e0b, #fcd34d)"
                    : "linear-gradient(90deg, #7c3aed, #a855f7)",
                color: tier.id >= 7 ? "#20170a" : "white",
                border: "none",
                padding: "10px 14px",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 800,
                boxShadow:
                  tier.id >= 7
                    ? "0 0 18px rgba(245,158,11,0.18)"
                    : "0 0 18px rgba(124,58,237,0.22)",
              }}
            >
              立即充值
            </button>
          </div>
        ))}
        </div>
      </section>

      {/* 사용명세 팝업 */}
      {isHistoryOpen && (
        <div
          onClick={() => setIsHistoryOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 92vw)",
              backgroundColor: "#14141a",
              border: "1px solid #333",
              borderRadius: "20px",
              padding: "28px",
              boxShadow: "0 0 24px rgba(124,58,237,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0 }}>云币使用明细</h2>
              <button
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#bbb",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {usageHistory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 90px 140px 1fr",
                    gap: "12px",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#ddd",
                  }}
                >
                  <div>{item.date}</div>
                  <div>{item.type}</div>
                  <div
                    style={{
                      color: item.amount.startsWith("+") ? "#86efac" : "#fca5a5",
                      fontWeight: 700,
                    }}
                  >
                    {item.amount}
                  </div>
                  <div>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}