"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser"; // Como tem ssr: false no Wrapper, podemos importar direto!
import { type GameItem, type User } from "@gitquest/database";
import { createPlayerContainer } from "./PlayerSprite";

// Mapa userId -> itens equipados, para desenhar o visual de cada avatar.
export type EquippedMap = Record<string, GameItem[]>;

interface TibiaWorldProps {
  players: User[];
  equippedByUser?: EquippedMap;
}

// --- CONFIGURAÇÃO ISOMÉTRICA (estilo Habbo Hotel) ---
// Cada tile é um losango. A largura é o dobro da altura (projeção 2:1 clássica).
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const TILE_DEPTH = 8; // espessura da lateral do tile, dá o efeito de "chão elevado"
const GRID_COLS = 22; // salão maior no eixo X
const GRID_ROWS = 22; // salão maior no eixo Y

// Converte coordenadas do grid (coluna/linha) para pixel na tela (projeção iso).
function gridToScreen(col: number, row: number) {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

// Cores em xadrez para o piso do salão (dois tons de azulejo estilo Habbo).
function getFloorColor(col: number, row: number): number {
  // Cria um "tapete" central mais quente para dar vida ao ambiente.
  const inRug =
    col >= 6 && col <= GRID_COLS - 7 && row >= 6 && row <= GRID_ROWS - 7;
  if (inRug) {
    return (col + row) % 2 === 0 ? 0xf59e0b : 0xd97706; // amber-500 / amber-600
  }
  return (col + row) % 2 === 0 ? 0x38bdf8 : 0x0ea5e9; // sky-400 / sky-500
}

// Cena principal do mundo. Usar uma classe evita os falsos positivos de `this`
// e mantém a lógica de piso e de players organizada.
class WorldScene extends Phaser.Scene {
  private readonly players: User[];
  private readonly equippedByUser: EquippedMap;

  // Deslocamento para centralizar o grid iso na tela.
  private originX = 0;
  private originY = 0;

  constructor(players: User[], equippedByUser: EquippedMap) {
    super("WorldScene");
    this.players = players;
    this.equippedByUser = equippedByUser;
  }

  create(): void {
    const { width, height } = this.scale;

    // Centraliza o grid: o centro horizontal fica no meio da tela e sobra um
    // respiro no topo para os avatares/nameplates.
    this.originX = width / 2;
    this.originY = height / 2 - (GRID_ROWS * TILE_HEIGHT) / 2;

    this.drawFloor();
    this.drawDecorations();
    this.players.forEach((player) => this.spawnPlayer(player));
  }

  // --- 1. PISO ISOMÉTRICO (losangos com profundidade, estilo Habbo) ---
  private drawFloor(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.drawTile(col, row);
      }
    }
  }

  // Desenha um único tile em losango, com o topo e as duas laterais visíveis.
  private drawTile(col: number, row: number): void {
    const { x, y } = gridToScreen(col, row);
    const px = this.originX + x;
    const py = this.originY + y;
    const topColor = getFloorColor(col, row);

    // Ordena por profundidade: tiles "mais ao fundo" ficam atrás.
    const depth = col + row;

    // Pontos do losango do topo (sentido horário a partir do topo).
    const top = { x: px, y: py };
    const right = { x: px + TILE_WIDTH / 2, y: py + TILE_HEIGHT / 2 };
    const bottom = { x: px, y: py + TILE_HEIGHT };
    const left = { x: px - TILE_WIDTH / 2, y: py + TILE_HEIGHT / 2 };

    // Face lateral esquerda (tom mais escuro para simular sombra).
    const leftFace = this.add.polygon(
      0,
      0,
      [
        left.x,
        left.y,
        bottom.x,
        bottom.y,
        bottom.x,
        bottom.y + TILE_DEPTH,
        left.x,
        left.y + TILE_DEPTH,
      ],
      Phaser.Display.Color.ValueToColor(topColor).darken(40).color,
    );
    leftFace.setOrigin(0, 0).setDepth(depth);

    // Face lateral direita (tom intermediário).
    const rightFace = this.add.polygon(
      0,
      0,
      [
        right.x,
        right.y,
        bottom.x,
        bottom.y,
        bottom.x,
        bottom.y + TILE_DEPTH,
        right.x,
        right.y + TILE_DEPTH,
      ],
      Phaser.Display.Color.ValueToColor(topColor).darken(20).color,
    );
    rightFace.setOrigin(0, 0).setDepth(depth);

    // Topo do tile (losango).
    const topFace = this.add.polygon(
      0,
      0,
      [top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y],
      topColor,
    );
    topFace.setOrigin(0, 0).setDepth(depth);
    topFace.setStrokeStyle(1, 0x0f172a, 0.25); // contorno sutil do azulejo
  }

  // Posição em pixel do centro de um tile (usada por decorações e players).
  private tileCenter(col: number, row: number): { x: number; y: number } {
    const { x, y } = gridToScreen(col, row);
    return {
      x: this.originX + x,
      y: this.originY + y + TILE_HEIGHT / 2,
    };
  }

  // --- 1b. DECORAÇÕES: dão vida ao salão (plantas, tapete, tocha, fonte) ---
  private drawDecorations(): void {
    // Plantas nos quatro cantos internos do salão.
    const corners: Array<[number, number]> = [
      [1, 1],
      [GRID_COLS - 2, 1],
      [1, GRID_ROWS - 2],
      [GRID_COLS - 2, GRID_ROWS - 2],
    ];
    corners.forEach(([c, r]) => this.drawPlant(c, r));

    // Tochas nas laterais para iluminar o ambiente.
    this.drawTorch(0, Math.floor(GRID_ROWS / 2));
    this.drawTorch(GRID_COLS - 1, Math.floor(GRID_ROWS / 2));
  }

  // Vaso com planta (bloco iso simples).
  private drawPlant(col: number, row: number): void {
    const { x, y } = this.tileCenter(col, row);
    const depth = (col + row) * 10 + 1;

    this.add.ellipse(x, y, 22, 12, 0x92400e).setDepth(depth); // vaso
    this.add.rectangle(x, y - 12, 4, 20, 0x166534).setDepth(depth); // caule
    const leaves = this.add.circle(x, y - 24, 12, 0x22c55e).setDepth(depth);
    leaves.setStrokeStyle(2, 0x14532d); // folhagem
  }

  // Tocha de parede com chama pulsante.
  private drawTorch(col: number, row: number): void {
    const { x, y } = this.tileCenter(col, row);
    const depth = (col + row) * 10 + 1;

    this.add.rectangle(x, y - 14, 5, 26, 0x451a03).setDepth(depth);
    const flame = this.add.ellipse(x, y - 30, 12, 18, 0xf97316).setDepth(depth);
    const glow = this.add.ellipse(x, y - 30, 34, 34, 0xfb923c, 0.18).setDepth(depth);

    // Chama "viva": pulsa de tamanho e brilho continuamente.
    this.tweens.add({
      targets: flame,
      scaleY: 1.25,
      scaleX: 0.85,
      yoyo: true,
      repeat: -1,
      duration: 420,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut",
    });
  }


  // --- 2. CRIA UM PLAYER (avatar iso vem de PlayerSprite, por classe) ---
  private spawnPlayer(player: User): void {
    // Nasce em um tile aleatório dentro do grid.
    const col = Phaser.Math.Between(1, GRID_COLS - 2);
    const row = Phaser.Math.Between(1, GRID_ROWS - 2);
    const { x, y } = this.tileCenter(col, row);

    // O avatar é criado em seu próprio container (separado do cenário) para
    // que a aparência por classe evolua sem mexer na lógica do mundo.
    const equipped = this.equippedByUser[player.id] ?? [];
    const container = createPlayerContainer(this, player, equipped);
    container.setPosition(x, y);
    container.setData("col", col);
    container.setData("row", row);

    this.updatePlayerDepth(container, col, row);

    // Inicia a caminhada com um pequeno atraso aleatório.
    this.time.delayedCall(Phaser.Math.Between(0, 1500), () =>
      this.walk(container),
    );
  }

  // Mantém o avatar sempre à frente dos tiles que ele pisa (depth sorting iso).
  private updatePlayerDepth(
    container: Phaser.GameObjects.Container,
    col: number,
    row: number,
  ): void {
    container.setDepth((col + row) * 10 + 5);
  }

  // --- 3. CAMINHADA: anda um tile por vez para vizinhos válidos ---
  private walk(container: Phaser.GameObjects.Container): void {
    const col = container.getData("col") as number;
    const row = container.getData("row") as number;

    // Vizinhos ortogonais no grid (N/S/L/O em coordenadas iso).
    const moves = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
    ].filter(({ dc, dr }) => {
      const nc = col + dc;
      const nr = row + dr;
      return nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS;
    });

    const { dc, dr } = Phaser.Utils.Array.GetRandom(moves);
    const nextCol = col + dc;
    const nextRow = row + dr;
    const { x: targetX, y: targetY } = this.tileCenter(nextCol, nextRow);

    // Atualiza a profundidade no meio do passo para a sobreposição ficar correta.
    this.updatePlayerDepth(container, nextCol, nextRow);

    this.tweens.add({
      targets: container,
      x: targetX,
      y: targetY,
      duration: 600, // um passo por tile, ritmo tranquilo
      ease: "Sine.easeInOut",
      onComplete: () => {
        container.setData("col", nextCol);
        container.setData("row", nextRow);
        this.time.delayedCall(Phaser.Math.Between(300, 2000), () =>
          this.walk(container),
        );
      },
    });
  }
}

export default function TibiaWorld({
  players,
  equippedByUser = {},
}: Readonly<TibiaWorldProps>) {
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
      // Desabilita o áudio: o jogo não usa som e isso evita o erro
      // "Cannot suspend a closed AudioContext" no unmount do React Strict Mode.
      audio: {
        noAudio: true,
      },
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
      scene: new WorldScene(players, equippedByUser),
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
  }, [players, equippedByUser]);

  return <div ref={gameRef} className="absolute inset-0 w-full h-full" />;
}