"use client";

import { useEffect, useMemo, useState } from "react";
import BossSlashTrial from "@/components/BossSlashTrial";
import type { AttendanceAward, AttendanceSummary } from "@/lib/attendance";
import type { PartnerPointTransaction } from "@/lib/partnerProfile";

type PointsActivityContentProps = {
  initialPoints: number;
  initialSummary: AttendanceSummary;
};

type AttendanceResponse = {
  message?: string;
  code?: string;
  points?: number;
  award?: AttendanceAward;
  summary?: AttendanceSummary;
};

type AttendanceAction = "checkin" | "makeup";

export default function PointsActivityContent({
  initialPoints,
  initialSummary,
}: PointsActivityContentProps) {
  const [points, setPoints] = useState(initialPoints);
  const [attendance, setAttendance] = useState(initialSummary);
  const [selectedMonth, setSelectedMonth] = useState(initialSummary.monthKey);
  const [checkingIn, setCheckingIn] = useState(false);
  const [makeupDate, setMakeupDate] = useState("");
  const [pendingMakeupDate, setPendingMakeupDate] = useState("");
  const [stampDate, setStampDate] = useState("");
  const [message, setMessage] = useState("");
  const [lastAward, setLastAward] = useState<AttendanceAward | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const availableMakeupSet = useMemo(
    () => new Set(attendance.availableMakeupDates),
    [attendance.availableMakeupDates]
  );
  const makeupSet = useMemo(
    () => new Set(attendance.makeupDates),
    [attendance.makeupDates]
  );
  const calendar = useMemo(
    () => buildCalendar(selectedMonth, attendance.checkedDates, availableMakeupSet, makeupSet),
    [availableMakeupSet, attendance.checkedDates, makeupSet, selectedMonth]
  );

  useEffect(() => {
    let cancelled = false;

    async function syncQuickSdk() {
      setSyncing(true);
      try {
        const response = await fetch("/api/account/sync-quicksdk", { method: "POST" });
        const payload = (await response.json().catch(() => null)) as {
          status?: "synced" | "skipped";
          profile?: { points: number };
          attendance?: AttendanceSummary;
          message?: string;
        } | null;

        if (cancelled) return;

        if (!response.ok || !payload) {
          setSyncMessage(payload?.message ?? "同步失败，当前显示最近一次数据。");
          return;
        }

        if (typeof payload.profile?.points === "number") {
          setPoints(payload.profile.points);
        }
        if (payload.attendance) {
          setAttendance(payload.attendance);
          setSelectedMonth(payload.attendance.monthKey);
        }
        setSyncMessage(payload.status === "skipped" ? "已显示最新同步数据。" : "同步完成。");
      } catch {
        if (!cancelled) {
          setSyncMessage("同步失败，当前显示最近一次数据。");
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    void syncQuickSdk();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitAttendance(type: AttendanceAction, date?: string) {
    if (type === "makeup" && !date) return;

    setCheckingIn(type === "checkin");
    setMakeupDate(type === "makeup" ? date ?? "" : "");
    setPendingMakeupDate("");
    setMessage("");
    setLastAward(null);

    try {
      const response = await fetch("/api/points/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date }),
      });
      const payload = (await response.json().catch(() => null)) as AttendanceResponse | null;

      if (!response.ok) {
        if (payload?.summary) setAttendance(payload.summary);
        setMessage(payload?.message ?? "签到处理失败。");
        return;
      }

      if (payload?.summary) {
        setAttendance(payload.summary);
        setSelectedMonth(payload.summary.monthKey);
        setStampDate(payload.award?.date ?? payload.summary.today);
        window.setTimeout(() => setStampDate(""), 780);
      }
      if (typeof payload?.points === "number") {
        setPoints(payload.points);
      }
      if (payload?.award) {
        setLastAward(payload.award);
        const verb = payload.award.type === "makeup" ? "补签完成" : "签到完成";
        const amount = payload.award.totalAwarded;
        setMessage(`${verb}，积分${amount >= 0 ? "获得" : "消耗"} ${Math.abs(amount).toLocaleString()}。`);
      }
    } catch {
      setMessage("当前无法连接签到服务。");
    } finally {
      setCheckingIn(false);
      setMakeupDate("");
    }
  }

  function requestMakeup(date: string) {
    if (makeupDate) return;
    setPendingMakeupDate(date);
  }

  function closeMakeupDialog() {
    if (makeupDate) return;
    setPendingMakeupDate("");
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
              每月签到独立统计。连续签到 7 天可获得追加奖励，连续 25 天可获得月度大奖。
            </p>
            <div style={syncStatusStyle(syncing)}>
              {syncing ? "同步中..." : syncMessage || "已加载最近一次数据。"}
            </div>
          </div>
          <div style={pointsPanelStyle}>
            <span style={pointsLabelStyle}>当前 MIR 积分</span>
            <strong style={pointsValueStyle}>{points.toLocaleString()}</strong>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Daily Check-in</div>
              <h2 style={sectionTitleStyle}>每日签到</h2>
            </div>
            <button
              type="button"
              onClick={() => void submitAttendance("checkin")}
              disabled={checkingIn || attendance.checkedToday}
              style={{
                ...checkInButtonStyle,
                opacity: checkingIn || attendance.checkedToday ? 0.52 : 1,
                cursor: checkingIn || attendance.checkedToday ? "not-allowed" : "pointer",
              }}
            >
              {attendance.checkedToday ? "今日已签到" : checkingIn ? "签到中..." : "立即签到"}
            </button>
          </div>

          <div style={attendanceGridStyle}>
            <div style={attendanceStatsStyle}>
              <InfoTile label="本月签到" value={`${attendance.monthlyCheckedCount.toLocaleString()} 天`} accent="#facc15" />
              <InfoTile label="当前连续" value={`${attendance.currentStreak.toLocaleString()} 天`} accent="#86efac" />
              <InfoTile label="7日奖励" value={attendance.nextSevenBonusIn === 0 ? "已达成" : `${attendance.nextSevenBonusIn} 天后`} accent="#c4b5fd" />
              <InfoTile label="25日奖励" value={attendance.nextTwentyFiveBonusIn === 0 ? "已达成" : `${attendance.nextTwentyFiveBonusIn} 天后`} accent="#fca5a5" />

              <div style={awardBreakdownStyle}>
                <strong>签到规则</strong>
                <span>每日签到 +100 MIR 积分</span>
                <span>本月连续 7 天 +1000 MIR 积分</span>
                <span>本月连续 25 天 +5000 MIR 积分</span>
                <span>补签消耗 200 MIR 积分，可补齐连续签到</span>
              </div>

              {lastAward ? (
                <div style={awardBreakdownStyle}>
                  <strong>本次变动</strong>
                  {lastAward.basePoints > 0 ? <span>每日签到 +{lastAward.basePoints}</span> : null}
                  {lastAward.makeupCost > 0 ? <span>补签消耗 -{lastAward.makeupCost}</span> : null}
                  {lastAward.sevenDayBonus > 0 ? <span>连续 7 天奖励 +{lastAward.sevenDayBonus}</span> : null}
                  {lastAward.twentyFiveDayBonus > 0 ? <span>连续 25 天奖励 +{lastAward.twentyFiveDayBonus}</span> : null}
                </div>
              ) : null}
              {message ? <div style={messageStyle}>{message}</div> : null}
            </div>

            <div style={calendarShellStyle}>
              <div style={calendarTopStyle}>
                <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))} style={monthButtonStyle} aria-label="上个月">
                  ‹
                </button>
                <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={monthInputStyle} />
                <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))} style={monthButtonStyle} aria-label="下个月">
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
                      ...(day.makeup ? makeupDayCellStyle : null),
                      ...(day.date === attendance.today ? todayCellStyle : null),
                    }}
                  >
                    <span style={dayNumberStyle}>{day.day}</span>
                    {day.checked ? (
                      <span style={day.date === stampDate ? stampStyleActive : stampStyle}>
                        {day.makeup ? "补签" : "签到"}
                      </span>
                    ) : day.canMakeup ? (
                      <button
                        type="button"
                        onClick={() => requestMakeup(day.date)}
                        disabled={Boolean(makeupDate) || Boolean(pendingMakeupDate)}
                        style={makeupButtonStyle}
                      >
                        {makeupDate === day.date ? "补签中" : "补签"}
                      </button>
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

      {pendingMakeupDate ? (
        <div style={modalOverlayStyle} role="presentation" onClick={closeMakeupDialog}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="makeup-dialog-title"
            style={modalDialogStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={modalIconStyle}>签</div>
            <div>
              <h3 id="makeup-dialog-title" style={modalTitleStyle}>确认补签</h3>
              <p style={modalTextStyle}>
                补签 {pendingMakeupDate} 将消耗 200 MIR 积分。确定要补签吗？
              </p>
            </div>
            <div style={modalActionsStyle}>
              <button type="button" onClick={closeMakeupDialog} style={modalCancelButtonStyle}>
                取消
              </button>
              <button
                type="button"
                onClick={() => void submitAttendance("makeup", pendingMakeupDate)}
                style={modalConfirmButtonStyle}
              >
                确认补签
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

function buildCalendar(monthKey: string, checkedDates: string[], makeupDates: Set<string>, makeupSet: Set<string>) {
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
      canMakeup: makeupDates.has(key),
      makeup: makeupSet.has(key),
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

const syncStatusStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "30px",
  marginTop: "14px",
  padding: "0 12px",
  borderRadius: "999px",
  background: active ? "rgba(59,130,246,0.14)" : "rgba(255,255,255,0.05)",
  border: active ? "1px solid rgba(96,165,250,0.28)" : "1px solid rgba(255,255,255,0.08)",
  color: active ? "#bfdbfe" : "#a1a1aa",
  fontSize: "12px",
  fontWeight: 800,
});

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
  minHeight: "78px",
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

const makeupDayCellStyle: React.CSSProperties = {
  background: "rgba(59,130,246,0.1)",
  border: "1px solid rgba(96,165,250,0.32)",
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

const makeupButtonStyle: React.CSSProperties = {
  position: "absolute",
  left: "8px",
  right: "8px",
  bottom: "8px",
  minHeight: "28px",
  border: "1px solid rgba(96,165,250,0.35)",
  borderRadius: "10px",
  background: "rgba(37,99,235,0.24)",
  color: "#dbeafe",
  fontSize: "11px",
  fontWeight: 900,
  cursor: "pointer",
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

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "rgba(3,7,18,0.62)",
  backdropFilter: "blur(8px)",
};

const modalDialogStyle: React.CSSProperties = {
  width: "min(420px, 100%)",
  borderRadius: "22px",
  border: "1px solid rgba(250,204,21,0.24)",
  background: "linear-gradient(145deg, rgba(24,24,32,0.98), rgba(12,12,18,0.98))",
  boxShadow: "0 26px 70px rgba(0,0,0,0.54)",
  padding: "26px",
  display: "grid",
  justifyItems: "center",
  gap: "16px",
  textAlign: "center",
};

const modalIconStyle: React.CSSProperties = {
  width: "58px",
  height: "58px",
  borderRadius: "50%",
  border: "3px solid rgba(248,113,113,0.95)",
  color: "#fecaca",
  display: "grid",
  placeItems: "center",
  fontSize: "20px",
  fontWeight: 900,
  transform: "rotate(-9deg)",
  boxShadow: "0 0 24px rgba(248,113,113,0.24)",
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "white",
  fontSize: "22px",
};

const modalTextStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: 1.7,
};

const modalActionsStyle: React.CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "4px",
};

const modalCancelButtonStyle: React.CSSProperties = {
  minHeight: "42px",
  borderRadius: "13px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.06)",
  color: "#e5e7eb",
  fontWeight: 900,
  cursor: "pointer",
};

const modalConfirmButtonStyle: React.CSSProperties = {
  minHeight: "42px",
  borderRadius: "13px",
  border: "none",
  background: "linear-gradient(135deg, #facc15, #f59e0b)",
  color: "#111827",
  fontWeight: 900,
  cursor: "pointer",
};
