# Alô Saúde — Produção

Guia para publicar o app e as rotas `/api`, com o que ainda falta antes de um
lançamento público. Complementa `docs/arquitetura-voz.md` (voz) e a
documentação de autenticação mantida junto de `src/services/server/auth`.

## 1. Visão geral

```
App (iOS/Android/web)
  │  Authorization: Bearer <token de sessão>
  ▼
Rotas /api (Expo Router, web.output = "server")
  ├─ /api/live-session, /api/assistant-text, /api/analyze-symptoms → OpenAI (chave só no servidor)
  ├─ /api/auth/*                                                → sessão do app
  └─ /api/health-units                                          → CNES (Ministério da Saúde) + IBGE
```

Nenhum segredo vai para o app. Tudo que começa com `EXPO_PUBLIC_` entra no
bundle e é público.

## 2. Unidades de saúde reais (CNES)

**Fonte:** API de Dados Abertos do Ministério da Saúde (DEMAS),
`GET https://apidadosabertos.saude.gov.br/cnes/estabelecimentos`
(documentação: `https://apidadosabertos.saude.gov.br/v1/#/CNES`). Sem
autenticação.

| Parâmetro | Uso no app |
| --- | --- |
| `codigo_municipio` | código IBGE de **6 dígitos** (sem o verificador: 5300108 → 530010) |
| `codigo_tipo_unidade` | um tipo por chamada (tabela abaixo) |
| `status=1` | só estabelecimentos ativos |
| `limit` (≤ 20) e `offset` | paginação; na prática `offset` é deslocamento em itens (a documentação fala em "página") |

Campos usados: `nome_fantasia`, endereço/número/bairro, telefone,
`latitude/longitude_estabelecimento_decimo_grau`, turno de atendimento e
`estabelecimento_faz_atendimento_ambulatorial_sus`.

**Mapeamento de tipos → serviços do app** (`src/services/health-units/cnes/mapping.ts`):

| Tipo CNES | Tipo no app | Serviços |
| --- | --- | --- |
| 1 Posto de saúde, 2 Centro de saúde/UBS | UBS | `ubs`, `consulta_rotina`, `vacinacao` |
| 15 Unidade mista | UBS | idem + `pronto_socorro` |
| 85 Centro de imunização (só se atende SUS) | Centro de imunização | `vacinacao` |
| 73 Pronto atendimento (UPA) | UPA | `upa`, `pronto_socorro` |
| 20/21 Pronto-socorro, 5 Hospital geral (só se atende SUS) | Hospital | `pronto_socorro` |
| 70 CAPS | CAPS | `saude_mental` |
| — | — | `teleconsulta` e `farmacia_popular` não têm endereço no CNES: a resposta orienta pelo Meu SUS Digital / lista oficial do Farmácia Popular |

Fluxo do `CnesHealthUnitFinder` (servidor): resolve o município → busca os
tipos do serviço (com cache) → filtra pelo **serviço** → ordena por
**distância** (haversine) → devolve até 3 unidades com um aviso. Nunca lança:
CNES/IBGE fora do ar, tempo esgotado, sem município ou sem coordenadas viram
um resultado vazio com a limitação explicada + Disque Saúde 136 / Meu SUS
Digital / Secretaria Municipal (docs/features.md, seção 4).

- **Vacinas:** o CNES não diz quais vacinas há em estoque; toda resposta de
  vacinação inclui "confirme a disponibilidade".
- **Horários:** o CNES só traz o turno (manhã/tarde/noite/24 h); exibimos
  "confirme o horário".
- **Cache:** em memória, por processo — 12 h por município + tipo (CNES) e
  30 dias por UF (IBGE); uma cópia vencida é usada se a API cair. Teto de 25
  páginas (500 unidades) por tipo. Com várias instâncias, cada uma tem o seu
  cache; para escala, troque por Redis/KV.
- **Termos:** dados abertos do governo federal (Política de Dados Abertos,
  Decreto 8.777/2016; API sob licença MIT). Cite a fonte ("Dados do CNES —
  Ministério da Saúde") e não sobrecarregue a API (cache + limite de 30
  req/min por pessoa na rota). Os dados podem estar desatualizados; o app
  sempre manda confirmar nos canais oficiais.

**Município a partir da localização:** o app faz a geocodificação reversa no
próprio aparelho (`expo-location.reverseGeocodeAsync`, Apple/Google, sem
servidor nosso) e envia cidade + UF; o servidor converte em código IBGE pela
API de localidades do IBGE
(`servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios`). As 27
capitais e o DF (município único) são resolvidos sem rede. Sem GPS, a pessoa
digita "Cidade, UF"; na conversa, o assistente usa o texto de `localizacao`.

