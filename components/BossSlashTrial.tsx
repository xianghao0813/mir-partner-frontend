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
  dailyRunCount: number;
  dailyBestScore: number;
  dailyAttemptLimit: number;
};

type BossSlashTrialProps = {
  initialPoints: number;
  onPointsChange?: (points: number) => void;
  onRewardClaimed?: (transaction: {
    id?: string;
    title?: string;
    description?: string;
    points?: number;
    createdAt?: string;
    source?: string;
  }) => void;
};

type RunnerObstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  kind: "normal" | "high" | "double";
  passed: boolean;
};

type RunnerCoin = {
  id: number;
  x: number;
  y: number;
  value: 2 | 5;
  collected: boolean;
};

const TRACK_WIDTH = 520;
const TRACK_HEIGHT = 250;
const GROUND_HEIGHT = 44;
const PLAYER_LEFT = 86;
const PLAYER_WIDTH = 44;
const PLAYER_HEIGHT = 58;
const GRAVITY = 0.95;
const JUMP_FORCE = 15.5;
const MAX_JUMPS = 2;
const START_SPEED = 3.6;
const MAX_SPEED = 16.8;
const TARGET_SCORE = 5000;
const FEVER_INTERVAL_SCORE = 1000;
const FEVER_DURATION_MS = 3000;
const COIN_SIZE = 22;

type RunnerBiome = {
  label: string;
  track: string;
  skyline: string;
  objects: string;
  ground: string;
};

