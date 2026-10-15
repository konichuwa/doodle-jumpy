/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, Pause, Play, Trophy, Sparkles, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from 'lucide-react';

// ==========================================
// AUDIO SYNTHESIZER (Web Audio API - No Assets)
// ==========================================
class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBounce() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // AudioContext fallback
    }
  }

  playBoostJump() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 660, 880].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + idx * 0.04 + 0.15);

        gain.gain.setValueAtTime(0.18, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.2);
      });
    } catch {
      // AudioContext fallback
    }
  }

  playSpring() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } catch {
      // AudioContext fallback
    }
  }

  playBreak() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.16);
    } catch {
      // AudioContext fallback
    }
  }

  playGameOver() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.55);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.65);
    } catch {
      // AudioContext fallback
    }
  }
}

const sounds = new SoundEngine();

// ==========================================
// GAME CONSTANTS & TYPES
// ==========================================
const VIRTUAL_WIDTH = 480;
const VIRTUAL_HEIGHT = 760;
const GRAVITY = 1500;
const BOUNCE_IMPULSE = -760;
const BOOST_IMPULSE = -1060;
const SPRING_IMPULSE = -1350;
const FAST_FALL_GRAVITY = 3600;
const MOVE_ACCEL = 2600;
const MAX_MOVE_SPEED = 460;
const FRICTION = 0.86;
const PLATFORM_WIDTH = 76;
const PLATFORM_HEIGHT = 16;
const PLAYER_SIZE = 42;

type PlatformType = 'standard' | 'moving' | 'breakable' | 'spring';

interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  vx: number;
  broken?: boolean;
  breakProgress?: number;
  hasSpring?: boolean;
  springActive?: boolean;
  springScaleY?: number;
  squash?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'rect' | 'star';
}

