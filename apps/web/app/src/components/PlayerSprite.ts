import Phaser from "phaser";
import {
  type ClassType,
  type GameItem,
  type User,
} from "@gitquest/database";

// --- APARÊNCIA DO PLAYER POR CLASSE (estilo Habbo isométrico) ---
// Cada classe tem uma cor de corpo, uma cor de detalhe e um "chapéu"/acessório
// próprio, para que dê para distinguir o herói só de olhar.
interface ClassStyle {
  body: number; // cor principal da roupa
  accent: number; // cor do detalhe (cabeça/acessório)
  emoji: string; // ícone flutuante que reforça a classe
}

const CLASS_STYLES: Record<ClassType, ClassStyle> = {
  ASSASSIN: { body: 0x7c3aed, accent: 0x4c1d95, emoji: "🗡️" }, // Roxo
  MAGE: { body: 0x2563eb, accent: 0x1e3a8a, emoji: "🔮" }, // Azul
  CLERIC: { body: 0xfacc15, accent: 0xf59e0b, emoji: "✝️" }, // Dourado
  ARCHER: { body: 0x059669, accent: 0x064e3b, emoji: "🏹" }, // Verde
};

const getClassStyle = (classType: ClassType): ClassStyle =>
  CLASS_STYLES[classType] ?? { body: 0x94a3b8, accent: 0x475569, emoji: "🛡️" };

const BODY_HEIGHT = 34;

// Adiciona um pulso de brilho (alpha) a um objeto — usado em itens com glow.
function applyGlow(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { setAlpha?: (v: number) => void },
): void {
  scene.tweens.add({
    targets: target,
    alpha: 0.5,
    yoyo: true,
    repeat: -1,
    duration: 700,
    ease: "Sine.easeInOut",
  });
}

// Faz um objeto "respirar" de escala, dando vida à aura/capa.
function applyPulseScale(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & {
    setScale?: (x: number, y?: number) => void;
  },
  from = 0.9,
  to = 1.12,
): void {
  if (target.setScale) target.setScale(from);
  scene.tweens.add({
    targets: target,
    scaleX: to,
    scaleY: to,
    yoyo: true,
    repeat: -1,
    duration: 1100,
    ease: "Sine.easeInOut",
  });
}

// Gira um objeto continuamente (halo/anéis da aura).
function applySpin(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  duration = 6000,
): void {
  scene.tweens.add({
    targets: target,
    angle: 360,
    repeat: -1,
    duration,
    ease: "Linear",
  });
}

// Desenha um item equipado no slot correspondente e retorna os objetos criados
// para serem adicionados ao container do avatar.
function drawEquippedItem(
  scene: Phaser.Scene,
  item: GameItem,
): Phaser.GameObjects.GameObject[] {
  const objects: Phaser.GameObjects.GameObject[] = [];

  switch (item.slot) {
    case "MAINHAND": {
      // Arma na mão direita (à frente do corpo), maior e mais destacada.
      const weapon = scene.add.rectangle(13, -BODY_HEIGHT / 2, 5, 30, item.color);
      weapon.setStrokeStyle(1.5, 0x0f172a);
      const tip = scene.add.triangle(
        13,
        -BODY_HEIGHT / 2 - 18,
        0,
        8,
        5,
        -8,
        10,
        8,
        item.color,
      );
      tip.setStrokeStyle(1.5, 0x0f172a);
      // Pequeno brilho na ponta da arma.
      const gleam = scene.add.circle(13, -BODY_HEIGHT / 2 - 20, 3, 0xffffff, 0.9);
      applyGlow(scene, gleam);
      objects.push(weapon, tip, gleam);
      if (item.glow) {
        applyGlow(scene, weapon);
        applyGlow(scene, tip);
      }
      break;
    }
    case "OFFHAND": {
      // Escudo/foco na mão esquerda: um losango com borda, bem visível.
      const shield = scene.add.ellipse(-13, -BODY_HEIGHT / 2, 14, 20, item.color);
      shield.setStrokeStyle(2, 0x0f172a);
      const boss = scene.add.circle(-13, -BODY_HEIGHT / 2, 3, 0xffffff, 0.85);
      objects.push(shield, boss);
      if (item.glow) {
        applyGlow(scene, boss);
        applyPulseScale(scene, shield, 0.95, 1.05);
      }
      break;
    }
    case "HEAD": {
      // Chapéu/elmo sobre a cabeça, sobrepondo o capuz padrão.
      const hat = scene.add.arc(0, -BODY_HEIGHT - 10, 12, 180, 360, false, item.color);
      hat.setStrokeStyle(2, 0x0f172a);
      const brim = scene.add.rectangle(0, -BODY_HEIGHT - 10, 30, 4, item.color);
      brim.setStrokeStyle(1, 0x0f172a);
      // Joia/topo do elmo.
      const jewel = scene.add.circle(0, -BODY_HEIGHT - 18, 3, 0xffffff, 0.9);
      applyGlow(scene, jewel);
      objects.push(hat, brim, jewel);
      if (item.glow) applyGlow(scene, hat);
      break;
    }
    case "BACK": {
      // Capa maior atrás do corpo (desenhada primeiro, fica ao fundo) com ondulação.
      const cape = scene.add.triangle(
        0,
        -BODY_HEIGHT / 2 + 2,
        -15,
        -8,
        15,
        -8,
        0,
        26,
        item.color,
      );
      cape.setStrokeStyle(1.5, 0x0f172a);
      cape.setAlpha(0.95);
      // Balanço sutil da capa.
      scene.tweens.add({
        targets: cape,
        scaleX: 1.08,
        yoyo: true,
        repeat: -1,
        duration: 1400,
        ease: "Sine.easeInOut",
      });
      objects.push(cape);
      if (item.glow) applyGlow(scene, cape);
      break;
    }
    case "AURA": {
      // Aura visível: dois anéis girando + um halo pulsante ao redor do corpo.
      const halo = scene.add.ellipse(0, -BODY_HEIGHT / 2, 60, 60, item.color, 0.18);
      applyPulseScale(scene, halo, 0.85, 1.15);

      const ringOuter = scene.add.ellipse(0, 4, 52, 24);
      ringOuter.setStrokeStyle(3, item.color, 0.9);
      ringOuter.isStroked = true;
      ringOuter.isFilled = false;
      applySpin(scene, ringOuter, 5000);

      const ringInner = scene.add.ellipse(0, 4, 36, 16);
      ringInner.setStrokeStyle(2, item.color, 0.7);
      ringInner.isStroked = true;
      ringInner.isFilled = false;
      applySpin(scene, ringInner, 3500);

      // Faíscas orbitando (pontos que sobem e somem).
      for (let i = 0; i < 3; i++) {
        const spark = scene.add.circle(
          (i - 1) * 14,
          2,
          2.5,
          item.color,
          0.95,
        );
        scene.tweens.add({
          targets: spark,
          y: -BODY_HEIGHT - 6,
          alpha: 0,
          repeat: -1,
          duration: 1500,
          delay: i * 400,
          ease: "Sine.easeOut",
        });
        objects.push(spark);
      }

      objects.push(halo, ringOuter, ringInner);
      break;
    }
    default:
      break;
  }

  return objects;
}

