# Defensive Hub

Coletânea de minigames de contenção inspirada nas mecânicas de hacking defensivo de *Welcome to The Game 2 e 3*. Menu principal, partidas isoladas e modo Sobrevivência — sem exploração, economia ou terror.

## Como subir

```bash
cp .env.example .env      # ajuste POSTGRES_PASSWORD e DATABASE_URL
docker compose build
docker compose up -d
# frontend em http://localhost:8080  ·  API atrás de /api
```

`web` (nginx) só sobe depois que o healthcheck da `api` passa, e a `api` depois que o Postgres responde ao `pg_isready`. O `npm run start` da API roda `prisma migrate deploy` antes de servir, então o banco é migrado no primeiro `up`.

Antes do primeiro deploy, gere a migração inicial uma vez em ambiente local:

```bash
npm install
npm run -w @hub/api exec -- prisma migrate dev --name init
```

## Arquitetura

```
defensive-hub/
├── docker-compose.yml            db + api + web na mesma rede
├── packages/game-core/           regra de negócio, zero DOM
│   └── src/
│       ├── engine/
│       │   ├── types.ts          contratos (MinigameId, GameInput, Snapshot...)
│       │   ├── rng.ts            PRNG determinístico por seed
│       │   ├── MinigameController.ts   classe base: estado, dano, resolução
│       │   └── GameLoop.ts       loop de timestep fixo, tempo injetável
│       ├── registry.ts           catálogo único dos 8 minigames
│       └── minigames/<jogo>/     um controller por minigame + testes de regra
├── apps/web/                     React + Vite + Tailwind
│   └── src/
│       ├── App.tsx               máquina de estados menu → partida → resultado
│       ├── shell/                MainMenu, GameHost, ResultScreen
│       ├── game/
│       │   ├── useMinigameSession.ts   ponte controller ↔ React
│       │   ├── audio.ts          feedback sintetizado (Web Audio)
│       │   └── renderers/
│       │       ├── canvas/       jogos de ação (Zonewall, memDEALLOCATER...)
│       │       └── dom/          jogos de grade (nodeH3X3R, memD3FR4G3R...)
│       ├── ui/                   Meter, AsciiSkull
│       └── services/api.ts       cliente HTTP
└── apps/api/                     Fastify + Prisma + Postgres
    └── src/
        ├── routes/               health, profiles, runs, leaderboard
        ├── services/             DifficultyService (overrides e adaptação)
        └── plugins/prisma.ts
```

### As três decisões que sustentam o resto

**A regra não sabe que existe tela.** Cada minigame é um `MinigameController` puro: `start()`, `tick()`, `handleInput()`, `getState()`. Nada nele importa React ou Canvas, então a regra crítica — a alternância Alfa→Beta do nodeH3X3R, o raio 3x3 do stackPUSHER — é testável em Node, sem DOM. `packages/game-core/src/minigames/rules.test.ts` já cobre a quebra de conexão e a zona hostil.

**Timestep fixo.** O `GameLoop` acumula tempo real e avança a simulação em passos constantes de 8,3 ms. A janela de acerto do Zonewall é idêntica em 60 Hz e em 144 Hz, e o mesmo loop roda em teste com o tempo injetado (`loop.advance(4000)`).

**Renderização híbrida com um contrato só.** Jogos de grade são DOM (botões acessíveis, foco por teclado, Tailwind); jogos de ação são Canvas (`CanvasStage` cuida de DPI, resize e rAF, lendo o controller direto a cada frame sem passar pelo estado do React). Os dois lados implementam a mesma `RendererProps`, e `renderers/index.ts` é o único lugar que mapeia minigame → componente.

### Fluxo de uma partida

```
MainMenu → App.startGame(id, mode)
         → GameHost → useMinigameSession(id, seed)
                        ├── createMinigame() lê defaults do registry + override da API
                        ├── GameLoop.tick() → controller
                        ├── onFeedback → áudio + shake
                        └── onResolved → RunResult
         → ResultScreen (caveira ASCII se breached) → menu
```

No modo Sobrevivência, `blocked` emenda direto na próxima rotina sorteada e incrementa a sequência; `breached` encerra a sessão.

## Estado atual

| Minigame | Renderer | Status |
|---|---|---|
| Zonewall | canvas | implementado |
| memD3FR4G3R | dom | implementado |
| nodeH3X3R | dom | implementado |
| K3RN3LC0MP1L3R | dom | spec escrita, controller pendente |
| memDEALLOCATER | canvas | spec escrita, controller pendente |
| shiftSEQ | canvas | spec escrita, controller pendente |
| stackPUSHER | dom | spec escrita, controller pendente |
| TOKENINE | canvas | spec escrita, controller pendente |

Os pendentes usam `PendingController`, que mantém o contrato do registry válido e mostra na tela as regras do GDD que faltam — o menu não mente sobre o que está pronto.

## Adicionar um minigame

1. `packages/game-core/src/minigames/<jogo>/<Jogo>Controller.ts` estendendo `MinigameController`.
2. Trocar a entrada correspondente em `registry.ts` (`implemented: true`, `create:` apontando para o controller novo) e apagar o `spec.ts`.
3. Criar o renderer em `apps/web/src/game/renderers/canvas/` ou `dom/` e registrá-lo em `renderers/index.ts`.
4. Escrever o teste da regra crítica em `rules.test.ts`.

Nenhum outro arquivo precisa mudar: menu, HUD, tela de resultado e persistência leem do registry.

## API

| Método | Rota | Função |
|---|---|---|
| GET | `/health` | liveness + ping no banco (usado pelo healthcheck do compose) |
| POST | `/profiles` | cria ou recupera o perfil pelo handle |
| GET | `/profiles/:id/difficulty` | overrides de dificuldade do perfil |
| PUT | `/profiles/:id/difficulty` | grava override de um minigame |
| POST | `/profiles/:id/runs` | registra o resultado de uma partida |
| GET | `/profiles/:id/runs` | últimas 50 partidas |
| GET | `/leaderboard/:minigameId` | top 10 bloqueios |

A seed viaja no `RunResult`. Como todo o desafio é derivado dela, uma run pode ser reexecutada no servidor — a base para validar pontuação depois, se o leaderboard virar competitivo.

## Comandos

```bash
npm install
npm run dev:api           # API em :3333
npm run dev:web           # Vite em :5173, proxy /api → :3333
npm test                  # testes de regra do game-core
```