type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High score persistent storage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('doodle_jump_high_score');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [score, setScore] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>('START');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [stats, setStats] = useState({ jumps: 0, boosts: 0, maxAltitude: 0 });

  // References for mutable game loop state to prevent re-render overhead
  const gameRef = useRef({
    gameState: 'START' as GameState,
    player: {
      x: VIRTUAL_WIDTH / 2 - PLAYER_SIZE / 2,
      y: VIRTUAL_HEIGHT - 180,
      vx: 0,
      vy: 0,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      facing: 1, // 1: right, -1: left
      scaleX: 1,
      scaleY: 1,
      isBoosting: false,
      fastFalling: false,
      canAirFlutter: true,
      lastJumpType: 'normal' as 'normal' | 'boost' | 'spring'
    },
    cameraY: 0,
    minPlayerY: VIRTUAL_HEIGHT - 180,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    nextPlatformY: VIRTUAL_HEIGHT - 100,
    platformIdCounter: 1,
    keys: {
      left: false,
      right: false,
      up: false,
      down: false
    },
    stats: {
      jumps: 0,
      boosts: 0,
      maxAltitude: 0
    },
    lastTime: performance.now()
  });

  // Toggle Sound
  const toggleSound = () => {
    const next = !soundEnabled;
    sounds.enabled = next;
    setSoundEnabled(next);
  };

  // ==========================================
  // PROCEDURAL PLATFORM GENERATION
  // ==========================================
  const generatePlatformsUpTo = useCallback((targetWorldY: number) => {
    const state = gameRef.current;
    const currentScore = Math.max(0, Math.floor(-state.minPlayerY / 10));

    // Scaling difficulty based on height reached
    const movingChance = Math.min(0.48, 0.12 + currentScore / 12000);
    const breakableChance = Math.min(0.30, 0.08 + currentScore / 14000);
    const springChance = 0.16;

    while (state.nextPlatformY > targetWorldY) {
      // Dynamic vertical gap: keeps platforms easily reachable, never exceeds normal bounce height (~200px)
      const minGap = 65;
      const maxGap = Math.min(135, 80 + currentScore / 250);
      const gap = minGap + Math.random() * (maxGap - minGap);
      state.nextPlatformY -= gap;

      const platY = state.nextPlatformY;
      const platX = 20 + Math.random() * (VIRTUAL_WIDTH - PLATFORM_WIDTH - 40);

      // Roll platform type
      const roll = Math.random();
      let type: PlatformType = 'standard';
      let vx = 0;
      let hasSpring = false;

      if (roll < breakableChance) {
        type = 'breakable';
      } else if (roll < breakableChance + movingChance) {
        type = 'moving';
        vx = (Math.random() > 0.5 ? 1 : -1) * (80 + Math.random() * 80 + Math.min(60, currentScore / 200));
      } else {
        type = 'standard';
        // Springs only appear on stable platforms
        if (Math.random() < springChance) {
          hasSpring = true;
        }
      }

      state.platforms.push({
        id: state.platformIdCounter++,
        x: platX,
        y: platY,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type,
        vx,
        broken: false,
        breakProgress: 0,
        hasSpring,
        springActive: false,
        springScaleY: 1,
        squash: 1
      });
    }

    // Cull old platforms below camera view
    const cullY = state.cameraY + VIRTUAL_HEIGHT + 120;
    state.platforms = state.platforms.filter(p => p.y < cullY && (!p.broken || (p.breakProgress ?? 0) < 1));
  }, []);

  // ==========================================
  // SPAWN PARTICLES
  // ==========================================
  const addParticles = useCallback((x: number, y: number, count: number, type: 'dust' | 'stars' | 'debris' | 'confetti') => {
    const particles = gameRef.current.particles;
    for (let i = 0; i < count; i++) {
      if (type === 'dust') {
        const angle = Math.random() * Math.PI;
        const speed = 20 + Math.random() * 80;
        particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed * 0.4,
          size: 4 + Math.random() * 5,
          color: '#10B981',
          alpha: 0.8,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.2,
          shape: 'circle'
        });
      } else if (type === 'stars') {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 180;
        const colors = ['#F59E0B', '#FBBF24', '#FCD34D', '#FFFFFF'];
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          size: 5 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife: 0.4 + Math.random() * 0.3,
          shape: 'star'
        });
      } else if (type === 'debris') {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 120;
        particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + 50,
          size: 4 + Math.random() * 6,
          color: '#B45309',
          alpha: 0.9,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.3,
          shape: 'rect'
        });
      } else if (type === 'confetti') {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 250;
        const colors = ['#3B82F6', '#10B981', '#EC4899', '#F59E0B', '#8B5CF6'];
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100,
          size: 5 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 0,
          maxLife: 0.8 + Math.random() * 0.5,
          shape: 'rect'
        });
      }
    }
  }, []);

  // ==========================================
  // INITIALIZE / RESET GAME
  // ==========================================
  const initGame = useCallback(() => {
    const state = gameRef.current;
    state.cameraY = 0;
    state.minPlayerY = VIRTUAL_HEIGHT - 220;
    state.nextPlatformY = VIRTUAL_HEIGHT - 30;
    state.platformIdCounter = 1;
    state.particles = [];
    state.platforms = [];
    state.stats = { jumps: 0, boosts: 0, maxAltitude: 0 };

    // Reset player position right above guaranteed initial base platform
    state.player = {
      x: VIRTUAL_WIDTH / 2 - PLAYER_SIZE / 2,
      y: VIRTUAL_HEIGHT - 200,
      vx: 0,
      vy: BOUNCE_IMPULSE * 0.6,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      facing: 1,
      scaleX: 1,
      scaleY: 1,
      isBoosting: false,
      fastFalling: false,
      canAirFlutter: true,
      lastJumpType: 'normal'
    };

    // Starting baseline platform (safe launchpad)
    state.platforms.push({
      id: state.platformIdCounter++,
      x: VIRTUAL_WIDTH / 2 - 60,
      y: VIRTUAL_HEIGHT - 80,
      width: 120,
      height: PLATFORM_HEIGHT,
      type: 'standard',
      vx: 0,
      broken: false,
      squash: 1
    });

    // Populate initial platforms upwards
    generatePlatformsUpTo(-VIRTUAL_HEIGHT);

    setScore(0);
    setIsNewRecord(false);
    state.gameState = 'PLAYING';
    setGameState('PLAYING');
    state.lastTime = performance.now();
  }, [generatePlatformsUpTo]);

  // ==========================================
  // INPUT HANDLING (WASD + Arrows + Space + R)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key.toLowerCase();

      // Audio context unlock on first keypress
      if (sounds.enabled) {
        sounds.playBounce;
      }

      // Handle Quick Restart
      if (code === 'KeyR' || (code === 'Space' && gameRef.current.gameState === 'GAME_OVER')) {
        e.preventDefault();
        initGame();
        return;
      }

      // Handle Pause
      if (code === 'KeyP' || code === 'Escape') {
        if (gameRef.current.gameState === 'PLAYING') {
          gameRef.current.gameState = 'PAUSED';
          setGameState('PAUSED');
        } else if (gameRef.current.gameState === 'PAUSED') {
          gameRef.current.gameState = 'PLAYING';
          gameRef.current.lastTime = performance.now();
          setGameState('PLAYING');
        }
        return;
      }

      // Handle WASD / Arrows
      if (code === 'KeyA' || code === 'ArrowLeft') {
        gameRef.current.keys.left = true;
        setActiveKeys(prev => ({ ...prev, left: true }));
      }
      if (code === 'KeyD' || code === 'ArrowRight') {
        gameRef.current.keys.right = true;
        setActiveKeys(prev => ({ ...prev, right: true }));
      }
      if (code === 'KeyW' || code === 'ArrowUp') {
        gameRef.current.keys.up = true;
        setActiveKeys(prev => ({ ...prev, up: true }));

        // Start game if on START screen
        if (gameRef.current.gameState === 'START') {
          initGame();
          return;
        }

        // Air flutter boost mechanic (W bonus in air)
        const p = gameRef.current.player;
        if (gameRef.current.gameState === 'PLAYING' && p.canAirFlutter && p.vy > -200 && p.vy < 300) {
          p.canAirFlutter = false;
          p.vy = -450;
          p.scaleX = 0.8;
          p.scaleY = 1.3;
          sounds.playBounce();
          addParticles(p.x + p.width / 2, p.y + p.height, 8, 'dust');
        }
      }
      if (code === 'KeyS' || code === 'ArrowDown') {
        gameRef.current.keys.down = true;
        setActiveKeys(prev => ({ ...prev, down: true }));
      }

      if (code === 'Space' && gameRef.current.gameState === 'START') {
        e.preventDefault();
        initGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') {
        gameRef.current.keys.left = false;
        setActiveKeys(prev => ({ ...prev, left: false }));
      }
      if (code === 'KeyD' || code === 'ArrowRight') {
        gameRef.current.keys.right = false;
        setActiveKeys(prev => ({ ...prev, right: false }));
      }
      if (code === 'KeyW' || code === 'ArrowUp') {
        gameRef.current.keys.up = false;
        setActiveKeys(prev => ({ ...prev, up: false }));
      }
      if (code === 'KeyS' || code === 'ArrowDown') {
        gameRef.current.keys.down = false;
        setActiveKeys(prev => ({ ...prev, down: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initGame, addParticles]);

  // ==========================================
  // MAIN GAME LOOP (Physics, Camera, Rendering)
  // ==========================================
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const updateCanvasDPI = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = VIRTUAL_WIDTH * dpr;
      canvas.height = VIRTUAL_HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateCanvasDPI();

    const loop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(loop);

      const state = gameRef.current;
      const rawDt = (currentTime - state.lastTime) / 1000;
      state.lastTime = currentTime;
      // Clamp dt to prevent tunneling on window tab switch or lag spikes
      const dt = Math.min(rawDt, 0.05);

      // ----------------------------------------
      // 1. UPDATE PHYSICS (When PLAYING)
      // ----------------------------------------
      if (state.gameState === 'PLAYING') {
        const p = state.player;

        // Horizontal movement & damping
        if (state.keys.left) {
          p.vx -= MOVE_ACCEL * dt;
          p.facing = -1;
        } else if (state.keys.right) {
          p.vx += MOVE_ACCEL * dt;
          p.facing = 1;
        } else {
          p.vx *= Math.pow(FRICTION, dt * 60);
        }

        // Clamp horizontal velocity
        if (p.vx > MAX_MOVE_SPEED) p.vx = MAX_MOVE_SPEED;
        if (p.vx < -MAX_MOVE_SPEED) p.vx = -MAX_MOVE_SPEED;

        p.x += p.vx * dt;

        // Screen Wrap with seamless margins
        if (p.x < -p.width / 2) {
          p.x = VIRTUAL_WIDTH - p.width / 2;
        } else if (p.x > VIRTUAL_WIDTH - p.width / 2) {
          p.x = -p.width / 2;
        }

        // Vertical Gravity & Fast Fall (S key)
        p.fastFalling = state.keys.down;
        const currentGravity = p.fastFalling ? FAST_FALL_GRAVITY : GRAVITY;
        p.vy += currentGravity * dt;

        // Terminal fall velocity
        const maxFallSpeed = p.fastFalling ? 1400 : 850;
        if (p.vy > maxFallSpeed) p.vy = maxFallSpeed;

        const prevPlayerBottom = p.y + p.height;
        p.y += p.vy * dt;
        const newPlayerBottom = p.y + p.height;

        // Squash & stretch recovery
        p.scaleX += (1 - p.scaleX) * Math.min(1, 10 * dt);
        p.scaleY += (1 - p.scaleY) * Math.min(1, 10 * dt);

        // ----------------------------------------
        // 2. PLATFORM MOVEMENT & COLLISION
        // ----------------------------------------
        for (const plat of state.platforms) {
          // Horizontal movement for moving platforms
          if (plat.type === 'moving' && !plat.broken) {
            plat.x += plat.vx * dt;
            if (plat.x <= 15) {
              plat.x = 15;
              plat.vx = Math.abs(plat.vx);
            } else if (plat.x + plat.width >= VIRTUAL_WIDTH - 15) {
              plat.x = VIRTUAL_WIDTH - 15 - plat.width;
              plat.vx = -Math.abs(plat.vx);
            }
          }

          // Squash reset on platform
          if (plat.squash && plat.squash !== 1) {
            plat.squash += (1 - plat.squash) * Math.min(1, 12 * dt);
          }

          // Spring animation reset
          if (plat.springScaleY && plat.springScaleY > 1) {
            plat.springScaleY += (1 - plat.springScaleY) * Math.min(1, 8 * dt);
          }

          // Breakable platform crumble update
          if (plat.broken && plat.breakProgress !== undefined) {
            plat.breakProgress += dt * 3;
            plat.y += 180 * dt;
          }

          // Landing Collision: Only if falling downwards, not fast-falling through, and crossing platform top
          if (p.vy > 0 && !p.fastFalling && !plat.broken) {
            const footX = p.x + p.width / 2;
            const withinPlatformX = footX >= plat.x - 4 && footX <= plat.x + plat.width + 4;

            // One-way pass-through collision: check if feet crossed the top edge of the platform
            if (withinPlatformX && prevPlayerBottom <= plat.y + 14 && newPlayerBottom >= plat.y) {
              // LANDED!
              p.y = plat.y - p.height;
              plat.squash = 0.7;
              p.canAirFlutter = true;

              if (plat.type === 'breakable') {
                // Breakable platform snaps!
                plat.broken = true;
                plat.breakProgress = 0;
                sounds.playBreak();
                addParticles(plat.x + plat.width / 2, plat.y + 6, 14, 'debris');
                // Give tiny hop or fall through
                p.vy = 80;
              } else if (plat.hasSpring && Math.abs(footX - (plat.x + plat.width / 2)) < 22) {
                // SUPER SPRING BOUNCE!
                plat.springActive = true;
                plat.springScaleY = 2.4;
                p.vy = SPRING_IMPULSE;
                p.scaleX = 0.65;
                p.scaleY = 1.45;
                p.lastJumpType = 'spring';
                state.stats.boosts++;
                sounds.playSpring();
                addParticles(footX, plat.y, 22, 'stars');
              } else if (state.keys.up) {
                // W KEY BOOST JUMP!
                p.vy = BOOST_IMPULSE;
                p.scaleX = 0.7;
                p.scaleY = 1.4;
                p.lastJumpType = 'boost';
                state.stats.boosts++;
                sounds.playBoostJump();
                addParticles(footX, plat.y + 8, 16, 'stars');
              } else {
                // NORMAL BOUNCE
                p.vy = BOUNCE_IMPULSE;
                p.scaleX = 0.8;
                p.scaleY = 1.25;
                p.lastJumpType = 'normal';
                state.stats.jumps++;
                sounds.playBounce();
                addParticles(footX, plat.y + 8, 8, 'dust');
              }
              break;
            }
          }
        }

        // ----------------------------------------
        // 3. CAMERA TRACKING & SCORING
        // ----------------------------------------
        // Camera triggers upward when player reaches the top 36% of the screen
        const cameraThresholdY = state.cameraY + VIRTUAL_HEIGHT * 0.36;
        if (p.y < cameraThresholdY) {
          const diff = cameraThresholdY - p.y;
          state.cameraY -= diff;
        }

        // Update minimum altitude reached
        if (p.y < state.minPlayerY) {
          state.minPlayerY = p.y;
          const currentScore = Math.max(0, Math.floor(-state.minPlayerY / 10));
          setScore(currentScore);

          // Spawn new platforms higher up
          generatePlatformsUpTo(state.cameraY - VIRTUAL_HEIGHT * 0.7);
        }

        // ----------------------------------------
        // 4. GAME OVER CHECK
        // ----------------------------------------
        // If player falls below the bottom of camera view
        if (p.y > state.cameraY + VIRTUAL_HEIGHT + 60) {
          state.gameState = 'GAME_OVER';
          setGameState('GAME_OVER');
          sounds.playGameOver();

          const finalScore = Math.max(0, Math.floor(-state.minPlayerY / 10));
          setStats({
            jumps: state.stats.jumps,
            boosts: state.stats.boosts,
            maxAltitude: finalScore
          });

          // Check and save High Score
          if (finalScore > highScore) {
            setHighScore(finalScore);
            setIsNewRecord(true);
            try {
              localStorage.setItem('doodle_jump_high_score', finalScore.toString());
            } catch {
              // LocalStorage quota or restricted
            }
            addParticles(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2, 40, 'confetti');
          }
        }
      }

      // ----------------------------------------
      // 5. UPDATE PARTICLES
      // ----------------------------------------
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.life += dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

        if (pt.life >= pt.maxLife) {
          state.particles.splice(i, 1);
        }
      }

      // ----------------------------------------
      // 6. RENDER CANVAS
      // ----------------------------------------
      ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      // Background Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
      skyGrad.addColorStop(0, '#0F172A'); // Slate 900
      skyGrad.addColorStop(1, '#020617'); // Slate 950
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      // Subtle Grid / Notebook lines for altitude sensation
      ctx.save();
      const gridSpacing = 40;
      const offsetY = -(state.cameraY % gridSpacing);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      for (let y = offsetY; y < VIRTUAL_HEIGHT; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(VIRTUAL_WIDTH, y);
        ctx.stroke();
      }

      // Altitude meter markers on right edge
      const altitudeStep = 200;
      const startMarker = Math.floor((state.cameraY) / altitudeStep) * altitudeStep;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      for (let markerY = startMarker; markerY < state.cameraY + VIRTUAL_HEIGHT; markerY += altitudeStep) {
        const screenY = markerY - state.cameraY;
        const altitudeNum = Math.max(0, Math.floor(-markerY / 10));
        if (screenY > 30 && screenY < VIRTUAL_HEIGHT - 20 && altitudeNum > 0) {
          ctx.fillText(`${altitudeNum}m`, VIRTUAL_WIDTH - 12, screenY);
          ctx.beginPath();
          ctx.moveTo(VIRTUAL_WIDTH - 6, screenY - 3);
          ctx.lineTo(VIRTUAL_WIDTH, screenY - 3);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Transform context to Camera View
      ctx.save();
      ctx.translate(0, -state.cameraY);

      // Render Platforms
      for (const plat of state.platforms) {
        const squash = plat.squash ?? 1;
        const h = plat.height * squash;
        const yAdjust = plat.y + (plat.height - h);

        ctx.save();
        if (plat.broken) {
          // Shattered Platform halves
          const progress = plat.breakProgress ?? 0;
          ctx.globalAlpha = Math.max(0, 1 - progress);

          // Left half
          ctx.fillStyle = '#92400E';
          ctx.beginPath();
          ctx.roundRect(plat.x - progress * 15, yAdjust + progress * 40, plat.width / 2 - 2, h, 4);
          ctx.fill();

          // Right half
          ctx.beginPath();
          ctx.roundRect(plat.x + plat.width / 2 + progress * 15, yAdjust + progress * 40, plat.width / 2 - 2, h, 4);
          ctx.fill();
        } else {
          // Platform Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.roundRect(plat.x, yAdjust + 4, plat.width, h, 6);
          ctx.fill();

          // Platform Body
          if (plat.type === 'standard') {
            const grad = ctx.createLinearGradient(plat.x, yAdjust, plat.x, yAdjust + h);
            grad.addColorStop(0, '#34D399'); // Emerald 400
            grad.addColorStop(1, '#059669'); // Emerald 600
            ctx.fillStyle = grad;
          } else if (plat.type === 'moving') {
            const grad = ctx.createLinearGradient(plat.x, yAdjust, plat.x, yAdjust + h);
            grad.addColorStop(0, '#60A5FA'); // Blue 400
            grad.addColorStop(1, '#2563EB'); // Blue 600
            ctx.fillStyle = grad;
          } else if (plat.type === 'breakable') {
            const grad = ctx.createLinearGradient(plat.x, yAdjust, plat.x, yAdjust + h);
            grad.addColorStop(0, '#D97706'); // Amber 600
            grad.addColorStop(1, '#92400E'); // Amber 800
            ctx.fillStyle = grad;
          }

          ctx.beginPath();
          ctx.roundRect(plat.x, yAdjust, plat.width, h, 6);
          ctx.fill();

          // Top highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.roundRect(plat.x + 4, yAdjust + 2, plat.width - 8, 3, 2);
          ctx.fill();

          // Platform Details: Grips / Chevrons
          if (plat.type === 'moving') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // Arrow indicator
            const midX = plat.x + plat.width / 2;
            const dir = Math.sign(plat.vx);
            ctx.moveTo(midX - 6 * dir, yAdjust + h / 2);
            ctx.lineTo(midX + 6 * dir, yAdjust + h / 2);
            ctx.lineTo(midX + 2 * dir, yAdjust + h / 2 - 3);
            ctx.moveTo(midX + 6 * dir, yAdjust + h / 2);
            ctx.lineTo(midX + 2 * dir, yAdjust + h / 2 + 3);
            ctx.stroke();
          } else if (plat.type === 'breakable') {
            // Jagged crack in middle
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const midX = plat.x + plat.width / 2;
            ctx.moveTo(midX - 4, yAdjust + 2);
            ctx.lineTo(midX + 2, yAdjust + h / 2);
            ctx.lineTo(midX - 2, yAdjust + h - 2);
            ctx.stroke();
          }

          // Spring on top of platform
          if (plat.hasSpring) {
            const sx = plat.x + plat.width / 2 - 8;
            const sy = yAdjust;
            const sScale = plat.springScaleY || 1;
            const springH = 12 * sScale;

            ctx.save();
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + 16, sy - springH * 0.33);
            ctx.lineTo(sx, sy - springH * 0.66);
            ctx.lineTo(sx + 16, sy - springH);
            ctx.stroke();

            // Spring cap
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.roundRect(sx - 2, sy - springH - 3, 20, 4, 2);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.restore();
      }

      // Render Particles
      for (const pt of state.particles) {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;

        if (pt.shape === 'star') {
          // Render 4-point sparkle
          ctx.translate(pt.x, pt.y);
          ctx.beginPath();
          for (let s = 0; s < 4; s++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(0, -pt.size);
            ctx.lineTo(pt.size * 0.3, 0);
          }
          ctx.closePath();
          ctx.fill();
        } else if (pt.shape === 'rect') {
          ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Render Player (with wrap-around ghost if crossing screen edges)
      const renderPlayerSprite = (x: number, y: number) => {
        const p = state.player;
        ctx.save();
        ctx.translate(x + p.width / 2, y + p.height / 2);
        ctx.scale(p.scaleX * p.facing, p.scaleY);

        // Fast fall thrust flame or speed streak
        if (p.fastFalling) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.beginPath();
          ctx.moveTo(-10, -p.height / 2);
          ctx.lineTo(0, -p.height / 2 - 16);
          ctx.lineTo(10, -p.height / 2);
          ctx.closePath();
          ctx.fill();
        }

        // Booster ring trail
        if (p.vy < -800) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, p.height / 2 + 6, 12, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, p.height / 2 + 2, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Little Feet / Legs
        ctx.fillStyle = '#047857'; // Deep emerald
        const legHop = p.vy < 0 ? -4 : 0;
        ctx.beginPath();
        ctx.roundRect(-14, p.height / 2 - 6 + legHop, 8, 10, 4);
        ctx.roundRect(6, p.height / 2 - 6 + legHop, 8, 10, 4);
        ctx.fill();

        // Main Body (Cute Doodler)
        const bodyGrad = ctx.createLinearGradient(0, -p.height / 2, 0, p.height / 2);
        bodyGrad.addColorStop(0, '#10B981'); // Emerald 500
        bodyGrad.addColorStop(1, '#059669'); // Emerald 600
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 16);
        ctx.fill();

        // Belly highlight
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.roundRect(-p.width / 2 + 6, -p.height / 2 + 10, p.width - 12, p.height - 18, 10);
        ctx.fill();

        // Snout / Nose
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.roundRect(8, -2, 16, 12, 6);
        ctx.fill();

        // Snout Tip Hole
        ctx.fillStyle = '#064E3B';
        ctx.beginPath();
        ctx.arc(22, 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (Expressive Goggles)
        // Left Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(4, -8, 6.5, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(6, -8, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eye Shine
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(7, -9.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Right Eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-8, -8, 6.5, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(-6, -8, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eye Shine
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-5, -9.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Cute Blush Cheek
        ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.beginPath();
        ctx.arc(2, 6, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Primary player draw
      renderPlayerSprite(state.player.x, state.player.y);

      // Ghost player wrap-around draw if crossing boundary
      if (state.player.x < 0) {
        renderPlayerSprite(state.player.x + VIRTUAL_WIDTH, state.player.y);
      } else if (state.player.x + state.player.width > VIRTUAL_WIDTH) {
        renderPlayerSprite(state.player.x - VIRTUAL_WIDTH, state.player.y);
      }

      ctx.restore(); // Restore Camera transform
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [addParticles, generatePlatformsUpTo, highScore]);

  // Touch handlers for mobile / tablet support
  const handleTouchStart = (action: 'left' | 'right' | 'up' | 'down') => {
    gameRef.current.keys[action] = true;
    setActiveKeys(prev => ({ ...prev, [action]: true }));
    if (action === 'up' && gameRef.current.gameState === 'START') {
      initGame();
    }
  };

  const handleTouchEnd = (action: 'left' | 'right' | 'up' | 'down') => {
    gameRef.current.keys[action] = false;
    setActiveKeys(prev => ({ ...prev, [action]: false }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-2 sm:p-4 select-none touch-none">
      {/* Game Wrapper with Aspect Ratio Lock */}
      <div className="relative w-full max-w-[480px] aspect-[480/760] max-h-[92vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        
        {/* Top Header / HUD */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent backdrop-blur-xs">
          {/* Brand & Score */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold tracking-tight text-emerald-400">DOODLE WASD</span>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-1.5 font-mono text-lg font-bold text-white tabular-nums">
              <span>{score}</span>
              <span className="text-xs text-slate-400 font-sans font-normal">m</span>
            </div>
          </div>

          {/* High Score & Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-mono tabular-nums">
              <Trophy className="w-3.5 h-3.5" />
              <span>{Math.max(highScore, score)}</span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute' : 'Unmute'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>

            {/* Restart button */}
            <button
              onClick={initGame}
              className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Restart (R)"
              aria-label="Restart Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* HTML5 Canvas Element */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-slate-950"
          style={{ imageRendering: 'crisp-edges' }}
        />

        {/* START OVERLAY */}
        {gameState === 'START' && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              DOODLE JUMP
            </h1>
            <p className="text-xs uppercase font-bold tracking-widest text-emerald-400 mb-6">
              WASD Physics Edition
            </p>

            {/* Key Map Infographic */}
            <div className="w-full max-w-xs bg-slate-900/90 rounded-xl p-4 border border-slate-800 mb-6 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Move Left / Right</span>
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-white font-bold">A / D</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Boost Jump (On Bounce)</span>
                <span className="font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">W</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Fast Fall (Drop Through)</span>
                <span className="font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-bold">S</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-500">Screen Wrap</span>
                <span className="text-slate-300 text-[11px]">Edges loop around</span>
              </div>
            </div>

            <button
              onClick={initGame}
              className="w-full max-w-xs py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              START GAME (SPACE)
            </button>

            {highScore > 0 && (
              <p className="mt-4 text-xs text-slate-400 font-mono">
                Current Best: <span className="text-amber-400 font-bold">{highScore}m</span>
              </p>
            )}
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 z-30 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            {isNewRecord ? (
              <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold animate-pulse">
                <Trophy className="w-3.5 h-3.5" />
                NEW HIGH SCORE!
              </div>
            ) : (
              <span className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-1">
                Run Ended
              </span>
            )}

            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">GAME OVER</h2>

            {/* Score Showcase */}
            <div className="my-5 p-4 rounded-xl bg-slate-900 border border-slate-800 w-full max-w-xs">
              <span className="text-xs text-slate-400">Final Altitude</span>
              <div className="text-4xl font-black font-mono text-emerald-400 tabular-nums mt-1">
                {score}<span className="text-lg text-slate-400 font-normal ml-1">m</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                <span>Best Record:</span>
                <span className="font-mono text-amber-400 font-bold">{highScore}m</span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>Bounces / Boosts:</span>
                <span className="font-mono text-slate-200">{stats.jumps} / {stats.boosts}</span>
              </div>
            </div>

            <button
              onClick={initGame}
              className="w-full max-w-xs py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              PLAY AGAIN (R / SPACE)
            </button>
          </div>
        )}

        {/* PAUSE OVERLAY */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">GAME PAUSED</h2>
            <button
              onClick={() => {
                gameRef.current.gameState = 'PLAYING';
                gameRef.current.lastTime = performance.now();
                setGameState('PLAYING');
              }}
              className="py-3 px-8 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              RESUME (P)
            </button>
          </div>
        )}

        {/* ON-SCREEN ACTIVE KEY HUD INDICATOR */}
        <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity pointer-events-none">
          <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold border transition-colors ${
            activeKeys.left ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900/80 text-slate-400 border-slate-700'
          }`}>
            A
          </div>
          <div className="flex flex-col gap-1">
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold border transition-colors ${
              activeKeys.up ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900/80 text-slate-400 border-slate-700'
            }`}>
              W
            </div>
            <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold border transition-colors ${
              activeKeys.down ? 'bg-rose-500 text-slate-950 border-rose-400' : 'bg-slate-900/80 text-slate-400 border-slate-700'
            }`}>
              S
            </div>
          </div>
          <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold border transition-colors ${
            activeKeys.right ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900/80 text-slate-400 border-slate-700'
          }`}>
            D
          </div>
        </div>

        {/* TOUCH CONTROLS (Rendered for mobile / touch devices) */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex sm:hidden justify-between px-6 pointer-events-auto">
          {/* Left / Right Buttons */}
          <div className="flex items-center gap-3">
            <button
              onPointerDown={() => handleTouchStart('left')}
              onPointerUp={() => handleTouchEnd('left')}
              onPointerLeave={() => handleTouchEnd('left')}
              className="w-14 h-14 rounded-2xl bg-slate-800/80 active:bg-emerald-500 border border-slate-700 flex items-center justify-center text-white active:text-slate-950 shadow-lg cursor-pointer"
              aria-label="Move Left"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => handleTouchStart('right')}
              onPointerUp={() => handleTouchEnd('right')}
              onPointerLeave={() => handleTouchEnd('right')}
              className="w-14 h-14 rounded-2xl bg-slate-800/80 active:bg-emerald-500 border border-slate-700 flex items-center justify-center text-white active:text-slate-950 shadow-lg cursor-pointer"
              aria-label="Move Right"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          {/* Action Buttons (W Boost & S Drop) */}
          <div className="flex items-center gap-3">
            <button
              onPointerDown={() => handleTouchStart('down')}
              onPointerUp={() => handleTouchEnd('down')}
              onPointerLeave={() => handleTouchEnd('down')}
              className="w-14 h-14 rounded-2xl bg-rose-950/60 active:bg-rose-500 border border-rose-800/60 flex items-center justify-center text-rose-300 active:text-slate-950 shadow-lg cursor-pointer"
              aria-label="Fast Fall"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => handleTouchStart('up')}
              onPointerUp={() => handleTouchEnd('up')}
              onPointerLeave={() => handleTouchEnd('up')}
              className="w-14 h-14 rounded-2xl bg-amber-950/60 active:bg-amber-500 border border-amber-800/60 flex items-center justify-center text-amber-300 active:text-slate-950 shadow-lg cursor-pointer"
              aria-label="W Boost"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