const BIOME_DISTANCE = 10000;
const RUNNER_BIOMES: RunnerBiome[] = [
  {
    label: "妫灄",
    track:
      "linear-gradient(180deg, #24462d 0%, #152819 68%, #0d1710 100%), repeating-linear-gradient(90deg, rgba(74,222,128,0.14) 0 12px, transparent 12px 38px)",
    skyline:
      "linear-gradient(180deg, rgba(30,64,43,0.22) 0%, rgba(9,23,14,0.72) 100%), repeating-linear-gradient(90deg, transparent 0 22px, rgba(34,197,94,0.24) 22px 36px, transparent 36px 76px)",
    objects:
      "linear-gradient(#4ade80 0 0) 58px 82px / 30px 42px no-repeat, linear-gradient(#166534 0 0) 70px 118px / 8px 50px no-repeat, linear-gradient(#22c55e 0 0) 128px 66px / 42px 54px no-repeat, linear-gradient(#14532d 0 0) 146px 112px / 10px 58px no-repeat, linear-gradient(#86efac 0 0) 282px 78px / 34px 46px no-repeat, linear-gradient(#166534 0 0) 295px 116px / 8px 54px no-repeat, linear-gradient(#22c55e 0 0) 402px 70px / 48px 58px no-repeat, linear-gradient(#14532d 0 0) 422px 116px / 10px 58px no-repeat",
    ground:
      "linear-gradient(180deg, #31572c 0%, #1f2f16 100%), repeating-linear-gradient(90deg, rgba(190,242,100,0.18) 0 8px, transparent 8px 24px)",
  },
  {
    label: "娌欐紶",
    track:
      "linear-gradient(180deg, #8a5a2b 0%, #51301a 62%, #22140b 100%), repeating-linear-gradient(90deg, rgba(254,215,170,0.14) 0 18px, transparent 18px 54px)",
    skyline:
      "linear-gradient(180deg, rgba(251,191,36,0.22) 0%, rgba(88,44,16,0.68) 100%), repeating-linear-gradient(90deg, transparent 0 40px, rgba(251,146,60,0.18) 40px 86px)",
    objects:
      "linear-gradient(135deg, transparent 0 45%, #b45309 46% 100%) 44px 120px / 110px 50px no-repeat, linear-gradient(135deg, transparent 0 45%, #92400e 46% 100%) 126px 132px / 96px 38px no-repeat, linear-gradient(#166534 0 0) 308px 104px / 8px 66px no-repeat, linear-gradient(#166534 0 0) 288px 122px / 48px 8px no-repeat, linear-gradient(#166534 0 0) 298px 84px / 30px 8px no-repeat, linear-gradient(#78350f 0 0) 412px 134px / 74px 36px no-repeat",
    ground:
      "linear-gradient(180deg, #b7792f 0%, #6b3f1d 100%), repeating-linear-gradient(90deg, rgba(255,237,213,0.22) 0 14px, transparent 14px 34px)",
  },
  {
    label: "宀╃煶",
    track:
      "linear-gradient(180deg, #475569 0%, #263241 64%, #111827 100%), repeating-linear-gradient(90deg, rgba(203,213,225,0.12) 0 10px, transparent 10px 34px)",
    skyline:
      "linear-gradient(180deg, rgba(148,163,184,0.16) 0%, rgba(15,23,42,0.72) 100%), repeating-linear-gradient(90deg, transparent 0 26px, rgba(148,163,184,0.18) 26px 48px, transparent 48px 82px)",
    objects:
      "linear-gradient(135deg, transparent 0 38%, #64748b 39% 100%) 30px 100px / 96px 70px no-repeat, linear-gradient(135deg, transparent 0 42%, #475569 43% 100%) 104px 86px / 126px 84px no-repeat, linear-gradient(135deg, transparent 0 42%, #334155 43% 100%) 256px 112px / 90px 58px no-repeat, linear-gradient(135deg, transparent 0 40%, #64748b 41% 100%) 370px 78px / 116px 92px no-repeat",
    ground:
      "linear-gradient(180deg, #64748b 0%, #334155 100%), repeating-linear-gradient(90deg, rgba(226,232,240,0.16) 0 11px, transparent 11px 29px)",
  },
  {
    label: "鐔斿博",
    track:
      "linear-gradient(180deg, #5f1717 0%, #2a0c0c 62%, #09090b 100%), repeating-linear-gradient(90deg, rgba(248,113,113,0.16) 0 8px, transparent 8px 30px)",
    skyline:
      "linear-gradient(180deg, rgba(239,68,68,0.24) 0%, rgba(24,10,10,0.82) 100%), repeating-linear-gradient(90deg, transparent 0 34px, rgba(249,115,22,0.2) 34px 48px, transparent 48px 88px)",
    objects:
      "linear-gradient(135deg, transparent 0 42%, #3f0b0b 43% 100%) 36px 80px / 130px 90px no-repeat, linear-gradient(45deg, transparent 0 42%, #571313 43% 100%) 126px 96px / 112px 74px no-repeat, linear-gradient(#fb923c 0 0) 128px 92px / 18px 78px no-repeat, linear-gradient(#f97316 0 0) 146px 112px / 12px 58px no-repeat, linear-gradient(135deg, transparent 0 42%, #450a0a 43% 100%) 326px 72px / 150px 98px no-repeat, linear-gradient(#facc15 0 0) 406px 96px / 16px 74px no-repeat",
    ground:
      "linear-gradient(180deg, #7f1d1d 0%, #1f0808 100%), repeating-linear-gradient(90deg, rgba(251,146,60,0.32) 0 7px, transparent 7px 23px)",
  },
  {
    label: "浜戠",
    track:
      "linear-gradient(180deg, #5b7bbd 0%, #334f8c 58%, #172554 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 18px, transparent 18px 52px)",
    skyline:
      "linear-gradient(180deg, rgba(191,219,254,0.28) 0%, rgba(37,99,235,0.5) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 28px, transparent 28px 72px)",
    objects:
      "linear-gradient(#eff6ff 0 0) 44px 108px / 82px 24px no-repeat, linear-gradient(#bfdbfe 0 0) 84px 92px / 56px 24px no-repeat, linear-gradient(#eff6ff 0 0) 182px 74px / 96px 26px no-repeat, linear-gradient(#dbeafe 0 0) 238px 96px / 74px 22px no-repeat, linear-gradient(#eff6ff 0 0) 364px 112px / 112px 28px no-repeat, linear-gradient(#bfdbfe 0 0) 398px 88px / 64px 26px no-repeat",
    ground:
      "linear-gradient(180deg, #dbeafe 0%, #93c5fd 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0 18px, transparent 18px 40px)",
  },
];

function getBiomeForDistance(distance: number) {
  const safeDistance = Number.isFinite(distance) && distance > 0 ? distance : 0;
  return RUNNER_BIOMES[Math.floor(safeDistance / BIOME_DISTANCE) % RUNNER_BIOMES.length] ?? RUNNER_BIOMES[0];
}