> **Atenção (TLS do IBGE):** o servidor `servicodados.ibge.gov.br` não envia o
> certificado intermediário (Sectigo Public Server Authentication CA DV R36);
> o `fetch` do Node recusa a conexão (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
> Capitais funcionam mesmo assim. Para os demais municípios, no host Node
> configure `NODE_EXTRA_CA_CERTS=/caminho/sectigo-dv-r36.pem` (baixe o
> intermediário do repositório oficial da Sectigo) ou gere uma tabela estática
> de municípios no build. Verifique no ambiente de deploy antes de lançar.

## 3. Localização no app

`src/features/location`: permissão só em primeiro plano (`whenInUse`), pedida
na hora da busca e depois de uma explicação na tela ("Usar sua
localização?"). GPS com limite de 8 s → última posição conhecida (até 10 min,
marcada como aproximada) → cidade digitada → (modo exemplo) ponto do bairro de
demonstração. A posição não é salva; a cidade digitada fica só na memória da
sessão. O aviso "Local aproximado" só aparece quando o ponto não é o GPS
atual. No assistente (voz e texto), `getCoordinates` pede a permissão apenas
se ela nunca foi respondida.

## 4. Voz: alto-falante

`src/features/voice/webrtc/audio-session.ts` usa `react-native-incall-manager`:
`start({ media: 'audio' })` ao abrir o microfone, viva-voz forçado
(`setForceSpeakerphoneOn(true)`), volta ao fone com fio quando conectado
(evento `WiredHeadset`) e `stop()` ao encerrar ou falhar. Limitação: no iOS o
viva-voz forçado tem prioridade sobre fones Bluetooth.

## 5. Variáveis de ambiente

| Variável | Onde | Segredo? | Uso |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | servidor | **sim** | rotas de voz/texto/sintomas |
| `OPENAI_LIVE_MODEL`, `SYMPTOM_MODEL` | servidor | não | modelos (padrões no código) |
| `APP_SESSION_SECRET` | servidor | **sim** (≥ 32 caracteres) | tokens de sessão do app |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | servidor | **sim** | código por SMS (auth) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` | servidor | **sim** (a chave) | voz da ElevenLabs (opcional) |
| `ALLOWED_ORIGINS` | servidor | não | origens web aceitas (não autentica) |
| `NODE_EXTRA_CA_CERTS` | servidor (host Node) | não | cadeia do IBGE (seção 2) |
| `EXPO_PUBLIC_API_URL` | app (build) | não | URL das rotas `/api`; vazia = modo demonstração |
| `EXPO_PUBLIC_VOICE_MOCK` | app | não | `1` força a conversa simulada |
| `EXPO_PUBLIC_UNITS_SOURCE` | app | não | `exemplo` força as unidades fictícias mesmo com backend |

Seleção da base de unidades: **oficial (CNES)** quando `EXPO_PUBLIC_API_URL`
está definida; **exemplo** sem backend ou com `EXPO_PUBLIC_UNITS_SOURCE=exemplo`.

Segredos: nunca em `eas.json`, `app.json` ou variáveis `EXPO_PUBLIC_`. Use
variáveis de ambiente do EAS (`eas env:create --environment production
--visibility secret`) ou o cofre do provedor de hospedagem. Gire
`OPENAI_API_KEY` e `APP_SESSION_SECRET` periodicamente e ao desligar alguém
da equipe.

## 6. Deploy das rotas `/api`

**EAS Hosting (recomendado):**

```bash
eas init                                   # cria o projeto e o projectId
eas env:create --environment production --name OPENAI_API_KEY --value ... --visibility secret
eas env:create --environment production --name APP_SESSION_SECRET --value ... --visibility secret
pnpm expo export --platform web            # gera dist/client + dist/server
eas deploy --prod --environment production # publica e mostra a URL
```

Use a URL publicada em `EXPO_PUBLIC_API_URL` (variável do ambiente
`production`/`preview` no EAS, lida pelos perfis do `eas.json`).

**Outro host Node (≥ 20):** sirva `dist/` com `@expo/server` (adaptador
Express/Hono/Vercel/Netlify, conforme a documentação de API Routes do Expo),
atrás de HTTPS, com as variáveis acima e `NODE_EXTRA_CA_CERTS` se precisar do
IBGE. Uma instância já funciona; com várias, o limite de requisições e os
caches em memória precisam de armazenamento compartilhado.

**Builds do app (`eas.json`):**

| Perfil | Uso |
| --- | --- |
| `development` / `development-simulator` | dev client (aparelho / simulador iOS) |
| `preview` | distribuição interna (APK no Android) com o ambiente `preview` |
| `production` | lojas; `autoIncrement` com versão remota |

`APP_VARIANT` é definido por perfil para um futuro `app.config.ts` (ver seção 9).

## 7. Monitoramento

- Erros do app e das rotas: Sentry (`@sentry/react-native` + SDK Node), com
  `beforeSend` removendo coordenadas, cidade, transcrições, telefone e tokens.
- Logs do EAS Hosting (ou do host): status/latência por rota, sem corpo de
  requisição. Alertas: taxa de 5xx > 2 % em 5 min; p95 de `/api/health-units`
  > 5 s; 429 em alta (abuso ou limite baixo).
- Verificação sintética a cada 15 min contra o CNES e o IBGE (fora do app),
  para saber quando a base oficial cai antes dos usuários.
- Custos: alerta de gasto no painel da OpenAI; métrica de minutos de voz por
  sessão.
- Métrica de produto sem dados pessoais: proporção de buscas com resultado
  vazio por serviço/UF (indica municípios com cadastro ruim no CNES).

## 8. Checklist operacional LGPD

- [ ] Base legal definida e registrada (tratamento de dados de saúde: art. 11);
      consentimento explícito antes da primeira conversa sobre sintomas.
- [ ] Política de privacidade e termos publicados e acessíveis no app, com
      contato do encarregado (DPO).
- [ ] Minimização: localização só em primeiro plano, só na busca, sem
      armazenamento; coordenadas só no corpo da requisição (nunca na URL);
      respostas com `Cache-Control: no-store`.
- [ ] Logs sem coordenadas, cidade, transcrições, sintomas, telefone ou
      tokens; retenção de logs definida (ex.: 30 dias).
- [ ] Contrato/DPA com operadores (OpenAI, Twilio, Expo/EAS, Sentry) e
      registro de transferência internacional (art. 33).
- [ ] Desativar retenção/treino de dados na OpenAI (configuração da organização)
      quando disponível para o tipo de conta.
- [ ] Atendimento aos direitos do titular (acesso, correção, exclusão) com prazo.
- [ ] Registro das operações de tratamento (ROPA) e relatório de impacto (RIPD)
      para dados sensíveis de saúde.
- [ ] Plano de resposta a incidentes (comunicação à ANPD e aos titulares).
- [ ] Revisão de acessos aos segredos e aos painéis (menor privilégio, 2FA).

## 9. Alterações necessárias no `app.json` (não aplicadas)

1. `android.package` está ausente — obrigatório para build Android
   (ex.: `com.pedrokarasas.alosaude`; hífen não é permitido no Android).
2. Remover `ios.bitcode` (descontinuado).
3. Permissões Android: remover `CAMERA` e `SYSTEM_ALERT_WINDOW` (não usadas;
   adicionar em `android.blockedPermissions`, já que o plugin do WebRTC as
   injeta); trocar `BLUETOOTH` por `BLUETOOTH_CONNECT` (Android 12+, usado
   pelo InCallManager para fones Bluetooth). As permissões de localização
   vêm do plugin `expo-location`.
4. `ios.infoPlist`: `ITSAppUsesNonExemptEncryption: false` (evita a pergunta
   de exportação a cada envio) e, se a conversa por voz deve continuar com a
   tela bloqueada, `UIBackgroundModes: ["audio"]`.
5. Texto da câmera do plugin WebRTC: a App Store rejeita textos de propósito
   que dizem "não usa"; descreva um uso real (ex.: teleconsulta por vídeo) ou
   remova a permissão.
6. Splash (`#208AEF`) e fundo do ícone adaptativo (`#E6F4FE`) ainda são os
   padrões do template: usar a cor da marca (`#FCFDFD`/`#0E5C66`).
7. `userInterfaceStyle: "automatic"` sem tema escuro implementado: usar
   `"light"` até existir o tema escuro.
8. Depois de `eas init`: `owner` e `extra.eas.projectId`; com
   `appVersionSource: "remote"` não manter `buildNumber`/`versionCode` locais.
9. Manifesto de privacidade iOS (`ios.privacyManifests`) declarando
   `NSPrivacyAccessedAPICategoryUserDefaults` (AsyncStorage/SecureStore) e a
   coleta de localização aproximada/precisa não vinculada ao usuário.
10. Para variantes por perfil (bundle IDs `…dev`/`…preview`), migrar para
    `app.config.ts` lendo `APP_VARIANT`.
11. Se adotar atualizações OTA: instalar `expo-updates`, `runtimeVersion` e
    `channel` por perfil no `eas.json`.

## 10. O que ainda é simulado

- **Modo demonstração** (sem `EXPO_PUBLIC_API_URL`): conversa por voz/texto
  simulada (`src/mocks/voice-conversation.ts`) e unidades fictícias
  (`src/mocks/health-units.ts`, `src/mocks/nearby-units.ts`) em um bairro de
  Brasília.
- Disponibilidade de vacinas, horários exatos e filas: não existem no CNES.
- Teleconsulta e Farmácia Popular: só orientação para os canais oficiais.
- Perfil/usuário de exemplo (`src/mocks/user.ts`) e notificações de exemplo.
- Protocolos de classificação de risco: as regras do app são um ponto de
  partida e precisam de validação clínica antes do uso real.
