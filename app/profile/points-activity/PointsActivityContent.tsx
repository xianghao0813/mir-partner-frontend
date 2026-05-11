"use client";

import { useMemo, useState } from "react";
import BossSlashTrial from "@/components/BossSlashTrial";
import type { AttendanceAward, AttendanceSummary } from "@/lib/attendance";
import type { PartnerPointTransaction } from "@/lib/partnerProfile";

type PointsActivityContentProps = {
  initialPoints: number;
  initialSummary: AttendanceSummary;
};

type AttendanceResponse = {
  message?: string;
  points?: number;
  award?: AttendanceAward;
  summary?: AttendanceSummary;
  pointTransaction?: {
    id?: string;
    title?: string;
    description?: string;
    points?: number;
    createdAt?: string;
    source?: string;
  };
};

export default function PointsActivityContent({
  initialPoints,
  initialSummary,
}: PointsActivityContentProps) {
  const [points, setPoints] = useState(initialPoints);
  const [attendance, setAttendance] = useState(initialSummary);
  const [selectedMonth, setSelectedMonth] = useState(initialSummary.monthKey);
  const [checkingIn, setCheckingIn] = useState(false);
  const [stampDate, setStampDate] = useState("");
  const [message, setMessage] = useState("");
  const [lastAward, setLastAward] = useState<AttendanceAward | null>(null);

  const calendar = useMemo(
    () => buildCalendar(selectedMonth, attendance.checkedDates),
    [selectedMonth, attendance.checkedDates]
  );

  async function checkIn() {
    setCheckingIn(true);
    setMessage("");
    setLastAward(null);

    try {
      const response = await fetch("/api/points/attendance", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as AttendanceResponse | null;

      if (!response.ok) {
        if (payload?.summary) {
          setAttendance(payload.summary);
        }
        setMessage(payload?.message ?? "出席处理失败。");
        return;
      }

      if (payload?.summary) {
        setAttendance(payload.summary);
        setSelectedMonth(payload.summary.monthKey);
        setStampDate(payload.summary.today);
        window.setTimeout(() => setStampDate(""), 780);
      }
      if (typeof payload?.points === "number") {
        setPoints(payload.points);
      }
      if (payload?.award) {
        setLastAward(payload.award);
        setMessage(`出席完成，获得 ${payload.award.totalAwarded.toLocaleString()} MIR 积分。`);
      }
    } catch {
      setMessage("当前无法连接出席服务。");
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <main className="hide-scrollbar" style={pageStyle}>
      <div className="auth-bg" style={{ position: "fixed" }} />
      <div className="auth-overlay" style={{ position: "fixed" }} />

      <div style={shellStyle}>
        <section style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Point Activity</div>
            <h1 style={titleStyle}>积分活动</h1>
            <p style={subtitleStyle}>
              每日出席和小游戏奖励都会累计到 MIR 积分，并同步计入合伙人星级成长。
            </p>
          </div>
          <div style={pointsPanelStyle}>
            <span style={pointsLabelStyle}>当前 MIR 积分</span>
            <strong style={pointsValueStyle}>{points.toLocaleString()}</strong>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Daily Attendance</div>
              <h2 style={sectionTitleStyle}>每日出席</h2>
            </div>
            <button
              type="button"
              onClick={() => void checkIn()}
              disabled={checkingIn || attendance.checkedToday}
              style={{
                ...checkInButtonStyle,
                opacity: checkingIn || attendance.checkedToday ? 0.52 : 1,
                cursor: checkingIn || attendance.checkedToday ? "not-allowed" : "pointer",
              }}
            >
              {attendance.checkedToday ? "今日已出席" : checkingIn ? "出席中..." : "立即出席"}
            </button>
          </div>

          <div style={attendanceGridStyle}>
            <div style={attendanceStatsStyle}>
              <InfoTile label="累计出席" value={`${attendance.totalDays.toLocaleString()} 天`} accent="#facc15" />
              <InfoTile label="每日奖励" value="+100" accent="#86efac" />
              <InfoTile
                label="7日追加"
                value={attendance.nextSevenBonusIn === 7 ? "+1000" : `${attendance.nextSevenBonusIn} 天后`}
                accent="#c4b5fd"
              />
              <InfoTile
                label="30日追加"
                value={attendance.nextThirtyBonusIn === 30 ? "+5000" : `${attendance.nextThirtyBonusIn} 天后`}
                accent="#fca5a5"
              />
              {lastAward ? (
                <div style={awardBreakdownStyle}>
                  <strong>本次奖励</strong>
                  <span>基础 +{lastAward.basePoints}</span>
                  {lastAward.sevenDayBonus > 0 ? <span>7日奖励 +{lastAward.sevenDayBonus}</span> : null}
                  {lastAward.thirtyDayBonus > 0 ? <span>30日奖励 +{lastAward.thirtyDayBonus}</span> : null}
                </div>
              ) : (
                <div style={awardBreakdownStyle}>
                  <strong>奖励规则</strong>
                  <span>每天出席 +100</span>
                  <span>累计每 7 天 +1000</span>
                  <span>累计每 30 天 +5000</span>
                </div>
              )}
              {message ? <div style={messageStyle}>{message}</div> : null}
            </div>

            <div style={calendarShellStyle}>
              <div style={calendarTopStyle}>
                <button
                  type="button"
                  onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                  style={monthButtonStyle}
                  aria-label="上个月"
                >
                  ‹
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  style={monthInputStyle}
                />
                <button
                  type="button"
                  onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                  style={monthButtonStyle}
                  aria-label="下个月"
                >
                  ›
                </button>
              </div>

              <div style={weekdayGridStyle}>
                {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                  <div key={day} style={weekdayStyle}>{day}</div>
                ))}
              </div>
              <div style={calendarGridStyle}>
                {calendar.map((day) => (
                  <div
                    key={day.key}
                    style={{
                      ...dayCellStyle,
                      ...(day.inMonth ? null : outsideDayCellStyle),
                      ...(day.checked ? checkedDayCellStyle : null),
                      ...(day.date === attendance.today ? todayCellStyle : null),
                    }}
                  >
                    <span style={dayNumberStyle}>{day.day}</span>
                    {day.checked ? (
                      <span style={day.date === stampDate ? stampStyleActive : stampStyle}>出席</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Mini Game</div>
              <h2 style={sectionTitleStyle}>遗迹冲刺</h2>
            </div>
            <div style={smallBadgeStyle}>MIR Points: {points.toLocaleString()}</div>
          </div>

          <BossSlashTrial
            initialPoints={points}
            onPointsChange={(nextPoints) => setPoints(nextPoints)}
            onRewardClaimed={(transaction) => {
              const normalized = normalizeRewardTransaction(transaction);
              setMessage(`${normalized.title}，获得 ${normalized.points.toLocaleString()} MIR 积分。`);
            }}
          />
        </section>
      </div>

      <style jsx>{`
        @keyframes attendanceStamp {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(2.35) rotate(-18deg);
            filter: blur(4px);
          }
          46% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.82) rotate(-9deg);
            filter: blur(0);
          }
          68% {
            transform: translate(-50%, -50%) scale(1.08) rotate(-9deg);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(-9deg);
          }
        }
      `}</style>
    </main>
  );
}

function InfoTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <article style={infoTileStyle}>
      <span style={infoTileLabelStyle}>{label}</span>
      <strong style={{ ...infoTileValueStyle, color: accent }}>{value}</strong>
    </article>
  );
}

function buildCalendar(monthKey: string, checkedDates: string[]) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - startOffset);
  const checked = new Set(checkedDates);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      key,
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
      checked: checked.has(key),
    };
  });
}