export default function BossSlashTrial({
  initialPoints,
  onPointsChange,
  onRewardClaimed,
}: BossSlashTrialProps) {
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
  const [dailyRunCount, setDailyRunCount] = useState(0);
  const [dailyBestScore, setDailyBestScore] = useState(0);
  const [dailyAttemptLimit, setDailyAttemptLimit] = useState(5);
  const [statusMessage, setStatusMessage] = useState(
    "收集道路上的 MIR 硬币。每天最多 5 局，可领取最高分的一局。"
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
  const [jumpCount, setJumpCount] = useState(0);
  const [feverActive, setFeverActive] = useState(false);
  const [feverRemainingMs, setFeverRemainingMs] = useState(0);
  const [obstacles, setObstacles] = useState<RunnerObstacle[]>([]);
  const [coins, setCoins] = useState<RunnerCoin[]>([]);

  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const startedAtRef = useRef(0);
  const velocityRef = useRef(0);
  const obstacleIdRef = useRef(0);
  const coinIdRef = useRef(0);
  const nextCoinSpawnRef = useRef(620);
  const nextSpawnRef = useRef(900);
  const activeRef = useRef(false);
  const submittedRef = useRef(false);
  const scoreRef = useRef(0);
  const distanceRef = useRef(0);
  const obstaclesRef = useRef(0);
  const speedRef = useRef(START_SPEED);
  const playerYRef = useRef(0);
  const obstacleStateRef = useRef<RunnerObstacle[]>([]);
  const coinStateRef = useRef<RunnerCoin[]>([]);
  const jumpCountRef = useRef(0);
  const feverActiveRef = useRef(false);
  const lastFeverScoreRef = useRef(0);
  const feverUntilRef = useRef(0);
  const targetSubmittedRef = useRef(false);

  const canClaimReward = dailyBestScore > 0 && !rewardClaimedToday;

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
    coinStateRef.current = coins;
  }, [coins]);

  useEffect(() => {
    void fetchRunnerStatus();
  }, [initialPoints]);

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

  const progress = useMemo(() => Math.min(1, dailyRunCount / Math.max(1, dailyAttemptLimit)), [dailyAttemptLimit, dailyRunCount]);
  const currentBiome = getBiomeForDistance(distance);

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

      resetLocalRun();
      syncGameStateFromApi(payload.game, { preserveActive: true });
      beginLoop();
      setStatusMessage("挑战开始。收集 2 分金币和需要二段跳的 5 分金币。");
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
    targetSubmittedRef.current = false;
    setGameActive(true);
    setGameFinished(false);
    setScore(0);
    setDistance(0);
    setObstaclesCleared(0);
    setSpeed(START_SPEED);
    setPlayerY(0);
    setIsJumping(false);
    setJumpCount(0);
    setFeverActive(false);
    setFeverRemainingMs(0);
    setObstacles([]);
    setCoins([]);
    velocityRef.current = 0;
    obstacleIdRef.current = 0;
    coinIdRef.current = 0;
    nextSpawnRef.current = 900;
    nextCoinSpawnRef.current = 620;
    scoreRef.current = 0;
    distanceRef.current = 0;
    obstaclesRef.current = 0;
    speedRef.current = START_SPEED;
    playerYRef.current = 0;
    obstacleStateRef.current = [];
    coinStateRef.current = [];
    jumpCountRef.current = 0;
    feverActiveRef.current = false;
    lastFeverScoreRef.current = 0;
    feverUntilRef.current = 0;
  }

  function beginLoop() {
    stopLoop();
    activeRef.current = true;
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
    let nextScore = scoreRef.current;
    const nextSpeed = Math.min(MAX_SPEED, START_SPEED + nextDistance / 620);
    const playerVelocity = velocityRef.current - GRAVITY * (delta / 16);
    let nextPlayerY = Math.max(0, playerYRef.current + playerVelocity * (delta / 16));

    if (nextPlayerY <= 0) {
      nextPlayerY = 0;
      velocityRef.current = 0;
      if (playerYRef.current > 0) {
        setIsJumping(false);
      }
      setJumpCount(0);
      jumpCountRef.current = 0;
    } else {
      velocityRef.current = playerVelocity;
    }

    nextSpawnRef.current -= delta;
    let nextObstacles = obstacleStateRef.current.map((obstacle) => ({
      ...obstacle,
      x: obstacle.x - nextSpeed * (delta / 16),
    }));

    if (nextSpawnRef.current <= 0) {
      nextObstacles.push(...createObstaclePattern());
      nextSpawnRef.current = Math.max(460, 1180 + Math.random() * 560 - nextSpeed * 34);
    }

    nextCoinSpawnRef.current -= delta;
    let nextCoins = coinStateRef.current.map((coin) => ({
      ...coin,
      x: coin.x - nextSpeed * (delta / 16),
    }));

    if (nextCoinSpawnRef.current <= 0) {
      nextCoins.push(createCoin());
      nextCoinSpawnRef.current = 520 + Math.random() * 520;
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

    const nextFeverScore = Math.floor(nextScore / FEVER_INTERVAL_SCORE) * FEVER_INTERVAL_SCORE;
    if (nextFeverScore > 0 && nextFeverScore > lastFeverScoreRef.current) {
      lastFeverScoreRef.current = nextFeverScore;
      feverActiveRef.current = true;
      feverUntilRef.current = timestamp + FEVER_DURATION_MS;
      setFeverActive(true);
      setStatusMessage("疾风模式触发，3 秒内无敌。");
    }

    if (feverActiveRef.current) {
      const remaining = Math.max(0, feverUntilRef.current - timestamp);
      setFeverRemainingMs(remaining);
      if (remaining <= 0) {
        feverActiveRef.current = false;
        setFeverActive(false);
      }
    }

    nextCoins = nextCoins
      .map((coin) => {
        const overlapX = coin.x < PLAYER_LEFT + PLAYER_WIDTH && coin.x + COIN_SIZE > PLAYER_LEFT;
        const overlapY = nextPlayerY + PLAYER_HEIGHT > coin.y && nextPlayerY < coin.y + COIN_SIZE;
        if (!coin.collected && overlapX && overlapY) {
          nextScore += coin.value;
          return { ...coin, collected: true };
        }
        return coin;
      })
      .filter((coin) => !coin.collected && coin.x + COIN_SIZE > -40);


    const collided = !feverActiveRef.current && nextObstacles.some((obstacle) => {
      const overlapX =
        obstacle.x < PLAYER_LEFT + PLAYER_WIDTH && obstacle.x + obstacle.width > PLAYER_LEFT + 4;
      return overlapX && nextPlayerY < obstacle.height - 6;
    });

    setDistance(nextDistance);
    setScore(nextScore);
    setSpeed(nextSpeed);
    setPlayerY(nextPlayerY);
    setObstaclesCleared(nextCleared);
    setObstacles(nextObstacles);
    setCoins(nextCoins);

    scoreRef.current = nextScore;
    distanceRef.current = nextDistance;
    obstaclesRef.current = nextCleared;
    speedRef.current = nextSpeed;
    playerYRef.current = nextPlayerY;
    obstacleStateRef.current = nextObstacles;
    coinStateRef.current = nextCoins;

    if (collided) {
      stopLoop();
      setGameActive(false);
      setGameFinished(true);
      setStatusMessage("本局结束，已保存本局收集到的 MIR 积分。今日可领取最高分的一局。");
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

  function createObstaclePattern(): RunnerObstacle[] {
    obstacleIdRef.current += 1;
    const canUseSpecialPattern = obstacleIdRef.current > 2;
    const roll = Math.random();

    if (canUseSpecialPattern && roll < 0.38) {
      const first = createObstacle("double", 0, 24 + Math.random() * 10, 42 + Math.random() * 12);
      const second = createObstacle("double", 58 + Math.random() * 18, 24 + Math.random() * 10, 44 + Math.random() * 14);
      return [first, second];
    }

    if (canUseSpecialPattern && roll < 0.68) {
      return [createObstacle("high", 0, 28 + Math.random() * 14, 88 + Math.random() * 22)];
    }

    return [createObstacle("normal", 0, 20 + Math.random() * 24, 28 + Math.random() * 30)];
  }

  function createObstacle(
    kind: RunnerObstacle["kind"],
    offsetX: number,
    width: number,
    height: number
  ): RunnerObstacle {
    obstacleIdRef.current += 1;

    return {
      id: obstacleIdRef.current,
      x: TRACK_WIDTH + 12 + offsetX,
      width,
      height,
      kind,
      passed: false,
    };
  }

  function createCoin(): RunnerCoin {
    coinIdRef.current += 1;
    const isHighValue = Math.random() < 0.32;

    return {
      id: coinIdRef.current,
      x: TRACK_WIDTH + 24,
      y: isHighValue ? 112 + Math.random() * 28 : 48 + Math.random() * 18,
      value: isHighValue ? 5 : 2,
      collected: false,
    };
  }

  function jump() {
    if (!activeRef.current || jumpCountRef.current >= MAX_JUMPS) {
      return;
    }

    jumpCountRef.current += 1;
    setJumpCount(jumpCountRef.current);
    velocityRef.current = jumpCountRef.current === 1 ? JUMP_FORCE : JUMP_FORCE * 0.86;
    setIsJumping(true);
  }

  async function submitRunResult(result: {
    score: number;
    distance: number;
    obstaclesCleared: number;
    durationMs: number;
  }, options?: { preserveActive?: boolean }) {
    if (submittedRef.current && result.score <= serverScore && !options?.preserveActive) {
      return;
    }

    if (!options?.preserveActive) {
      submittedRef.current = true;
    }

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
        setStatusMessage(payload.message ?? "无法保存本局成绩。");
        return;
      }

      syncGameStateFromApi(payload.game, options);
    } catch (error) {
      console.error(error);
      setStatusMessage("无法保存本局成绩。");
    } finally {
      setIsSubmittingRun(false);
    }
  }

  async function claimDailyReward() {
    if (!canClaimReward) {
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
      if (payload.pointTransaction) {
        onRewardClaimed?.(payload.pointTransaction);
      }
      if (payload.game) {
        syncGameStateFromApi(payload.game);
      }
      setStatusMessage(`奖励已领取，增加 ${payload.awardedPoints ?? 0} 点 MIR 积分。`);
    } catch (error) {
      console.error(error);
      setStatusMessage("无法领取奖励。");
    } finally {
      setIsClaimingReward(false);
    }
  }

  function syncGameStateFromApi(game: BossGamePayload | null, options?: { preserveActive?: boolean }) {
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
    setDailyRunCount(game.dailyRunCount ?? 0);
    setDailyBestScore(game.dailyBestScore ?? 0);
    setDailyAttemptLimit(game.dailyAttemptLimit ?? 5);
    setGameFinished(game.gameFinished);
    setGameActive(options?.preserveActive ? activeRef.current : game.gameActive);
    setRewardClaimedDate(game.rewardClaimedDate ?? "");
  }

  const skylineStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: currentBiome.skyline,
    opacity: 0.95,
    imageRendering: "pixelated",
  };

  return (
    <section style={shellStyle}>
      <style jsx global>{`
        @keyframes feverSweep {
          0% {
            transform: translateX(-36%);
          }
          100% {
            transform: translateX(36%);
          }
        }

        @keyframes feverPulse {
          from {
            transform: scale(0.92);
            opacity: 0.7;
          }
          to {
            transform: scale(1.12);
            opacity: 1;
          }
        }

        @keyframes coinSpin {
          0% {
            transform: rotateY(0deg) scale(1);
          }
          50% {
            transform: rotateY(180deg) scale(0.88);
          }
          100% {
            transform: rotateY(360deg) scale(1);
          }
        }

        @keyframes pixelRunLeft {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-4px, 3px);
          }
        }

        @keyframes pixelRunRight {
          0%,
          100% {
            transform: translate(3px, 3px);
          }
          50% {
            transform: translate(0, 0);
          }
        }
      `}</style>
      <div style={headerRowStyle}>
        <div>
          <p style={eyebrowStyle}>小游戏挑战</p>
          <h2 style={titleStyle}>遗迹冲刺</h2>
          <p style={subtitleStyle}>
            收集道路上的 MIR 硬币获得积分。普通硬币 2 分，高位紫色硬币 5 分，每天最多 5 局，领取最高分的一局。
          </p>
        </div>
        <div style={pointsBadgeStyle}>
          <span style={{ fontSize: 12, opacity: 0.72 }}>当前 MIR 积分</span>
          <strong style={{ fontSize: 28 }}>{mirPoints}</strong>
        </div>
      </div>

      <div style={mainGridStyle}>
        <div style={arenaCardStyle}>
          <div style={arenaTopBarStyle}>
            <div>
              <div style={statLabelStyle}>本局积分</div>
              <div style={statValueStyle}>{score}</div>
            </div>
            <div>
              <div style={statLabelStyle}>今日局数</div>
              <div style={statValueStyle}>{dailyRunCount}/{dailyAttemptLimit}</div>
            </div>
            <div>
              <div style={statLabelStyle}>今日最高</div>
              <div style={statValueStyle}>{dailyBestScore}</div>
            </div>
          </div>

          <div style={progressRailStyle}>
            <div style={{ ...progressFillStyle, transform: `scaleX(${progress})` }} />
          </div>

          <div
            style={{
              ...trackShellStyle,
              background: currentBiome.track,
              ...(feverActive ? feverTrackShellStyle : null),
            }}
          >
            <div style={skylineStyle} />
            <div style={sunGlowStyle} />
            {feverActive ? <div style={feverOverlayStyle} /> : null}
            <div style={{ ...biomeObjectLayerStyle, background: currentBiome.objects }} />
            <div style={trackRuinLayerStyle} />
            {coins.map((coin) => (
              <div
                key={coin.id}
                style={{
                  ...coinStyle,
                  ...(coin.value === 5 ? highValueCoinStyle : null),
                  left: coin.x,
                  bottom: GROUND_HEIGHT + coin.y,
                }}
              >
                {coin.value}
              </div>
            ))}
            {obstacles.map((obstacle) => (
              <div
                key={obstacle.id}
                style={{
                  ...obstacleStyle,
                  ...(obstacle.kind === "high" ? highObstacleStyle : null),
                  ...(obstacle.kind === "double" ? doubleObstacleStyle : null),
                  width: obstacle.width,
                  height: obstacle.height,
                  left: obstacle.x,
                }}
              >
                {obstacle.kind !== "normal" ? <span style={highObstacleMarkStyle} /> : null}
              </div>
            ))}
            <div
              style={{
                ...playerStyle,
                bottom: GROUND_HEIGHT + playerY,
                ...(feverActive ? feverPlayerStyle : null),
                transform: isJumping ? "scale(0.98) rotate(-6deg)" : "scale(1)",
              }}
            >
              {feverActive ? <div style={feverAuraStyle} /> : null}
              <div style={pixelShadowStyle} />
              <div style={pixelCapeStyle} />
              <div style={pixelHeadStyle}>
                <span style={pixelHairStyle} />
                <span style={pixelFaceStyle} />
              </div>
              <div style={pixelBodyStyle}>
                <span style={pixelChestStyle} />
              </div>
              <div style={pixelLeftArmStyle} />
              <div style={pixelRightArmStyle} />
              <div
                style={{
                  ...pixelLeftLegStyle,
                  ...(gameActive && !isJumping ? pixelLeftLegRunStyle : null),
                }}
              />
              <div
                style={{
                  ...pixelRightLegStyle,
                  ...(gameActive && !isJumping ? pixelRightLegRunStyle : null),
                }}
              />
              <div style={pixelSwordStyle} />
            </div>
            <div style={{ ...groundStyle, background: currentBiome.ground }} />
          </div>

          <div style={controlRowStyle}>
            <button
              type="button"
              onClick={startRunner}
              disabled={isStartingGame}
              style={{
                ...primaryButtonStyle,
                opacity: isStartingGame ? 0.45 : 1,
                cursor: isStartingGame ? "not-allowed" : "pointer",
              }}
            >
              {isStartingGame ? "开始中..." : gameActive ? "重新开始" : gameFinished || runs.length > 0 ? "再次挑战" : "开始挑战"}
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
              跳跃
            </button>
          </div>

          <div style={hintRowStyle}>
            <span>操作：空格 / W / 方向上 / 点击跳跃</span>
            <span>跳跃次数：{jumpCount}/{MAX_JUMPS}</span>
            <span>疾风模式：{feverActive ? `${Math.ceil(feverRemainingMs / 1000)} 秒` : `${Math.max(FEVER_INTERVAL_SCORE, (Math.floor(score / FEVER_INTERVAL_SCORE) + 1) * FEVER_INTERVAL_SCORE)} 分触发`}</span>
            <span>距离 {Math.floor(distance)} 米</span>
            <span>越过 {obstaclesCleared}</span>
            <span>速度 x{speed.toFixed(1)}</span>
          </div>
        </div>

        <div style={sidePanelStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryTitleStyle}>任务状态</div>
            <p style={summaryTextStyle}>{statusMessage}</p>

            <div style={summaryGridStyle}>
              <SummaryStat label="上局积分" value={serverScore} />
              <SummaryStat label="上局距离" value={`${serverDistance} 米`} />
              <SummaryStat label="越过障碍" value={serverObstacles} />
              <SummaryStat label="用时" value={`${(serverDuration / 1000).toFixed(1)} 秒`} />
            </div>

            <button
              type="button"
              onClick={claimDailyReward}
              disabled={!canClaimReward || isClaimingReward}
              style={{
                ...claimButtonStyle,
                opacity: canClaimReward && !isClaimingReward ? 1 : 0.45,
                cursor:
                  canClaimReward && !isClaimingReward ? "pointer" : "not-allowed",
              }}
            >
              {rewardClaimedToday ? "今日已领取" : isClaimingReward ? "领取中..." : `领取 ${dailyBestScore} MIR`}
            </button>

            <div style={footnoteStyle}>
              {rewardClaimedToday
                ? `今日奖励已锁定${rewardClaimedDate ? `（${rewardClaimedDate}）` : ""}。`
                : `今日还可挑战 ${Math.max(0, dailyAttemptLimit - dailyRunCount)} 局，奖励按最高单局积分发放。`}
            </div>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryTitleStyle}>最近挑战</div>
            {runs.length === 0 ? (
              <p style={summaryTextStyle}>暂无挑战记录。开始挑战后会在这里显示最近成绩。</p>
            ) : (
              <div style={runListStyle}>
                {runs.map((run, index) => (
                  <div key={`${run.completedAt}-${index}`} style={runRowStyle}>
                    <div>
                      <div style={runScoreStyle}>{run.score} 分</div>
                      <div style={runMetaStyle}>
                        {run.distance} 米 · 越过 {run.obstaclesCleared}
                      </div>
                    </div>
                    <div style={runTimeStyle}>{(run.durationMs / 1000).toFixed(1)} 秒</div>
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
  imageRendering: "pixelated",
};

const feverTrackShellStyle: React.CSSProperties = {
  boxShadow: "inset 0 0 44px rgba(250,204,21,0.28), 0 0 28px rgba(250,204,21,0.2)",
};

const feverOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  pointerEvents: "none",
  background:
    "linear-gradient(100deg, transparent 0%, rgba(250,204,21,0.08) 22%, transparent 44%, rgba(255,255,255,0.12) 52%, transparent 70%), radial-gradient(circle at 68% 26%, rgba(250,204,21,0.24), transparent 28%)",
  mixBlendMode: "screen",
  animation: "feverSweep 900ms linear infinite",
};

const sunGlowStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 1,
  top: 26,
  right: 48,
  width: 110,
  height: 110,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,210,124,0.75), rgba(255,210,124,0.06) 68%, transparent 72%)",
};

const biomeObjectLayerStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: GROUND_HEIGHT,
  height: TRACK_HEIGHT - GROUND_HEIGHT,
  zIndex: 1,
  opacity: 0.88,
  imageRendering: "pixelated",
  pointerEvents: "none",
};

const trackRuinLayerStyle: React.CSSProperties = {
  position: "absolute",
  inset: "26px 0 44px",
  zIndex: 1,
  background:
    "linear-gradient(90deg, transparent 0 6%, rgba(255,255,255,0.08) 6% 7%, transparent 7% 19%, rgba(255,255,255,0.08) 19% 20%, transparent 20% 34%, rgba(255,255,255,0.08) 34% 35%, transparent 35% 50%, rgba(255,255,255,0.08) 50% 51%, transparent 51% 100%)",
  opacity: 0.18,
};

const obstacleStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 4,
  bottom: GROUND_HEIGHT,
  borderRadius: "12px 12px 4px 4px",
  background: "linear-gradient(180deg, #b45309 0%, #7c2d12 100%)",
  boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
};

const coinStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 4,
  width: COIN_SIZE,
  height: COIN_SIZE,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "radial-gradient(circle at 35% 32%, #fff7ad, #facc15 48%, #b45309 100%)",
  border: "2px solid #fde68a",
  color: "#78350f",
  fontSize: 11,
  fontWeight: 900,
  boxShadow: "0 0 14px rgba(250,204,21,0.45)",
  transformStyle: "preserve-3d",
  animation: "coinSpin 760ms linear infinite",
};

