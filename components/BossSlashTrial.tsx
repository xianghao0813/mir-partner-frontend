"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type RunnerRun = {
  score: number;
  distance: number;
  obstaclesCleared: number;
  durationMs: number;
  completedAt: number;
};

type BossGamePayload = {
  requiredScore: number;
  score: number;
  bestScore: number;
  distance: number;
  obstaclesCleared: number;
  durationMs: number;
  runs: RunnerRun[];
  gameFinished: boolean;
  gameActive: boolean;
  rewardClaimedDate: string;
};

type BossSlashTrialProps = {
  initialPoints: number;
  onPointsChange?: (points: number) => void;
};

type RunnerObstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  passed: boolean;
};

const TRACK_WIDTH = 520;
const TRACK_HEIGHT = 250;
const GROUND_HEIGHT = 44;
const PLAYER_LEFT = 86;
const PLAYER_WIDTH = 44;
const PLAYER_HEIGHT = 58;
const GRAVITY = 0.95;
const JUMP_FORCE = 15.5;
const START_SPEED = 6.2;
const MAX_SPEED = 12.4;
const TARGET_SCORE = 180;

export default function BossSlashTrial({ initialPoints, onPointsChange }: BossSlashTrialProps) {
  const [mirPoints, setMirPoints] = useState(initialPoints);
  const [requiredScore, setRequiredScore] = useState(TARGET_SCORE);
  const [bestScore, setBestScore] = useState(0);
  const [serverScore, setServerScore] = useState(0);
  const [serverDistance, setServerDistance] = useState(0);
  const [serverObstacles, setServerObstacles] = useState(0);
  const [serverDuration, setServerDuration] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [rewardClaimedToday, setRewardClaimedToday] = useState(false);
  const [rewardClaimedDate, setRewardClaimedDate] = useState("");
  const [runs, setRuns] = useState<RunnerRun[]>([]);
  const [statusMessage, setStatusMessage] = useState(
    "冲刺穿越遗迹，跳过障碍，达到目标分数后即可领取今日奖励。"
  );
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isSubmittingRun, setIsSubmittingRun] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);

  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [obstaclesCleared, setObstaclesCleared] = useState(0);
  const [speed, setSpeed] = useState(START_SPEED);
  const [playerY, setPlayerY] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [obstacles, setObstacles] = useState<RunnerObstacle[]>([]);

  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const startedAtRef = useRef(0);
  const velocityRef = useRef(0);
  const obstacleIdRef = useRef(0);
  const nextSpawnRef = useRef(900);
  const activeRef = useRef(false);
  const submittedRef = useRef(false);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const obstaclesRef = useRef(0);
  const speedRef = useRef(START_SPEED);
  const playerYRef = useRef(0);
  const obstacleStateRef = useRef<RunnerObstacle[]>([]);

  const missionCleared = gameFinished && serverScore >= requiredScore;

  useEffect(() => {
    setMirPoints(initialPoints);
  }, [initialPoints]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);

  useEffect(() => {
    obstaclesRef.current = obstaclesCleared;
  }, [obstaclesCleared]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    playerYRef.current = playerY;
  }, [playerY]);

  useEffect(() => {
    obstacleStateRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    void fetchRunnerStatus();
  }, [initialPoints, onPointsChange]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space" || event.code === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (!gameActive) {
          return;
        }
        jump();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameActive]);

  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, []);

  const progress = useMemo(() => Math.min(1, score / requiredScore), [requiredScore, score]);

  async function fetchRunnerStatus() {
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

  async function startRunner() {
    try {
      setIsStartingGame(true);

      const response = await fetch("/api/minigame/boss-last-hit/start", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
          setStatusMessage(payload.message ?? "无法开始挑战。");
        return;
      }

      syncGameStateFromApi(payload.game);
      resetLocalRun();
      beginLoop();
      setStatusMessage("挑战开始。按空格、W，或点击跳跃来越过障碍。");
    } catch (error) {
      console.error(error);
      setStatusMessage("无法开始挑战。");
    } finally {
      setIsStartingGame(false);
    }
  }

  function resetLocalRun() {
    stopLoop();
    activeRef.current = true;
    submittedRef.current = false;
    setGameActive(true);
    setGameFinished(false);
    setScore(0);
    setDistance(0);
    setObstaclesCleared(0);
    setSpeed(START_SPEED);
    setPlayerY(0);
    setIsJumping(false);
    setObstacles([]);
    velocityRef.current = 0;
    obstacleIdRef.current = 0;
    nextSpawnRef.current = 900;
    scoreRef.current = 0;
    distanceRef.current = 0;
    obstaclesRef.current = 0;
    speedRef.current = START_SPEED;
    playerYRef.current = 0;
    obstacleStateRef.current = [];
  }

  function beginLoop() {
    stopLoop();
    lastFrameRef.current = window.performance.now();
    startedAtRef.current = lastFrameRef.current;
    rafRef.current = window.requestAnimationFrame(loop);
  }

  function stopLoop() {
    activeRef.current = false;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function loop(timestamp: number) {
    const delta = Math.min(32, timestamp - lastFrameRef.current);
    lastFrameRef.current = timestamp;

    if (!activeRef.current) {
      return;
    }

    const nextDistance = distanceRef.current + speedRef.current * (delta / 16);
    const nextScore = Math.floor(nextDistance / 7) + obstaclesRef.current * 12;
    const nextSpeed = Math.min(MAX_SPEED, START_SPEED + nextDistance / 300);
    const playerVelocity = velocityRef.current - GRAVITY * (delta / 16);
    let nextPlayerY = Math.max(0, playerYRef.current + playerVelocity * (delta / 16));

    if (nextPlayerY <= 0) {
      nextPlayerY = 0;
      velocityRef.current = 0;
      if (playerYRef.current > 0) {
        setIsJumping(false);
      }
    } else {
      velocityRef.current = playerVelocity;
    }

    nextSpawnRef.current -= delta;
    let nextObstacles = obstacleStateRef.current.map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - nextSpeed * (delta / 16),
    }));

    if (nextSpawnRef.current <= 0) {
      nextObstacles.push(createObstacle());
      nextSpawnRef.current = 760 + Math.random() * 520 - nextDistance / 8;
    }

    let nextCleared = obstaclesRef.current;
    nextObstacles = nextObstacles
      .map((obstacle) => {
        if (!obstacle.passed && obstacle.x + obstacle.width < PLAYER_LEFT) {
          nextCleared += 1;
          return {
            ...obstacle,
            passed: true,
          };
        }

        return obstacle;
      })
      .filter((obstacle) => obstacle.x + obstacle.width > -80);

    const collided = nextObstacles.some((obstacle) => {
      const overlapX =
        obstacle.x < PLAYER_LEFT + PLAYER_WIDTH && obstacle.x + obstacle.width > PLAYER_LEFT + 4;
      const playerBottom = nextPlayerY + PLAYER_HEIGHT;
      const obstacleTop = obstacle.height;
      return overlapX && playerBottom > obstacleTop - 6;
    });

    setDistance(nextDistance);
    setScore(nextScore);
    setSpeed(nextSpeed);
    setPlayerY(nextPlayerY);
    setObstaclesCleared(nextCleared);
    setObstacles(nextObstacles);

    scoreRef.current = nextScore;
    distanceRef.current = nextDistance;
    obstaclesRef.current = nextCleared;
    speedRef.current = nextSpeed;
    playerYRef.current = nextPlayerY;
    obstacleStateRef.current = nextObstacles;

    if (collided) {
      stopLoop();
      setGameActive(false);
      setGameFinished(true);
      setStatusMessage(
        nextScore >= requiredScore
          ? "挑战完成，已达到目标分数，现在可以领取今日奖励。"
          : "挑战结束，距离今日目标分数还差一点。"
      );
      void submitRunResult({
        score: nextScore,
        distance: nextDistance,
        obstaclesCleared: nextCleared,
        durationMs: Math.max(0, Math.floor(timestamp - startedAtRef.current)),
      });
      return;
    }

    rafRef.current = window.requestAnimationFrame(loop);
  }

  function createObstacle(): RunnerObstacle {
    obstacleIdRef.current += 1;

    return {
      id: obstacleIdRef.current,
      x: TRACK_WIDTH + 12,
      width: 22 + Math.random() * 26,
      height: 28 + Math.random() * 38,
      passed: false,
    };
  }

  function jump() {
    if (!activeRef.current || playerYRef.current > 0) {
      return;
    }

    velocityRef.current = JUMP_FORCE;
    setIsJumping(true);
  }

  async function submitRunResult(result: {
    score: number;
    distance: number;
    obstaclesCleared: number;
    durationMs: number;
  }) {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    try {
      setIsSubmittingRun(true);
      const response = await fetch("/api/minigame/boss-last-hit/strike", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(payload.message ?? "无法保存本次成绩。");
        return;
      }

      syncGameStateFromApi(payload.game);
    } catch (error) {
      console.error(error);
      setStatusMessage("无法保存本次成绩。");
    } finally {
      setIsSubmittingRun(false);
    }
  }

  async function claimDailyReward() {
    if (!missionCleared || rewardClaimedToday) {
      return;
    }

    try {
      setIsClaimingReward(true);
      const response = await fetch("/api/minigame/boss-last-hit/claim", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(payload.message ?? "无法领取奖励。");
        return;
      }

      setRewardClaimedDate(payload.rewardClaimedDate ?? rewardClaimedDate);
      setRewardClaimedToday(Boolean(payload.rewardClaimedToday));
      setMirPoints(payload.points ?? mirPoints);
      onPointsChange?.(payload.points ?? mirPoints);
      if (payload.game) {
        syncGameStateFromApi(payload.game);
      }
      setStatusMessage(`奖励已领取，已增加 ${payload.awardedPoints ?? 50} 点 MIR 积分。`);
    } catch (error) {
      console.error(error);
      setStatusMessage("无法领取奖励。");
    } finally {
      setIsClaimingReward(false);
    }
  }

  function syncGameStateFromApi(game: BossGamePayload | null) {
    if (!game) {
      return;
    }

    setRequiredScore(game.requiredScore);
    setServerScore(game.score);
    setBestScore(game.bestScore);
    setServerDistance(game.distance);
    setServerObstacles(game.obstaclesCleared);
    setServerDuration(game.durationMs);
    setRuns(game.runs);
    setGameFinished(game.gameFinished);
    setGameActive(game.gameActive);
    setRewardClaimedDate(game.rewardClaimedDate ?? "");
  }

  const skylineStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(20,26,38,0.1) 0%, rgba(20,26,38,0.6) 100%), radial-gradient(circle at 20% 20%, rgba(255,207,128,0.35), transparent 30%), linear-gradient(90deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 70px)",
    opacity: 0.95,
  };

  return (
    <section style={shellStyle}>
      <div style={headerRowStyle}>
        <div>
          <p style={eyebrowStyle}>Runner Challenge</p>
          <h2 style={titleStyle}>Shadow Sprint</h2>
          <p style={subtitleStyle}>
            Clear the collapsing causeway, hit {requiredScore} points, and secure today's MIR reward.
          </p>
        </div>
        <div style={pointsBadgeStyle}>
          <span style={{ fontSize: 12, opacity: 0.72 }}>Current MIR</span>
          <strong style={{ fontSize: 28 }}>{mirPoints}</strong>
        </div>
      </div>

      <div style={mainGridStyle}>
        <div style={arenaCardStyle}>
          <div style={arenaTopBarStyle}>
            <div>
              <div style={statLabelStyle}>Run Score</div>
              <div style={statValueStyle}>{score}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Target</div>
              <div style={statValueStyle}>{requiredScore}</div>
            </div>
            <div>
              <div style={statLabelStyle}>Best</div>
              <div style={statValueStyle}>{bestScore}</div>
            </div>
          </div>

          <div style={progressRailStyle}>
            <div style={{ ...progressFillStyle, transform: `scaleX(${progress})` }} />
          </div>

          <div style={trackShellStyle}>
            <div style={skylineStyle} />
            <div style={sunGlowStyle} />
            <div style={trackRuinLayerStyle} />
            {obstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                style={{
                  ...obstacleStyle,
                  width: obstacle.width,
                  height: obstacle.height,
                  left: obstacle.x,
                }}
              />
            ))}
            <div
              style={{
                ...playerStyle,
                bottom: GROUND_HEIGHT + playerY,
                transform: isJumping ? "scale(0.98) rotate(-6deg)" : "scale(1)",
              }}
            >
              <div style={playerCapeStyle} />
              <div style={playerBladeStyle} />
            </div>
            <div style={groundStyle} />
          </div>

          <div style={controlRowStyle}>
            <button
              type="button"
              onClick={startRunner}
              disabled={gameActive || isStartingGame}
              style={{
                ...primaryButtonStyle,
                opacity: gameActive || isStartingGame ? 0.45 : 1,
                cursor: gameActive || isStartingGame ? "not-allowed" : "pointer",
              }}
            >
              {isStartingGame ? "Starting..." : gameFinished || runs.length > 0 ? "Run Again" : "Start Run"}
            </button>

            <button
              type="button"
              onClick={jump}
              disabled={!gameActive}
              style={{
                ...secondaryButtonStyle,
                opacity: gameActive ? 1 : 0.45,
                cursor: gameActive ? "pointer" : "not-allowed",
              }}
            >
              Jump
            </button>
          </div>

          <div style={hintRowStyle}>
            <span>Controls: `Space` / `W` / `Arrow Up`</span>
            <span>Distance {Math.floor(distance)} m</span>
            <span>Cleared {obstaclesCleared}</span>
            <span>Speed x{speed.toFixed(1)}</span>
          </div>
        </div>

        <div style={sidePanelStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryTitleStyle}>Mission Status</div>
            <p style={summaryTextStyle}>{statusMessage}</p>

            <div style={summaryGridStyle}>
              <SummaryStat label="Last Score" value={serverScore} />
              <SummaryStat label="Last Distance" value={`${serverDistance} m`} />
              <SummaryStat label="Obstacles" value={serverObstacles} />
              <SummaryStat label="Run Time" value={`${(serverDuration / 1000).toFixed(1)} s`} />
            </div>

            <button
              type="button"
              onClick={claimDailyReward}
              disabled={!missionCleared || rewardClaimedToday || isClaimingReward}
              style={{
                ...claimButtonStyle,
                opacity: missionCleared && !rewardClaimedToday && !isClaimingReward ? 1 : 0.45,
                cursor:
                  missionCleared && !rewardClaimedToday && !isClaimingReward ? "pointer" : "not-allowed",
              }}
            >
              {rewardClaimedToday ? "Reward Claimed" : isClaimingReward ? "Claiming..." : "Claim 50 MIR"}
            </button>

            <div style={footnoteStyle}>
              {rewardClaimedToday
                ? `Reward locked for today${rewardClaimedDate ? ` (${rewardClaimedDate})` : ""}.`
                : `Today's reward unlocks at ${requiredScore} points.`}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryTitleStyle}>Recent Runs</div>
            {runs.length === 0 ? (
              <p style={summaryTextStyle}>No runs recorded yet. Start one and we will log the highlights here.</p>
            ) : (
              <div style={runListStyle}>
                {runs.map((run, index) => (
                  <div key={`${run.completedAt}-${index}`} style={runRowStyle}>
                    <div>
                      <div style={runScoreStyle}>{run.score} pts</div>
                      <div style={runMetaStyle}>
                        {run.distance} m · {run.obstaclesCleared} clears
                      </div>
                    </div>
                    <div style={runTimeStyle}>{(run.durationMs / 1000).toFixed(1)} s</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={summaryStatCardStyle}>
      <div style={summaryStatLabelStyle}>{label}</div>
      <div style={summaryStatValueStyle}>{value}</div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  marginTop: 24,
  padding: 28,
  borderRadius: 28,
  background: "linear-gradient(145deg, rgba(17,24,39,0.96), rgba(51,26,19,0.94))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 80px rgba(8,10,18,0.42)",
  color: "#f6efe1",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 24,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  color: "#f6b75f",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 10px",
  fontSize: 34,
  lineHeight: 1,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 620,
  color: "rgba(246,239,225,0.76)",
  lineHeight: 1.7,
};

const pointsBadgeStyle: React.CSSProperties = {
  minWidth: 164,
  padding: "16px 18px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  display: "grid",
  gap: 8,
};

const mainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.65fr) minmax(300px, 0.9fr)",
  gap: 22,
};

const arenaCardStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 24,
  background: "rgba(255,255,255,0.04)",
  display: "grid",
  gap: 16,
};

const arenaTopBarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  color: "rgba(246,239,225,0.62)",
};

const statValueStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 28,
  fontWeight: 700,
};

const progressRailStyle: React.CSSProperties = {
  height: 10,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,0.08)",
  transformOrigin: "left center",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  width: "100%",
  borderRadius: 999,
  transformOrigin: "left center",
  background: "linear-gradient(90deg, #f59e0b, #f97316)",
};

const trackShellStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  minHeight: TRACK_HEIGHT,
  borderRadius: 22,
  overflow: "hidden",
  background: "linear-gradient(180deg, #25334b 0%, #111827 75%)",
};

const sunGlowStyle: React.CSSProperties = {
  position: "absolute",
  top: 26,
  right: 48,
  width: 110,
  height: 110,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,210,124,0.75), rgba(255,210,124,0.06) 68%, transparent 72%)",
};

const trackRuinLayerStyle: React.CSSProperties = {
  position: "absolute",
  inset: "26px 0 44px",
  background:
    "linear-gradient(90deg, transparent 0 6%, rgba(255,255,255,0.08) 6% 7%, transparent 7% 19%, rgba(255,255,255,0.08) 19% 20%, transparent 20% 34%, rgba(255,255,255,0.08) 34% 35%, transparent 35% 50%, rgba(255,255,255,0.08) 50% 51%, transparent 51% 100%)",
  opacity: 0.18,
};

