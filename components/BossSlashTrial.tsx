"use client";

import { useEffect, useState } from "react";

type Attempt = {
  wave: number;
  direction: "left" | "right";
  reactionMs: number;
  success: boolean;
  label: string;
};

type BossGamePayload = {
  wave: number;
  totalWaves: number;
  requiredSuccesses: number;
  successes: number;
  combo: number;
  bestCombo: number;
  attempts: Attempt[];
  gameFinished: boolean;
  gameActive: boolean;
  currentEnemy: { direction: "left" | "right" } | null;
  timeLimitMs: number;
};

type BossSlashTrialProps = {
  initialPoints: number;
  onPointsChange?: (points: number) => void;
};

export default function BossSlashTrial({ initialPoints, onPointsChange }: BossSlashTrialProps) {
  const [wave, setWave] = useState(1);
  const [totalWaves, setTotalWaves] = useState(12);
  const [requiredSuccesses, setRequiredSuccesses] = useState(8);
  const [successes, setSuccesses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [enemyDirection, setEnemyDirection] = useState<"left" | "right">("left");
  const [enemyTimeLimit, setEnemyTimeLimit] = useState(950);
  const [enemyProgress, setEnemyProgress] = useState(0);
  const [rewardClaimedDate, setRewardClaimedDate] = useState("");
  const [rewardClaimedToday, setRewardClaimedToday] = useState(false);
  const [mirPoints, setMirPoints] = useState(initialPoints);
  const [bossMessage, setBossMessage] = useState(
    "点击“开始挑战”进入斩妖试炼。怪物会从左右两侧突进，方向正确时立即挥刀。"
  );
  const [slashEffect, setSlashEffect] = useState<"" | "left" | "right">("");
  const [impactFlash, setImpactFlash] = useState<"success" | "fail" | "">("");
  const [isSubmittingStrike, setIsSubmittingStrike] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);

  useEffect(() => {
    setMirPoints(initialPoints);
  }, [initialPoints]);

  useEffect(() => {
    async function fetchBossStatus() {
      try {
        const response = await fetch("/api/minigame/boss-last-hit/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        setMirPoints(payload.points ?? initialPoints);
        setRewardClaimedDate(payload.rewardClaimedDate ?? "");
        setRewardClaimedToday(Boolean(payload.rewardClaimedToday));
        onPointsChange?.(payload.points ?? initialPoints);

        if (payload.game) {
          syncGameStateFromApi(payload.game);
        }
      } catch (error) {
        console.error(error);
      }
    }

    fetchBossStatus();
  }, [initialPoints, onPointsChange]);

  useEffect(() => {
    if (!gameActive || gameFinished) {
      return;
    }

    const startedAt = window.performance.now();
    const timer = window.setInterval(() => {
      const elapsed = window.performance.now() - startedAt;
      const progress = Math.min(1, elapsed / enemyTimeLimit);
      setEnemyProgress(progress);

      if (progress >= 1) {
        window.clearInterval(timer);
        void submitStrike(enemyDirection);
      }
    }, 16);

    return () => {
      window.clearInterval(timer);
    };
  }, [enemyDirection, enemyTimeLimit, gameActive, gameFinished]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!gameActive || isSubmittingStrike) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "a" || key === "arrowleft") {
        setSlashEffect("left");
        void submitStrike("left");
      }
      if (key === "d" || key === "arrowright") {
        setSlashEffect("right");
        void submitStrike("right");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameActive, isSubmittingStrike]);

  const dailyRewardClaimed = rewardClaimedToday;
  const missionCleared = gameFinished && successes >= requiredSuccesses;

  async function startBossLastHitGame() {
    try {
      setIsStartingGame(true);
      const response = await fetch("/api/minigame/boss-last-hit/start", {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok) {
        setBossMessage(payload.message ?? "挑战开始失败，请稍后重试。");
        return;
      }

      syncGameStateFromApi(payload.game);
      setBossMessage("怪物已经出现，观察左右方向并立刻挥刀。支持键盘 A / D 或方向键。");
    } catch (error) {
      console.error(error);
      setBossMessage("挑战开始失败，请稍后重试。");
    } finally {
      setIsStartingGame(false);
    }
  }

  function handleStrike(direction: "left" | "right") {
    if (!gameActive) {
      return;
    }

    setSlashEffect(direction);
    void submitStrike(direction);
  }

  async function submitStrike(direction: "left" | "right") {
    if (isSubmittingStrike) {
      return;
    }

    try {
      setIsSubmittingStrike(true);
      setGameActive(false);
      setEnemyProgress(1);

      const response = await fetch("/api/minigame/boss-last-hit/strike", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setBossMessage(payload.message ?? "本次出手未能完成判定，请重新开始。");
        return;
      }

      syncGameStateFromApi(payload.game);

      const latestAttempt = payload.game?.attempts?.[payload.game.attempts.length - 1];
      setImpactFlash(latestAttempt?.success ? "success" : "fail");
      window.setTimeout(() => setImpactFlash(""), 220);
      window.setTimeout(() => setSlashEffect(""), 220);

      if (payload.game?.gameFinished) {
        setBossMessage(
          payload.game.successes >= payload.game.requiredSuccesses
            ? "挑战成功。你已达成今日目标，可以立即领取 50 米尔积分。"
            : "本次挑战未达成今日目标。再试一次，抓住怪物突进方向并及时挥刀。"
        );
      } else {
        setBossMessage(
          latestAttempt?.success
            ? `第 ${latestAttempt.wave} 波斩杀成功，准备迎接下一只怪物。`
            : `第 ${latestAttempt.wave} 波 ${latestAttempt?.label ?? "判定失败"}，下一只怪物正在逼近。`
        );
      }
    } catch (error) {
      console.error(error);
      setBossMessage("本次出手未能完成判定，请重新开始。");
    } finally {
      setIsSubmittingStrike(false);
    }
  }

  async function claimDailyReward() {
    if (!missionCleared || dailyRewardClaimed) {
      return;
    }

    try {
      setIsClaimingReward(true);
      const response = await fetch("/api/minigame/boss-last-hit/claim", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        setBossMessage(payload.message ?? "奖励领取失败，请稍后再试。");
        return;
      }

      setRewardClaimedDate(payload.rewardClaimedDate ?? rewardClaimedDate);
      setRewardClaimedToday(Boolean(payload.rewardClaimedToday));
      setMirPoints(payload.points ?? mirPoints);
      onPointsChange?.(payload.points ?? mirPoints);
      if (payload.game) {
        syncGameStateFromApi(payload.game);
      }
      setBossMessage(`奖励领取成功，已到账 ${payload.awardedPoints ?? 50} 米尔积分。`);
    } catch (error) {
      console.error(error);
      setBossMessage("奖励领取失败，请稍后再试。");
    } finally {
      setIsClaimingReward(false);
    }
  }

  function syncGameStateFromApi(game: BossGamePayload | null) {
    if (!game) {
      return;
    }

    setWave(game.wave);
    setTotalWaves(game.totalWaves);
    setRequiredSuccesses(game.requiredSuccesses);
    setSuccesses(game.successes);
    setCombo(game.combo);
    setBestCombo(game.bestCombo);
    setAttempts(game.attempts);
    setGameFinished(game.gameFinished);
    setGameActive(game.gameActive);
    setEnemyDirection(game.currentEnemy?.direction ?? "left");
    setEnemyTimeLimit(game.timeLimitMs || 950);
    setEnemyProgress(0);
  }

  return (
    <section style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Daily Trial</div>
          <h2 style={titleStyle}>斩妖试炼</h2>
          <p style={subtitleStyle}>
            怪物会从左右两侧突然突进，在正确方向及时挥刀即可完成斩杀。每日完成 {totalWaves} 波中的{" "}
            {requiredSuccesses} 次成功斩杀，即可领取今日 50 米尔积分。
          </p>
        </div>
        <div style={headerMetaStyle}>
          <div style={headerMetaValueStyle}>+50</div>
          <div style={headerMetaLabelStyle}>今日奖励 / 米尔积分</div>
        </div>
      </div>

      <div style={contentGridStyle}>
        <div style={primaryCardStyle}>
          <div style={statsGridStyle}>
            <StatCard label="当前波次" value={`${wave}/${totalWaves}`} accent="#f8fafc" />
            <StatCard label="成功次数" value={`${successes}`} accent="#fdba74" />
            <StatCard label="今日目标" value={`${requiredSuccesses}`} accent="#fef08a" />
            <StatCard label="当前连斩" value={`${combo}`} accent="#fca5a5" />
          </div>

          <div
            style={{
              ...arenaStyle,
              boxShadow:
                impactFlash === "success"
                  ? "0 0 0 2px rgba(250,204,21,0.28) inset, 0 0 38px rgba(250,204,21,0.25)"
                  : impactFlash === "fail"
                    ? "0 0 0 2px rgba(239,68,68,0.24) inset, 0 0 32px rgba(239,68,68,0.2)"
                    : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  impactFlash === "success"
                    ? "radial-gradient(circle, rgba(250,204,21,0.2), rgba(250,204,21,0))"
                    : impactFlash === "fail"
                      ? "radial-gradient(circle, rgba(239,68,68,0.18), rgba(239,68,68,0))"
                      : "transparent",
                pointerEvents: "none",
              }}
            />

            <div style={arenaCenterLineStyle} />

            <div style={arenaTopLeftLabelStyle}>
              {gameActive ? "Enemy incoming" : gameFinished ? "Trial ended" : "Ready"}
            </div>

            <div style={arenaTopRightLabelStyle}>
              {gameActive ? `${Math.max(0, Math.ceil((1 - enemyProgress) * enemyTimeLimit))} ms` : "A / D"}
            </div>

            <div
              style={{
                position: "absolute",
                top: "50%",
                left: slashEffect === "left" ? "30%" : slashEffect === "right" ? "70%" : "50%",
                width: slashEffect ? "140px" : "0px",
                height: "5px",
                borderRadius: "999px",
                background:
                  slashEffect === "left"
                    ? "linear-gradient(90deg, rgba(255,255,255,0), rgba(248,113,113,0.95), rgba(255,255,255,0))"
                    : "linear-gradient(90deg, rgba(255,255,255,0), rgba(251,146,60,0.95), rgba(255,255,255,0))",
                transform:
                  slashEffect === "left"
                    ? "translate(-50%, -50%) rotate(-30deg)"
                    : slashEffect === "right"
                      ? "translate(-50%, -50%) rotate(30deg)"
                      : "translate(-50%, -50%) rotate(0deg)",
                opacity: slashEffect ? 1 : 0,
                boxShadow: slashEffect ? "0 0 18px rgba(255,255,255,0.35)" : "none",
                transition: "all 140ms ease",
                pointerEvents: "none",
              }}
            />

            <div style={arenaCoreStyle} />

            <div
              style={{
                ...enemyStyle,
                [enemyDirection === "left" ? "left" : "right"]: `calc(${(1 - enemyProgress) * 78}% - 40px)`,
                background:
                  enemyDirection === "left"
                    ? "linear-gradient(135deg, #ef4444, #7f1d1d)"
                    : "linear-gradient(135deg, #f97316, #9a3412)",
                boxShadow: gameActive
                  ? combo >= 3
                    ? "0 0 34px rgba(250,204,21,0.32)"
                    : "0 0 28px rgba(248,113,113,0.35)"
                  : "none",
                transition: gameActive ? "none" : "all 180ms ease",
              }}
            >
              {enemyDirection === "left" ? "妖" : "魔"}
            </div>
          </div>

          <div style={controlsStyle}>
            <button
              type="button"
              onClick={startBossLastHitGame}
              disabled={gameActive || isStartingGame}
              style={{
                ...actionButtonStyle,
                background: "linear-gradient(135deg, #6d28d9, #7c3aed)",
                opacity: gameActive || isStartingGame ? 0.45 : 1,
                cursor: gameActive || isStartingGame ? "not-allowed" : "pointer",
              }}
            >
              {isStartingGame ? "正在开始..." : attempts.length === 0 && !gameFinished ? "开始挑战" : "重新开始"}
            </button>

            <button
              type="button"
              onClick={() => handleStrike("left")}
              disabled={!gameActive || isSubmittingStrike}
              style={{
                ...actionButtonStyle,
                background:
                  enemyDirection === "left"
                    ? "linear-gradient(135deg, #db2777, #ef4444)"
                    : "linear-gradient(135deg, #7c2d12, #c2410c)",
                opacity: gameActive && !isSubmittingStrike ? 1 : 0.45,
                cursor: gameActive && !isSubmittingStrike ? "pointer" : "not-allowed",
              }}
            >
              {isSubmittingStrike ? "判定中..." : "← 左斩"}
            </button>

            <button
              type="button"
              onClick={() => handleStrike("right")}
              disabled={!gameActive || isSubmittingStrike}
              style={{
                ...actionButtonStyle,
                background:
                  enemyDirection === "right"
                    ? "linear-gradient(135deg, #ea580c, #fb923c)"
                    : "linear-gradient(135deg, #9a3412, #c2410c)",
                opacity: gameActive && !isSubmittingStrike ? 1 : 0.45,
                cursor: gameActive && !isSubmittingStrike ? "pointer" : "not-allowed",
              }}
            >
              {isSubmittingStrike ? "判定中..." : "右斩 →"}
            </button>
          </div>

          <div style={messageBoxStyle}>{bossMessage}</div>
        </div>

        <div style={sideGridStyle}>
          <div style={sideCardStyle}>
            <div style={cardEyebrowStyle}>今日奖励</div>
            <div style={rewardValueStyle}>+50</div>
            <div style={rewardLabelStyle}>米尔积分</div>
            <div style={metaTextStyle}>当前账户积分: {mirPoints.toLocaleString()}</div>
            <div style={metaTextStyle}>最佳连斩: {bestCombo}</div>

            <button
              type="button"
              onClick={claimDailyReward}
              disabled={!missionCleared || dailyRewardClaimed || isClaimingReward}
              style={{
                ...actionButtonStyle,
                width: "100%",
                marginTop: "18px",
                background:
                  missionCleared && !dailyRewardClaimed && !isClaimingReward
                    ? "linear-gradient(135deg, #ca8a04, #f59e0b)"
                    : "linear-gradient(135deg, #475569, #64748b)",
                cursor:
                  missionCleared && !dailyRewardClaimed && !isClaimingReward ? "pointer" : "not-allowed",
                opacity: missionCleared && !dailyRewardClaimed && !isClaimingReward ? 1 : 0.6,
              }}
            >
              {dailyRewardClaimed ? "今日已领取" : isClaimingReward ? "发放中..." : "领取奖励"}
            </button>
          </div>

          <div style={sideCardStyle}>
            <h3 style={sideCardTitleStyle}>战报记录</h3>
            <div style={battleLogStyle}>
              {attempts.length === 0 ? (
                <div style={emptyTextStyle}>挑战开始后，这里会记录每一波怪物的方向、反应时间与判定结果。</div>
              ) : (
                attempts.map((attempt) => (
                  <div
                    key={`${attempt.wave}-${attempt.direction}-${attempt.reactionMs}-${attempt.label}`}
                    style={{
                      ...battleRowStyle,
                      background: attempt.success ? "rgba(250,204,21,0.08)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div style={{ color: "#c4b5fd" }}>第 {attempt.wave} 波</div>
                    <div style={{ color: "#e2e8f0" }}>
                      {attempt.direction === "left" ? "左侧来袭" : "右侧来袭"} · {attempt.reactionMs}ms · {attempt.label}
                    </div>
                    <div style={{ color: attempt.success ? "#fde68a" : "#cbd5e1", fontWeight: 700 }}>
                      {attempt.success ? "成功" : "失败"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={sideCardStyle}>
            <h3 style={sideCardTitleStyle}>规则说明</h3>
            <div style={rulesStyle}>
              <div>1. 每日挑战包含 {totalWaves} 波怪物突进，每波只有一次正确挥刀机会。</div>
              <div>2. 怪物从左侧出现就按左斩，从右侧出现就按右斩，超时或方向错误都算失败。</div>
              <div>3. {totalWaves} 波内成功 {requiredSuccesses} 次即可达成当日目标并领取 50 米尔积分。</div>
              <div>4. 支持键盘 `A / D` 与方向键，适合桌面端快速连续输入。</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={{ ...statValueStyle, color: accent }}>{value}</div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  borderRadius: "28px",
  padding: "28px",
  background: "rgba(10,14,24,0.8)",
  border: "1px solid rgba(148,163,184,0.16)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
  backdropFilter: "blur(16px)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "flex-start",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "7px 12px",
  borderRadius: "999px",
  background: "rgba(244,114,182,0.12)",
  border: "1px solid rgba(244,114,182,0.22)",
  color: "#f9a8d4",
  fontSize: "12px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "16px 0 10px",
  fontSize: "clamp(30px, 4vw, 42px)",
  lineHeight: 1.06,
  letterSpacing: "-0.03em",
  fontWeight: 800,
  background: "linear-gradient(90deg, #ffffff, #f5d0fe 55%, #c084fc)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: 1.8,
  maxWidth: "700px",
};

const headerMetaStyle: React.CSSProperties = {
  minWidth: "180px",
  borderRadius: "22px",
  padding: "18px 20px",
  background: "linear-gradient(180deg, rgba(124,58,237,0.18), rgba(14,22,38,0.68))",
  border: "1px solid rgba(196,181,253,0.22)",
};

const headerMetaValueStyle: React.CSSProperties = {
  fontSize: "38px",
  fontWeight: 900,
  color: "#fde68a",
};

const headerMetaLabelStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: 1.5,
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1.05fr) minmax(300px, 0.95fr)",
  gap: "24px",
};

const primaryCardStyle: React.CSSProperties = {
  borderRadius: "24px",
  padding: "22px",
  background: "linear-gradient(180deg, rgba(18,18,34,0.9), rgba(10,12,22,0.92))",
  border: "1px solid rgba(192,132,252,0.14)",
  display: "grid",
  gap: "18px",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
};

const statCardStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "16px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const statLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "12px",
  letterSpacing: "0.08em",
};

const statValueStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "32px",
  fontWeight: 800,
};

const arenaStyle: React.CSSProperties = {
  position: "relative",
  height: "260px",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "radial-gradient(circle at center, rgba(91,33,182,0.2) 0%, rgba(17,24,39,0.82) 58%, rgba(10,10,10,0.95) 100%)",
};

const arenaCenterLineStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: 0,
  bottom: 0,
  width: "2px",
  background: "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.25), rgba(255,255,255,0))",
  transform: "translateX(-50%)",
};

const arenaTopLeftLabelStyle: React.CSSProperties = {
  position: "absolute",
  top: "20px",
  left: "24px",
  color: "#e9d5ff",
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const arenaTopRightLabelStyle: React.CSSProperties = {
  position: "absolute",
  top: "20px",
  right: "24px",
  color: "#fde68a",
  fontSize: "12px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const arenaCoreStyle: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  bottom: "24px",
  transform: "translateX(-50%)",
  width: "92px",
  height: "92px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "radial-gradient(circle, rgba(196,181,253,0.2), rgba(76,29,149,0.28))",
  boxShadow: "0 0 40px rgba(168,85,247,0.18)",
};

const enemyStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "84px",
  height: "84px",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const actionButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "14px",
  padding: "14px 20px",
  color: "white",
  fontSize: "15px",
  fontWeight: 700,
};

const messageBoxStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "16px 18px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  color: "#e7e5e4",
  lineHeight: 1.7,
};

const sideGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "20px",
};

const sideCardStyle: React.CSSProperties = {
  borderRadius: "24px",
  padding: "22px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
};

const cardEyebrowStyle: React.CSSProperties = {
  color: "#f9a8d4",
  fontSize: "12px",
  letterSpacing: "0.08em",
};

const rewardValueStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "42px",
  fontWeight: 900,
  color: "#fde68a",
};

const rewardLabelStyle: React.CSSProperties = {
  color: "#f8fafc",
  marginTop: "4px",
};

const metaTextStyle: React.CSSProperties = {
  marginTop: "12px",
  color: "#cbd5e1",
  fontSize: "14px",
};

const sideCardTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "16px",
  fontSize: "22px",
};

const battleLogStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const emptyTextStyle: React.CSSProperties = {
  color: "#94a3b8",
  lineHeight: 1.7,
};

const battleRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "90px 1fr auto",
  gap: "12px",
  alignItems: "center",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.08)",
};

const rulesStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  color: "#d6d3d1",
  lineHeight: 1.7,
};