/**
 * Cria o avatar isométrico de um jogador dentro de um container próprio.
 * Manter isto separado permite evoluir a aparência por classe (sprites,
 * animações, acessórios) sem tocar na lógica do cenário em TibiaWorld.
 *
 * `equippedItems` são os itens que o jogador está usando (vindos de user_items).
 * O container retornado é posicionado pelo chamador; internamente o avatar
 * é desenhado com o "pé" na origem (0,0) para casar com o centro do tile.
 */
export function createPlayerContainer(
  scene: Phaser.Scene,
  player: User,
  equippedItems: GameItem[] = [],
): Phaser.GameObjects.Container {
  const style = getClassStyle(player.class_type);
  const container = scene.add.container(0, 0);

  const bodyHeight = BODY_HEIGHT;

  // Camadas de fundo (aura e capa/asas) desenhadas primeiro para ficarem atrás.
  const backLayers = equippedItems
    .filter((item) => item.slot === "AURA" || item.slot === "BACK")
    .flatMap((item) => drawEquippedItem(scene, item));

  // Sombra achatada no chão.
  const shadow = scene.add.ellipse(0, 6, 30, 14, 0x000000, 0.3);

  // Corpo (roupa da classe).
  const body = scene.add.rectangle(0, -bodyHeight / 2, 22, bodyHeight, style.body);
  body.setStrokeStyle(2, 0x0f172a);

  // Faixa de detalhe na cintura, na cor de acento da classe.
  const belt = scene.add.rectangle(0, -bodyHeight / 2 + 8, 22, 5, style.accent);

  // Cabeça em tom de pele neutro.
  const head = scene.add.circle(0, -bodyHeight - 4, 9, 0xfcd9b6);
  head.setStrokeStyle(2, 0x0f172a);

  // "Chapéu"/capuz na cor de acento, para dar identidade à classe.
  const hat = scene.add.arc(
    0,
    -bodyHeight - 8,
    10,
    180,
    360,
    false,
    style.accent,
  );
  hat.setStrokeStyle(2, 0x0f172a);

  // Olhos.
  const leftEye = scene.add.rectangle(-3, -bodyHeight - 4, 3, 4, 0x0f172a);
  const rightEye = scene.add.rectangle(3, -bodyHeight - 4, 3, 4, 0x0f172a);

  // Camadas de frente (armas e chapéu) desenhadas por cima do corpo.
  const frontLayers = equippedItems
    .filter(
      (item) =>
        item.slot === "MAINHAND" ||
        item.slot === "OFFHAND" ||
        item.slot === "HEAD",
    )
    .flatMap((item) => drawEquippedItem(scene, item));

  // Ícone flutuante da classe acima da cabeça.
  const classIcon = scene.add
    .text(0, -bodyHeight - 20, style.emoji, { fontSize: "14px" })
    .setOrigin(0.5);

  // Nameplate.
  const nameBg = scene.add.rectangle(0, -bodyHeight - 42, 140, 46, 0x020617, 0.82);
  nameBg.setStrokeStyle(1, 0x475569);

  const nameText = scene.add
    .text(0, -bodyHeight - 47, player.gitlab_username, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#e2e8f0",
      fontStyle: "bold",
    })
    .setOrigin(0.5);

  const statsText = scene.add
    .text(
      0,
      -bodyHeight - 36,
      `Lv.${player.current_level} | ${player.total_xp} XP`,
      {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#34d399",
      },
    )
    .setOrigin(0.5);

  const kdaText = scene.add
    .text(0, -bodyHeight - 25, "KDA 0/0", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#f8fafc",
    })
    .setOrigin(0.5);

  container.add([
    ...backLayers,
    shadow,
    body,
    belt,
    head,
    hat,
    leftEye,
    rightEye,
    ...frontLayers,
    classIcon,
    nameBg,
    nameText,
    statsText,
    kdaText,
  ]);

  container.setData("userId", player.id);
  container.setData("userName", player.gitlab_username);
  container.setData("statsText", statsText);
  container.setData("kdaText", kdaText);
  container.setData("kills", 0);
  container.setData("deaths", 0);

  return container;
}
