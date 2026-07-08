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
  currentUserId?: string | null;
}

// --- CONFIGURAÇÃO ISOMÉTRICA (estilo Habbo Hotel) ---
// Cada tile é um losango. A largura é o dobro da altura (projeção 2:1 clássica).
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const TILE_DEPTH = 8; // espessura da lateral do tile, dá o efeito de "chão elevado"
const GRID_COLS = 22; // salão maior no eixo X
const GRID_ROWS = 22; // salão maior no eixo Y
const ARENA_MIN_COL = 6;
const ARENA_MAX_COL = GRID_COLS - 7;
const ARENA_MIN_ROW = 6;
const ARENA_MAX_ROW = GRID_ROWS - 7;

function isArenaTile(col: number, row: number): boolean {
  return (
    col >= ARENA_MIN_COL &&
    col <= ARENA_MAX_COL &&
    row >= ARENA_MIN_ROW &&
    row <= ARENA_MAX_ROW
  );
}

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
  if (isArenaTile(col, row)) {
    return (col + row) % 2 === 0 ? 0xf59e0b : 0xd97706; // amber-500 / amber-600
  }
  return (col + row) % 2 === 0 ? 0x38bdf8 : 0x0ea5e9; // sky-400 / sky-500
}

interface BattleState {
  fighterA: Phaser.GameObjects.Container;
  fighterB: Phaser.GameObjects.Container;
  hpA: number;
  hpB: number;
  powerA: number;
  powerB: number;
  timer?: Phaser.Time.TimerEvent;
}

interface BattleHud {
  root: Phaser.GameObjects.Container;
  title: Phaser.GameObjects.Text;
  hpBarA: Phaser.GameObjects.Rectangle;
  hpBarB: Phaser.GameObjects.Rectangle;
  hpLabelA: Phaser.GameObjects.Text;
  hpLabelB: Phaser.GameObjects.Text;
  powerBarA: Phaser.GameObjects.Rectangle;
  powerBarB: Phaser.GameObjects.Rectangle;
}

// Cena principal do mundo. Usar uma classe evita os falsos positivos de `this`
// e mantém a lógica de piso e de players organizada.
class WorldScene extends Phaser.Scene {
  private readonly players: User[];
  private readonly equippedByUser: EquippedMap;
  private readonly currentUserId: string | null;
  private readonly playerContainers = new Map<string, Phaser.GameObjects.Container>();
  private activeBattle: BattleState | null = null;
  private battleHud: BattleHud | null = null;

  // Deslocamento para centralizar o grid iso na tela.
  private originX = 0;
  private originY = 0;

  constructor(
    players: User[],
    equippedByUser: EquippedMap,
    currentUserId: string | null,
  ) {
    super("WorldScene");
    this.players = players;
    this.equippedByUser = equippedByUser;
    this.currentUserId = currentUserId;
  }

