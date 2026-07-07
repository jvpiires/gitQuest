"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser"; // Como tem ssr: false no Wrapper, podemos importar direto!
import { type ClassType, type User } from "@gitquest/database";

interface TibiaWorldProps {
  players: User[];
}

const TILE_SIZE = 32;

// Cores por classe (em formato hexadecimal para o Phaser)
const CLASS_COLORS: Record<ClassType, number> = {
  ASSASSIN: 0xa855f7, // Roxo
  MAGE: 0x3b82f6, // Azul
  CLERIC: 0xfef3c7, // Âmbar claro
  ARCHER: 0x10b981, // Esmeralda
};

const getClassColor = (classType: ClassType) =>
  CLASS_COLORS[classType] ?? 0x94a3b8;

// Escolhe a cor do tile do piso (parede na borda, madeira em xadrez no interior)
function getTileColor(
  x: number,
  y: number,
  cols: number,
  rows: number,
): number {
  const isBorder = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
  if (isBorder) return 0x334155; // slate-700 (parede de pedra)
  return (x + y) % 2 === 0 ? 0x6b4423 : 0x5d3a1f; // madeira clara / escura
}

// Cena principal do mundo. Usar uma classe evita os falsos positivos de `this`
// e mantém a lógica de piso e de players organizada.
class WorldScene extends Phaser.Scene {
  private readonly players: User[];

  constructor(players: User[]) {
    super("WorldScene");
    this.players = players;
  }

  create(): void {
    const { width, height } = this.scale;
    this.drawFloor(width, height);
    this.players.forEach((player) => this.spawnPlayer(player, width, height));
  }

  // --- 1. PISO EM TILES (madeira com paredes de pedra) ---
  private drawFloor(width: number, height: number): void {
    const rows = Math.ceil(height / TILE_SIZE);
    const cols = Math.ceil(width / TILE_SIZE);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          getTileColor(x, y, cols, rows),
        );
        // Linha de grade sutil para reforçar o visual de tabuleiro
        tile.setStrokeStyle(1, 0x000000, 0.12);
      }
    }
  }

  // --- 2. CRIA UM PLAYER (corpo + olhos + nameplate) ---
  private spawnPlayer(player: User, width: number, height: number): void {
    const startX = Phaser.Math.Between(80, width - 80);
    const startY = Phaser.Math.Between(80, height - 80);
    const color = getClassColor(player.class_type);

    // Container agrupa tudo para moverem juntos
    const container = this.add.container(startX, startY);

    const shadow = this.add.ellipse(0, 26, 34, 12, 0x000000, 0.35);

    const body = this.add.rectangle(0, 0, 32, 44, color);
    body.setStrokeStyle(2, 0x0f172a);

    const leftEye = this.add.rectangle(-6, -6, 5, 7, 0x0f172a);
    const rightEye = this.add.rectangle(6, -6, 5, 7, 0x0f172a);

    const nameBg = this.add.rectangle(0, -46, 128, 34, 0x020617, 0.8);
    nameBg.setStrokeStyle(1, 0x475569);

    const nameText = this.add
      .text(0, -52, player.gitlab_username, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e2e8f0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const statsText = this.add
      .text(0, -39, `Lv.${player.current_level} | ${player.total_xp} XP`, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#34d399",
      })
      .setOrigin(0.5);

    container.add([
      shadow,
      body,
      leftEye,
      rightEye,
      nameBg,
      nameText,
      statsText,
    ]);

    // Inicia a patrulha com um pequeno atraso aleatório
    this.time.delayedCall(Phaser.Math.Between(0, 1500), () =>
      this.patrol(container, width, height),
    );
  }

  // --- 3. PATRULHA: move para pontos aleatórios em loop ---
  private patrol(
    container: Phaser.GameObjects.Container,
    width: number,
    height: number,
  ): void {
    const targetX = Phaser.Math.Between(60, width - 60);
    const targetY = Phaser.Math.Between(60, height - 60);
    const distance = Phaser.Math.Distance.Between(
      container.x,
      container.y,
      targetX,
      targetY,
    );

    this.tweens.add({
      targets: container,
      x: targetX,
      y: targetY,
      duration: distance * 12 + 500, // velocidade ~constante
      ease: "Sine.easeInOut",
      onComplete: () =>
        this.time.delayedCall(Phaser.Math.Between(500, 2500), () =>
          this.patrol(container, width, height),
        ),
    });
  }
}

export default function TibiaWorld({ players }: Readonly<TibiaWorldProps>) {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Evita inicializar o Phaser duas vezes (comum no React Strict Mode)
    if (!gameRef.current || gameInstance.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#0f172a", // Fundo slate-900
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: new WorldScene(players),
    };

    // Inicializa o jogo
    gameInstance.current = new Phaser.Game(config);

    // Limpeza rigorosa quando o componente desmontar
    return () => {
      if (gameInstance.current) {
        gameInstance.current.destroy(true);
        gameInstance.current = null;
      }
    };
  }, [players]);

  return <div ref={gameRef} className="absolute inset-0 w-full h-full" />;
}