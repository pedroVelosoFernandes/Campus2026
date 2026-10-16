# Alô Saúde

Assistente de orientação de acesso ao SUS, por voz e texto. Veja o produto em [docs/features.md](docs/features.md), as telas de referência em [docs/design/](docs/design/) e os prints do app em [docs/screenshots/](docs/screenshots/).

## Stack

- Expo SDK 58 + React Native + Expo Router (rotas em `src/app`)
- react-native-gesture-handler + Reanimated para gestos e animações
- Voz: GPT-Live (`gpt-live-1`) com delegação para o GPT-Sol (`gpt-6-sol`), que substitui temporariamente o modelo próprio de sintomas, ainda não treinado. Detalhes em [docs/arquitetura-voz.md](docs/arquitetura-voz.md).
- Dados de usuário e unidades de saúde são mockados (`src/mocks`).

## Estrutura

```
src/
  app/         rotas (telas) e rotas de API do servidor (app/api)
  components/  componentes compartilhados e por tela
  features/    voz e texto (máquina de estados, transportes, hooks)
  services/    modelo de sintomas, unidades de saúde, servidor
  mocks/       dados e conversa de demonstração
  theme/       cores, tipografia, espaçamentos
```

## Rodando

```bash
pnpm install
cp .env.example .env   # sem OPENAI_API_KEY o app roda no modo de demonstração
pnpm expo run:ios      # build de desenvolvimento (react-native-webrtc é nativo)
```

No macOS, se o `pod install` falhar com erro de Unicode, exporte `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` antes.

## Qualidade

```bash
pnpm lint       # inclui limite de 500 linhas por arquivo e 80 por função
pnpm typecheck
pnpm test
pnpm doctor     # React Doctor
```

O CI (`.github/workflows/ci.yml`) roda os quatro em cada push e pull request.