const obstacleStyle: React.CSSProperties = {
  position: "absolute",
  bottom: GROUND_HEIGHT,
  borderRadius: "12px 12px 4px 4px",
  background: "linear-gradient(180deg, #b45309 0%, #7c2d12 100%)",
  boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
};

const playerStyle: React.CSSProperties = {
  position: "absolute",
  left: PLAYER_LEFT,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  borderRadius: "16px 16px 10px 10px",
  background: "linear-gradient(180deg, #f8fafc 0%, #94a3b8 100%)",
  boxShadow: "0 8px 18px rgba(0,0,0,0.28)",
  transition: "transform 120ms ease",
};

const playerCapeStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: -16,
  width: 24,
  height: 30,
  borderRadius: "6px 14px 18px 6px",
  background: "linear-gradient(180deg, #f97316 0%, #7c2d12 100%)",
};

const playerBladeStyle: React.CSSProperties = {
  position: "absolute",
  left: 14,
  top: 2,
  width: 10,
  height: 34,
  borderRadius: 999,
  background: "linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)",
  transform: "rotate(24deg)",
};

const groundStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: GROUND_HEIGHT,
  background:
    "linear-gradient(180deg, rgba(66,32,18,0.95) 0%, rgba(28,16,11,1) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 10px, transparent 10px 28px)",
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const controlRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  minWidth: 160,
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #f59e0b, #ea580c)",
  color: "#1f1305",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  minWidth: 120,
  padding: "14px 18px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#f8fafc",
  fontWeight: 700,
};

const hintRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  color: "rgba(246,239,225,0.7)",
  fontSize: 13,
};

const sidePanelStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const summaryCardStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 22,
  background: "rgba(255,255,255,0.04)",
  display: "grid",
  gap: 16,
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
};

const summaryTextStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(246,239,225,0.74)",
  lineHeight: 1.7,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const summaryStatCardStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
};

const summaryStatLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  color: "rgba(246,239,225,0.55)",
};

const summaryStatValueStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 22,
  fontWeight: 700,
};

const claimButtonStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(135deg, #fb7185, #e11d48)",
  color: "#fff1f2",
  fontWeight: 700,
};

const footnoteStyle: React.CSSProperties = {
  color: "rgba(246,239,225,0.64)",
  fontSize: 13,
  lineHeight: 1.6,
};

const runListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const runRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.05)",
};

const runScoreStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
};

const runMetaStyle: React.CSSProperties = {
  marginTop: 4,
  color: "rgba(246,239,225,0.62)",
  fontSize: 13,
};

const runTimeStyle: React.CSSProperties = {
  color: "#f6b75f",
  fontWeight: 700,
  whiteSpace: "nowrap",
};