function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeRewardTransaction(transaction: {
  id?: string;
  title?: string;
  description?: string;
  points?: number;
  createdAt?: string;
  source?: string;
}): PartnerPointTransaction {
  return {
    id: transaction.id || `activity-${Date.now()}`,
    title: transaction.title || "小游戏积分",
    description: transaction.description || "遗迹冲刺小游戏奖励",
    points: Number.isFinite(Number(transaction.points)) ? Math.floor(Number(transaction.points)) : 0,
    createdAt: transaction.createdAt || new Date().toISOString(),
    source: transaction.source || "boss_last_hit",
  };
}

const pageStyle: React.CSSProperties = {
  height: "calc(100vh - 81px)",
  position: "relative",
  margin: "-40px",
  width: "calc(100% + 80px)",
  overflowX: "hidden",
  overflowY: "auto",
  backgroundColor: "#07070a",
  boxSizing: "border-box",
  padding: "72px 24px 120px",
};

const shellStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: "1180px",
  margin: "0 auto",
  display: "grid",
  gap: "20px",
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "18px",
  flexWrap: "wrap",
  padding: "28px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(15,23,42,0.82))",
  border: "1px solid rgba(192,132,252,0.22)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const cardStyle: React.CSSProperties = {
  borderRadius: "24px",
  background: "rgba(16,16,24,0.84)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(14px)",
  padding: "28px",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#c4b5fd",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "10px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  color: "white",
};

const subtitleStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#b8b8c5",
  lineHeight: 1.7,
};

const pointsPanelStyle: React.CSSProperties = {
  minWidth: "220px",
  padding: "16px 18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  display: "grid",
  gap: "6px",
};

const pointsLabelStyle: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "13px",
};

const pointsValueStyle: React.CSSProperties = {
  color: "#facc15",
  fontSize: "30px",
  lineHeight: 1,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
};

const checkInButtonStyle: React.CSSProperties = {
  minHeight: "44px",
  border: "none",
  borderRadius: "14px",
  padding: "0 20px",
  background: "linear-gradient(135deg, #facc15, #f59e0b)",
  color: "#111827",
  fontWeight: 900,
};

const attendanceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(250px, 0.72fr) minmax(0, 1.28fr)",
  gap: "20px",
};

const attendanceStatsStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  alignContent: "start",
};

const infoTileStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.07)",
  display: "grid",
  gap: "8px",
};

const infoTileLabelStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
};

const infoTileValueStyle: React.CSSProperties = {
  fontSize: "24px",
  lineHeight: 1.1,
};

const awardBreakdownStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(250,204,21,0.09)",
  border: "1px solid rgba(250,204,21,0.18)",
  color: "#fde68a",
  display: "grid",
  gap: "6px",
  fontSize: "13px",
  lineHeight: 1.45,
};

const messageStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(74,222,128,0.22)",
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: 800,
};

const calendarShellStyle: React.CSSProperties = {
  minWidth: 0,
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
};

const calendarTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  marginBottom: "14px",
};

const monthButtonStyle: React.CSSProperties = {
  width: "38px",
  height: "38px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
};

const monthInputStyle: React.CSSProperties = {
  height: "38px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.22)",
  color: "white",
  colorScheme: "dark",
  padding: "0 12px",
  outline: "none",
};

const weekdayGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "8px",
};

const weekdayStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#a1a1aa",
  fontSize: "12px",
  fontWeight: 800,
};

const calendarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "8px",
};

const dayCellStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "74px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.045)",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const outsideDayCellStyle: React.CSSProperties = {
  opacity: 0.32,
};

const checkedDayCellStyle: React.CSSProperties = {
  background: "rgba(250,204,21,0.1)",
  border: "1px solid rgba(250,204,21,0.32)",
};

const todayCellStyle: React.CSSProperties = {
  boxShadow: "inset 0 0 0 1px rgba(196,181,253,0.75)",
};

const dayNumberStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  left: "10px",
  color: "#e5e7eb",
  fontSize: "13px",
  fontWeight: 800,
};

const stampStyle: React.CSSProperties = {
  position: "absolute",
  top: "52%",
  left: "50%",
  transform: "translate(-50%, -50%) rotate(-9deg)",
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  border: "3px solid rgba(248,113,113,0.95)",
  color: "#fecaca",
  display: "grid",
  placeItems: "center",
  fontSize: "12px",
  fontWeight: 900,
  boxShadow: "0 0 18px rgba(248,113,113,0.28)",
};

const stampStyleActive: React.CSSProperties = {
  ...stampStyle,
  animation: "attendanceStamp 700ms cubic-bezier(.2,.9,.2,1.1)",
};

const smallBadgeStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(124,58,237,0.2)",
  border: "1px solid rgba(192,132,252,0.3)",
  color: "#f5d0fe",
  fontSize: "14px",
  fontWeight: 700,
};
