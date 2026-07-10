"use client";

import { useEffect, useRef } from "react";
import { HERO_CLASSES, levelFromXp } from "../lib/game/progression";
import type { WorldHero } from "../lib/game/types";

interface GameWorldProps {
  heroes: WorldHero[];
}

const MAP_COLUMNS = 18;
const MAP_ROWS = 18;
const TILE_WIDTH = 96;
const TILE_HEIGHT = 48;
const MAP_ORIGIN_X = 800;
const MAP_ORIGIN_Y = 125;

export default function GameWorld({ heroes }: GameWorldProps) {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | undefined;
    let disposed = false;

    const initPhaser = async () => {
      const Phaser = (await import("phaser")).default;
      if (disposed || !gameRef.current) return;

      const project = (column: number, row: number) => ({
        x: MAP_ORIGIN_X + (column - row) * (TILE_WIDTH / 2),
        y: MAP_ORIGIN_Y + (column + row) * (TILE_HEIGHT / 2),
      });

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameRef.current,
        width: 1600,
        height: 960,
        backgroundColor: "#0f172a",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: {
          create(this: Phaser.Scene) {
            const floor = this.add.graphics();
            const props = this.add.graphics();

            floor.fillStyle(0x0ea5e9, 1);
            floor.fillRect(0, 0, 1600, 960);
            floor.fillStyle(0x0f172a, 1);
            floor.fillRect(0, 0, 1600, 960);

            for (let column = 0; column < MAP_COLUMNS; column += 1) {
              for (let row = 0; row < MAP_ROWS; row += 1) {
                const point = project(column, row);
                const isArena = column >= 6 && column <= 11 && row >= 6 && row <= 11;
                const baseColor = isArena ? 0xf59e0b : (column + row) % 2 === 0 ? 0x38bdf8 : 0x0ea5e9;
                floor.fillStyle(baseColor, 1);
                floor.lineStyle(2, isArena ? 0xd97706 : 0x0284c7, 1);
                floor.beginPath();
                floor.moveTo(point.x, point.y);
                floor.lineTo(point.x + TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2);
                floor.lineTo(point.x, point.y + TILE_HEIGHT);
                floor.lineTo(point.x - TILE_WIDTH / 2, point.y + TILE_HEIGHT / 2);
                floor.closePath();
                floor.fillPath();
                floor.strokePath();
              }
            }

            // Elementos de cenário desenhados em código, sem depender de assets externos.
            [[1, 4], [4, 1], [14, 4], [16, 12], [8, 16]].forEach(([column, row]) => {
              const point = project(column, row);
              props.fillStyle(0x92400e, 1).fillEllipse(point.x, point.y + 30, 34, 14);
              props.fillStyle(0x22c55e, 1).fillCircle(point.x, point.y, 25);
              props.lineStyle(4, 0x14532d, 1).strokeCircle(point.x, point.y, 25);
            });

            const createHero = (hero: WorldHero, index: number) => {
              const point = project((index * 3 + 3) % 15, (index * 5 + 2) % 15);
              const palette = HERO_CLASSES[hero.heroClass];
              const sprite = this.add.container(point.x, point.y + 8);
              const avatar = this.add.graphics();
              avatar.fillStyle(0x111827, 1).fillRoundedRect(-18, -2, 36, 46, 5);
              avatar.fillStyle(0xffd7b5, 1).fillCircle(0, -12, 15);
              const outfitColor = hero.outfit === "midnight" ? 0x111827 : hero.outfit === "royal" ? 0xf59e0b : Number.parseInt(palette.color.slice(1), 16);
              avatar.fillStyle(outfitColor, 1).fillRoundedRect(-14, 1, 28, 35, 3);
              avatar.lineStyle(4, 0xffffff, 0.7).strokeRoundedRect(-14, 1, 28, 35, 3);
              sprite.add(avatar);

              const label = this.add.text(point.x, point.y - 56, `${hero.name}\nLv.${levelFromXp(hero.totalXp)}  |  ${hero.totalXp.toLocaleString("pt-BR")} XP`, {
                fontFamily: "monospace",
                fontSize: "16px",
                align: "center",
                color: "#e2e8f0",
                backgroundColor: "#0f172a",
                padding: { x: 10, y: 6 },
              }).setOrigin(0.5);

              return { sprite, label, hero };
            };

            const player = heroes.find((hero) => hero.isCurrentPlayer) || heroes[0];
            const otherHeroes = heroes.filter((hero) => hero.id !== player?.id);
            const playerEntity = player ? createHero({ ...player, isCurrentPlayer: true }, 8) : undefined;
            otherHeroes.slice(0, 11).forEach((hero, index) => createHero(hero, index));

            const banner = this.add.text(800, 490, "PRAÇA CENTRAL  •  caminhe com WASD, setas ou clique no chão", {
              fontFamily: "monospace", fontSize: "18px", color: "#fef3c7", backgroundColor: "#78350f", padding: { x: 18, y: 8 },
            }).setOrigin(0.5).setAlpha(0.9);

            if (!playerEntity) return;
            const cursors = this.input.keyboard?.createCursorKeys();
            const keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
            let target: Phaser.Math.Vector2 | undefined;

            this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
              target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
            });

            this.events.on("update", (_time: number, delta: number) => {
              const speed = 0.26 * delta;
              let dx = 0;
              let dy = 0;
              if (cursors?.left.isDown || keys.A.isDown) dx -= speed;
              if (cursors?.right.isDown || keys.D.isDown) dx += speed;
              if (cursors?.up.isDown || keys.W.isDown) dy -= speed;
              if (cursors?.down.isDown || keys.S.isDown) dy += speed;

              if (target && dx === 0 && dy === 0) {
                const distance = Phaser.Math.Distance.Between(playerEntity.sprite.x, playerEntity.sprite.y, target.x, target.y);
                if (distance < 4) target = undefined;
                else {
                  dx = ((target.x - playerEntity.sprite.x) / distance) * speed;
                  dy = ((target.y - playerEntity.sprite.y) / distance) * speed;
                }
              }

              if (dx || dy) {
                playerEntity.sprite.x = Phaser.Math.Clamp(playerEntity.sprite.x + dx, 120, 1480);
                playerEntity.sprite.y = Phaser.Math.Clamp(playerEntity.sprite.y + dy, 100, 870);
                playerEntity.label.setPosition(playerEntity.sprite.x, playerEntity.sprite.y - 56);
                banner.setText("PRAÇA CENTRAL  •  explorando o reino");
              }
            });
          },
        },
      };

      game = new Phaser.Game(config);
    };

    void initPhaser();
    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [heroes]);

  return <div ref={gameRef} className="h-full w-full" aria-label="Mundo isométrico do GitQuest" />;
}
