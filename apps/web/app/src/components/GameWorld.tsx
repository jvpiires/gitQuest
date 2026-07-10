"use client";

import { useEffect, useRef } from "react";

export default function GameWorld() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initPhaser = async () => {
      const Phaser = (await import("phaser")).default;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: gameRef.current as HTMLElement,
        width: window.innerWidth,
        height: window.innerHeight,
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 0 } },
        },
        scene: {
          preload: function(this: Phaser.Scene) {
            // Carregamento de assets (placeholder)
          },
          create: function(this: Phaser.Scene) {
            this.add.text(20, 20, "REINO DO REI DEMONIO", { color: "#ffffff", fontSize: "32px" });
          }
        },
      };

      const game = new Phaser.Game(config);

      return () => game.destroy(true);
    };

    initPhaser();
  }, []);

  return <div ref={gameRef} className="w-full h-full" />;
}