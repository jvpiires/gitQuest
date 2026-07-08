# � gitQuest

> *"Transforme cada commit em experiência, cada dev em um herói."*

**gitQuest** é um RPG de gamificação para times de desenvolvimento. Cada repositório é uma **Dungeon**, cada Merge Request ou Issue é um **monstro** a ser derrotado, e os desenvolvedores são **aventureiros** que ganham XP, sobem de nível e conquistam equipamentos ao manter o código saudável.

O mundo é renderizado como um mapa isométrico estilo Habbo, onde cada jogador aparece como um avatar animado com os itens que equipou.

---

## ✨ Funcionalidades

- 🗺️ **Mundo isométrico** em tempo real (Phaser) com todos os heróis do time.
- 🧙 **4 classes** com aparência e identidade próprias (Assassino, Mago, Clérigo, Arqueiro).
- ⚔️ **XP retroativa via GitLab** — cada commit do histórico de pushes vira XP.
- 📈 **Curva de nível progressiva** — os primeiros níveis são rápidos e vai ficando mais difícil ao infinito.
- 🎁 **Luckboxes** — a cada X níveis o jogador ganha uma caixa com um item aleatório.
- 🎒 **Inventário** — 80 itens (20 por classe) em 4 raridades, equipáveis por slot.
- 🏆 **Leaderboard** dos top 10 heróis por XP.
- 🔄 **Sincronização** individual (a cada reload) ou global (`/api/sync-all`).

---

## 🎭 Classes

| Classe | Perfil de Jogo | Gatilho Principal de XP | Atributo |
| :---: | :--- | :--- | :---: |
| **🗡️ Assassino** | Velocidade e letalidade | Fechar *issues* de bugs rapidamente | **Agilidade** |
| **🧙‍♂️ Mago** | Dano em área e impacto | *Commits* massivos de refatoração/testes | **Inteligência** |
| **🛡️ Clérigo** | Suporte ao grupo | *Code Reviews* aprovados e comentários úteis | **Sabedoria** |
| **🏹 Arqueiro** | Precisão à distância | *Pipelines* de CI/CD que passam de primeira | **Destreza** |

<details>
<summary><b>📖 Lore das classes</b></summary>

### 🗡️ Assassino
> *"Rápido como um script em lote, letal como um ponteiro solto."*
Foco em resolução rápida. Se um bug surge em produção, o Assassino o elimina antes que qualquer um note.

### 🧙‍♂️ Mago
> *"Grandes refatorações exigem grande intelecto e um pouco de caos."*
Foco em alterações estruturais — muda centenas de linhas com feitiços de refatoração que limpam a arquitetura.

### 🛡️ Clérigo
> *"Nenhum herói avança sem uma armadura revisada e um código abençoado."*
Foco em qualidade e mentoria — mantém o time seguro com revisões minuciosas e conhecimento compartilhado.

### 🏹 Arqueiro
> *"Um tiro, um acerto. O deploy perfeito não aceita falhas."*
Foco em automação e precisão — envia códigos perfeitamente alinhados para as esteiras de CI/CD.

</details>

---

## 📈 Progressão

**XP por commit:** cada commit vale `100 XP` (`XP_PER_COMMIT`).

**Curva de nível (quadrática):** a XP total para atingir um nível cresce com o quadrado do nível, então os primeiros níveis (0→10) são rápidos e vai desacelerando ao infinito:

$$\text{xpForLevel}(N) = 50 \cdot (N-1)^2 \qquad\Longleftrightarrow\qquad \text{level}(xp) = \left\lfloor \sqrt{xp / 50} \right\rfloor + 1$$

| XP total | Nível |
| ---: | :---: |
| 50 | 2 |
| 1.250 | 6 |
| 5.000 | 11 |
| 41.700 | 29 |
| 177.100 | 60 |

**Luckboxes:** o jogador ganha 1 caixa a cada `5` níveis (`LEVELS_PER_BOX`). O perfil mostra uma barra de progresso de quanto falta para o próximo nível.