  create(): void {
    const { width, height } = this.scale;

    // Centraliza o grid: o centro horizontal fica no meio da tela e sobra um
    // respiro no topo para os avatares/nameplates.
    this.originX = width / 2;
    this.originY = height / 2 - (GRID_ROWS * TILE_HEIGHT) / 2;

    this.drawFloor();
    this.drawArenaBanner();
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

  private drawArenaBanner(): void {
    const centerCol = Math.floor((ARENA_MIN_COL + ARENA_MAX_COL) / 2);
    const centerRow = Math.floor((ARENA_MIN_ROW + ARENA_MAX_ROW) / 2);
    const { x, y } = this.tileCenter(centerCol, centerRow);

    const bg = this.add.rectangle(x, y - 210, 280, 28, 0x7c2d12, 0.7);
    bg.setStrokeStyle(1, 0xf59e0b, 0.9).setDepth(5000);
    const text = this.add
      .text(x, y - 210, "ARENA BLOQUEADA - BATALHA POR DESAFIO", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#fde68a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(5001);

    this.tweens.add({
      targets: [bg, text],
      alpha: 0.5,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private randomNonArenaTile(): { col: number; row: number } {
    for (let attempt = 0; attempt < 60; attempt++) {
      const col = Phaser.Math.Between(1, GRID_COLS - 2);
      const row = Phaser.Math.Between(1, GRID_ROWS - 2);
      if (!isArenaTile(col, row)) {
        return { col, row };
      }
    }

    return { col: 1, row: 1 };
  }

  private showToast(message: string): void {
    const toastBg = this.add.rectangle(this.scale.width / 2, 60, 420, 34, 0x020617, 0.85);
    toastBg.setStrokeStyle(1, 0x334155, 0.9).setDepth(8000);
    const toastText = this.add
      .text(this.scale.width / 2, 60, message, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e2e8f0",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(8001);

    this.tweens.add({
      targets: [toastBg, toastText],
      alpha: 0,
      duration: 2200,
      ease: "Sine.easeOut",
      onComplete: () => {
        toastBg.destroy();
        toastText.destroy();
      },
    });
  }

  private moveToTile(
    container: Phaser.GameObjects.Container,
    col: number,
    row: number,
    duration: number,
    onComplete?: () => void,
  ): void {
    const { x: targetX, y: targetY } = this.tileCenter(col, row);
    this.updatePlayerDepth(container, col, row);

    this.tweens.killTweensOf(container);
    this.tweens.add({
      targets: container,
      x: targetX,
      y: targetY,
      duration,
      ease: "Sine.easeInOut",
      onComplete: () => {
        container.setData("col", col);
        container.setData("row", row);
        onComplete?.();
      },
    });
  }

  private updateKdaLabel(container: Phaser.GameObjects.Container): void {
    const kdaText = container.getData("kdaText") as Phaser.GameObjects.Text | undefined;
    if (!kdaText) return;

    const kills = Number(container.getData("kills") ?? 0);
    const deaths = Number(container.getData("deaths") ?? 0);
    kdaText.setText(`KDA ${kills}/${deaths}`);
  }

  private createBattleHud(state: BattleState): void {
    const x = this.scale.width / 2;
    const y = 118;
    const root = this.add.container(x, y).setDepth(9000);

    const bg = this.add.rectangle(0, 0, 560, 120, 0x020617, 0.86);
    bg.setStrokeStyle(2, 0x334155, 0.9);

    const nameA = String(state.fighterA.getData("userName") ?? "Aventureiro A");
    const nameB = String(state.fighterB.getData("userName") ?? "Aventureiro B");

    const title = this.add
      .text(0, -44, `${nameA} VS ${nameB}`, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#fbbf24",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const hpLabelA = this.add
      .text(-240, -18, "HP 100", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f8fafc",
      })
      .setOrigin(0, 0.5);
    const hpLabelB = this.add
      .text(240, -18, "HP 100", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f8fafc",
      })
      .setOrigin(1, 0.5);

    const hpBgA = this.add.rectangle(-120, -18, 220, 12, 0x1e293b, 1).setOrigin(0.5);
    const hpBgB = this.add.rectangle(120, -18, 220, 12, 0x1e293b, 1).setOrigin(0.5);
    const hpBarA = this.add.rectangle(-230, -18, 220, 12, 0x22c55e, 1).setOrigin(0, 0.5);
    const hpBarB = this.add.rectangle(10, -18, 220, 12, 0x22c55e, 1).setOrigin(0, 0.5);

    const powerBgA = this.add.rectangle(-120, 14, 220, 8, 0x1e293b, 1).setOrigin(0.5);
    const powerBgB = this.add.rectangle(120, 14, 220, 8, 0x1e293b, 1).setOrigin(0.5);
    const powerBarA = this.add
      .rectangle(-230, 14, Math.min(220, state.powerA * 2), 8, 0x38bdf8, 1)
      .setOrigin(0, 0.5);
    const powerBarB = this.add
      .rectangle(10, 14, Math.min(220, state.powerB * 2), 8, 0x38bdf8, 1)
      .setOrigin(0, 0.5);

    const powerLabel = this.add
      .text(0, 30, "PODER", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#7dd3fc",
      })
      .setOrigin(0.5);

    root.add([
      bg,
      title,
      hpLabelA,
      hpLabelB,
      hpBgA,
      hpBgB,
      hpBarA,
      hpBarB,
      powerBgA,
      powerBgB,
      powerBarA,
      powerBarB,
      powerLabel,
    ]);

    this.battleHud = {
      root,
      title,
      hpBarA,
      hpBarB,
      hpLabelA,
      hpLabelB,
      powerBarA,
      powerBarB,
    };
    this.updateBattleHud(state);
  }

  private updateBattleHud(state: BattleState): void {
    if (!this.battleHud) return;

    const hpA = Phaser.Math.Clamp(state.hpA, 0, 100);
    const hpB = Phaser.Math.Clamp(state.hpB, 0, 100);

    this.battleHud.hpBarA.width = hpA * 2.2;
    this.battleHud.hpBarB.width = hpB * 2.2;
    this.battleHud.hpBarA.fillColor = hpA > 35 ? 0x22c55e : 0xef4444;
    this.battleHud.hpBarB.fillColor = hpB > 35 ? 0x22c55e : 0xef4444;
    this.battleHud.hpLabelA.setText(`HP ${Math.floor(hpA)}`);
    this.battleHud.hpLabelB.setText(`HP ${Math.floor(hpB)}`);

    this.battleHud.powerBarA.width = Math.min(220, state.powerA * 2);
    this.battleHud.powerBarB.width = Math.min(220, state.powerB * 2);
  }

  private clearBattleHud(): void {
    if (!this.battleHud) return;
    this.battleHud.root.destroy(true);
    this.battleHud = null;
  }

  private finishBattle(winner: Phaser.GameObjects.Container, loser: Phaser.GameObjects.Container): void {
    const state = this.activeBattle;
    if (!state) return;

    state.timer?.remove(false);
    this.clearBattleHud();

    winner.setData("kills", Number(winner.getData("kills") ?? 0) + 1);
    loser.setData("deaths", Number(loser.getData("deaths") ?? 0) + 1);
    this.updateKdaLabel(winner);
    this.updateKdaLabel(loser);

    winner.setData("inBattle", false);
    loser.setData("inBattle", false);

    this.showToast(`${winner.getData("userName")} venceu o duelo na arena!`);

    [winner, loser].forEach((fighter) => {
      const tile = this.randomNonArenaTile();
      this.moveToTile(fighter, tile.col, tile.row, 700, () => {
        this.time.delayedCall(350, () => this.walk(fighter));
      });
    });

    this.activeBattle = null;
  }

  private startBattle(
    challenger: Phaser.GameObjects.Container,
    opponent: Phaser.GameObjects.Container,
  ): void {
    if (this.activeBattle) return;

    challenger.setData("inBattle", true);
    opponent.setData("inBattle", true);

    const arenaA = { col: 9, row: 10 };
    const arenaB = { col: 12, row: 10 };

    let arrived = 0;
    const onArrived = () => {
      arrived += 1;
      if (arrived < 2) return;

      const levelA = Number(challenger.getData("level") ?? 1);
      const levelB = Number(opponent.getData("level") ?? 1);
      const state: BattleState = {
        fighterA: challenger,
        fighterB: opponent,
        hpA: 100,
        hpB: 100,
        powerA: Phaser.Math.Clamp(40 + levelA * 2 + Phaser.Math.Between(0, 12), 20, 100),
        powerB: Phaser.Math.Clamp(40 + levelB * 2 + Phaser.Math.Between(0, 12), 20, 100),
      };
      this.activeBattle = state;
      this.createBattleHud(state);

      state.timer = this.time.addEvent({
        delay: 900,
        loop: true,
        callback: () => {
          if (!this.activeBattle) return;
          const damageAToB = Phaser.Math.Between(8, 18) + Math.floor(state.powerA / 20);
          const damageBToA = Phaser.Math.Between(8, 18) + Math.floor(state.powerB / 20);

          state.hpB -= damageAToB;
          state.hpA -= damageBToA;
          this.updateBattleHud(state);

          if (state.hpA <= 0 || state.hpB <= 0) {
            if (state.hpA === state.hpB) {
              state.hpA = 1;
            }
            const winner = state.hpA > state.hpB ? challenger : opponent;
            const loser = winner === challenger ? opponent : challenger;
            this.finishBattle(winner, loser);
          }
        },
      });
    };

    this.moveToTile(challenger, arenaA.col, arenaA.row, 650, onArrived);
    this.moveToTile(opponent, arenaB.col, arenaB.row, 650, onArrived);
  }

  private handlePlayerClick(target: Phaser.GameObjects.Container): void {
    if (this.activeBattle) {
      this.showToast("Arena ocupada. Aguarde o duelo atual terminar.");
      return;
    }

    if (!this.currentUserId) {
      this.showToast("Faça login para desafiar outro jogador.");
      return;
    }

    const targetId = String(target.getData("userId") ?? "");
    if (!targetId || targetId === this.currentUserId) return;

    const challenger = this.playerContainers.get(this.currentUserId);
    if (!challenger) {
      this.showToast("Seu avatar ainda não está no mapa.");
      return;
    }

    if (challenger.getData("inBattle") || target.getData("inBattle")) {
      this.showToast("Um dos jogadores já está em batalha.");
      return;
    }

    const targetName = String(target.getData("userName") ?? "Aventureiro");
    this.showToast(`Desafio enviado para ${targetName}...`);

    this.time.delayedCall(900, () => {
        const accepted = secureRandomUnit() > 0.2;
      if (!accepted) {
        this.showToast(`${targetName} recusou o desafio.`);
        return;
      }

      this.showToast(`${targetName} aceitou! Indo para a arena...`);
      this.startBattle(challenger, target);
    });
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
    // Nasce em um tile aleatório fora da arena central.
    const { col, row } = this.randomNonArenaTile();
    const { x, y } = this.tileCenter(col, row);

    // O avatar é criado em seu próprio container (separado do cenário) para
    // que a aparência por classe evolua sem mexer na lógica do mundo.
    const equipped = this.equippedByUser[player.id] ?? [];
    const container = createPlayerContainer(this, player, equipped);
    container.setPosition(x, y);
    container.setData("col", col);
    container.setData("row", row);
    container.setData("level", player.current_level);
    container.setData("inBattle", false);
    container.setSize(90, 120);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-45, -110, 90, 130),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerdown", () => this.handlePlayerClick(container));
    container.on("pointerover", () => this.input.setDefaultCursor("pointer"));
    container.on("pointerout", () => this.input.setDefaultCursor("default"));

    this.updatePlayerDepth(container, col, row);
    this.playerContainers.set(player.id, container);
    this.updateKdaLabel(container);

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
    if (container.getData("inBattle")) return;

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
      return (
        nc >= 0 &&
        nc < GRID_COLS &&
        nr >= 0 &&
        nr < GRID_ROWS &&
        !isArenaTile(nc, nr)
      );
    });

    if (moves.length === 0) {
      this.time.delayedCall(Phaser.Math.Between(300, 1200), () => this.walk(container));
      return;
    }

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
        if (container.getData("inBattle")) return;
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
  currentUserId = null,
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
      scene: new WorldScene(players, equippedByUser, currentUserId),
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
  }, [players, equippedByUser, currentUserId]);

  return <div ref={gameRef} className="absolute inset-0 w-full h-full" />;
}

function secureRandomUnit(): number {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return bytes[0] / 0xffffffff;
}