const highValueCoinStyle: React.CSSProperties = {
  background: "radial-gradient(circle at 35% 32%, #f5f3ff, #a78bfa 52%, #5b21b6 100%)",
  borderColor: "#ddd6fe",
  color: "#fff",
  boxShadow: "0 0 18px rgba(167,139,250,0.65)",
  animationDuration: "620ms",
};

const highObstacleStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #7f1d1d 0%, #451a03 100%)",
  boxShadow: "0 0 18px rgba(248,113,113,0.22), 0 8px 18px rgba(0,0,0,0.34)",
};

const doubleObstacleStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #92400e 0%, #431407 100%)",
  boxShadow: "0 0 16px rgba(251,146,60,0.22), 0 8px 18px rgba(0,0,0,0.32)",
};

const highObstacleMarkStyle: React.CSSProperties = {
  position: "absolute",
  top: 6,
  left: "50%",
  width: 8,
  height: 8,
  transform: "translateX(-50%)",
  background: "#facc15",
  boxShadow: "0 12px 0 #facc15, 0 24px 0 #facc15",
};

const playerStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 5,
  left: PLAYER_LEFT,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  background: "transparent",
  imageRendering: "pixelated",
  transition: "transform 120ms ease",
};

const feverPlayerStyle: React.CSSProperties = {
  filter: "drop-shadow(0 0 10px rgba(250,204,21,0.9)) drop-shadow(0 0 18px rgba(251,113,133,0.5))",
};