**Raridades dos itens:** Comum (60%), Raro (25%), Épico (12%), Lendário (3%).

---

## 🧱 Stack & Arquitetura

- **[Next.js 16](https://nextjs.org/)** (App Router, Turbopack) + **React 19**
- **[Phaser 4](https://phaser.io/)** — renderização isométrica do mundo 2D
- **[Supabase](https://supabase.com/)** — Auth (magic link) + Postgres com RLS
- **[Tailwind CSS 4](https://tailwindcss.com/)** — estilização
- **GitLab API** — fonte de XP (histórico de pushes)
- **pnpm workspaces** — monorepo

```
gitQuest/
├── apps/
│   └── web/                     # App Next.js
│       ├── app/
│       │   ├── page.tsx         # Mundo + controles (login, sync, perfil)
│       │   ├── perfil/          # Inventário + barra de progresso
│       │   ├── login/           # Login por magic link
│       │   ├── dashboard/       # Criação de personagem
│       │   ├── auth/callback/   # Callback de autenticação
│       │   ├── api/
│       │   │   ├── _lib/sync.ts        # Lógica de sync compartilhada
│       │   │   ├── sync-xp/            # Sincroniza o jogador logado
│       │   │   ├── sync-all/           # Sincroniza TODOS (cron/admin)
│       │   │   ├── luckbox/open/       # Abre uma luckbox
│       │   │   ├── items/equip/        # Equipa/desequipa um item
│       │   │   └── webhook/gitlab/     # Webhook de push do GitLab
│       │   └── src/components/  # Phaser world, avatar, luckbox, etc.
│       └── ...
└── packages/
    └── database/                # Tipos, clients Supabase, catálogo de itens,
                                 # e helpers de progressão (XP/nível/caixas)
```

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js `24.x`
- pnpm `11.x`
- Um projeto Supabase e acesso a uma instância GitLab

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Configurar variáveis de ambiente
Crie `apps/web/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<seu-projeto>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"   # nunca exposta ao client

# GitLab (fonte de XP)
GITLAB_API_URL="http://git.suaempresa/api/v4"     # http se a instância for interna
GITLAB_TOKEN="<personal-access-token>"

# Opcional: protege a rota /api/sync-all em produção
SYNC_SECRET="<segredo-forte>"
```

### 3. Aplicar o schema no Supabase
Rode a migração em `packages/database/migrations/001_items_luckbox.sql` no SQL Editor do Supabase (cria a tabela `user_items`, as colunas de luckbox e as políticas de RLS).

> Garanta uma policy de leitura pública em `users` para os heróis aparecerem no mapa:
> ```sql
> create policy "Leitura pública dos jogadores"
>   on public.users for select to anon, authenticated using (true);
> ```

### 4. Iniciar em desenvolvimento
```bash
pnpm --filter web dev
# http://localhost:3000
```

---

## 🔌 Rotas da API

| Rota | Método | Descrição |
| :--- | :---: | :--- |
| `/api/sync-xp` | POST | Sincroniza a XP do jogador logado (roda a cada reload). |
| `/api/sync-all` | POST/GET | Sincroniza **todos** os jogadores pelo GitLab. Protegida por `SYNC_SECRET`. |
| `/api/luckbox/open` | POST | Abre uma luckbox e sorteia um item da classe do jogador. |
| `/api/items/equip` | POST | Equipa/desequipa um item (um por slot). |
| `/api/webhook/gitlab` | POST | Recebe pushes do GitLab e concede XP em tempo real. |

**Sincronização em massa** (recomenda-se agendar via cron/uptime-monitor):
```bash
curl -X POST http://localhost:3000/api/sync-all \
  -H "Authorization: Bearer $SYNC_SECRET"
```

---

## 📜 Scripts

```bash
pnpm dev          # Sobe todos os apps em modo dev
pnpm build        # Build de produção
pnpm type-check   # Checagem de tipos em todo o monorepo
```

---

*Que o build esteja sempre a seu favor!* 🚀