const feverAuraStyle: React.CSSProperties = {
  position: "absolute",
  inset: -12,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(250,204,21,0.24), rgba(250,204,21,0.08) 48%, transparent 70%)",
  zIndex: -1,
  animation: "feverPulse 700ms ease-in-out infinite alternate",
};

const pixelShadowStyle: React.CSSProperties = {
  position: "absolute",
  left: 4,
  right: 2,
  bottom: -5,
  height: 8,
  background: "rgba(0,0,0,0.34)",
  borderRadius: "50%",
};

const pixelCapeStyle: React.CSSProperties = {
  position: "absolute",
  left: 4,
  top: 19,
  width: 22,
  height: 28,
  background: "#8b1e1e",
  boxShadow: "0 6px 0 #5f1111, -4px 10px 0 #5f1111",
};

const pixelHeadStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  top: 4,
  width: 22,
  height: 20,
  background: "#d8a05f",
  boxShadow: "0 0 0 4px #2b1a13, 4px 4px 0 #f2c078",
};

const pixelHairStyle: React.CSSProperties = {
  position: "absolute",
  left: -4,
  top: -4,
  width: 30,
  height: 8,
  background: "#1b1010",
  boxShadow: "4px 8px 0 #1b1010, 22px 8px 0 #1b1010",
};

const pixelFaceStyle: React.CSSProperties = {
  position: "absolute",
  left: 6,
  top: 10,
  width: 4,
  height: 4,
  background: "#111827",
  boxShadow: "10px 0 0 #111827, 6px 7px 0 #7c2d12",
};

const pixelBodyStyle: React.CSSProperties = {
  position: "absolute",
  left: 11,
  top: 27,
  width: 24,
  height: 22,
  background: "#243b64",
  boxShadow: "0 5px 0 #172554, 4px -4px 0 #d6b05f, 16px -4px 0 #d6b05f",
};

const pixelChestStyle: React.CSSProperties = {
  position: "absolute",
  left: 8,
  top: 3,
  width: 8,
  height: 14,
  background: "#c9a24d",
  boxShadow: "0 6px 0 #8a6a27",
};

const pixelLeftArmStyle: React.CSSProperties = {
  position: "absolute",
  left: 3,
  top: 30,
  width: 8,
  height: 20,
  background: "#d8a05f",
  boxShadow: "0 8px 0 #8b4513",
};

const pixelRightArmStyle: React.CSSProperties = {
  position: "absolute",
  left: 35,
  top: 28,
  width: 8,
  height: 20,
  background: "#d8a05f",
  boxShadow: "0 8px 0 #8b4513",
};

const pixelLeftLegStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  top: 49,
  width: 9,
  height: 9,
  background: "#111827",
  boxShadow: "0 5px 0 #0f172a",
};

const pixelLeftLegRunStyle: React.CSSProperties = {
  animation: "pixelRunLeft 260ms steps(2, end) infinite",
};

const pixelRightLegStyle: React.CSSProperties = {
  position: "absolute",
  left: 26,
  top: 49,
  width: 9,
  height: 9,
  background: "#111827",
  boxShadow: "0 5px 0 #0f172a",
};

const pixelRightLegRunStyle: React.CSSProperties = {
  animation: "pixelRunRight 260ms steps(2, end) infinite",
};

const pixelSwordStyle: React.CSSProperties = {
  position: "absolute",
  left: 39,
  top: 8,
  width: 5,
  height: 38,
  background: "#e5e7eb",
  boxShadow: "0 0 0 2px #94a3b8, -4px 28px 0 #d6b05f, 4px 28px 0 #d6b05f",
  transform: "rotate(20deg)",
  transformOrigin: "bottom center",
};

const groundStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 3,
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
