# Autenticação, sessões e onboarding

O Alô Saúde precisa funcionar **sem conta**: muita gente que mais precisa do app não quer (ou não consegue) criar login. Por isso:

- o assistente (voz e texto) funciona como **convidado**;
- a conta é **opcional**, por **celular + código SMS de 6 dígitos**, e só serve para guardar histórico e perfil;
- mesmo o convidado recebe um **token de sessão** do servidor, porque as rotas `/api` gastam a chave da OpenAI e não podem ficar abertas.

## Fluxo no app

```
primeiro uso ─► onboarding (3 telas, aceite LGPD obrigatório) ─► login ─┬─► "Continuar sem entrar" ─► abas (convidado)
                                                                        └─► celular ─► código SMS ─► abas (logado)
usos seguintes ─► abas direto
```

- **Onboarding** (`src/app/(auth)/onboarding.tsx`): três páginas com arraste (Gesture Handler) e pontos animados (Reanimated, respeita "Reduzir movimento"). A última página traz o aceite obrigatório dos Termos de uso e da Política de privacidade. O aceite fica no AsyncStorage com `consentVersion` e `acceptedAt` (`src/features/auth/storage.ts`). Se `CONSENT_VERSION` aumentar, o onboarding aparece de novo para pedir um novo aceite.
- **Guardas de rota**: `src/app/_layout.tsx` e `src/app/(auth)/_layout.tsx` usam `<Stack.Protected>` com `resolveRouteAccess()` (`src/features/auth/access.ts`). As abas só abrem depois do onboarding e da escolha entre conta e convidado. Uma rota bloqueada redireciona para `entry` (`/onboarding`, `/login` ou `/`). Não há efeitos de redirecionamento rodando a cada render.
- **Login** (`src/app/(auth)/login.tsx`): campo com `+55` fixo e máscara `(11) 98765-4321`. "Continuar sem entrar" fica na mesma tela e com o mesmo destaque.
- **Código** (`src/app/(auth)/codigo.tsx`): seis caixas sobre um único campo com `textContentType="oneTimeCode"` / `autoComplete="sms-otp"`, para o iOS e o Android preencherem o código sozinhos. A conferência começa assim que o sexto dígito entra. Há contagem para reenviar e um botão "Trocar número". O celular em verificação fica só na memória (`pending-login.ts`) e nunca vai para a URL.
- **Perfil**: `useAuth()` traz `{ user, status, signIn, signOut, continueAsGuest, requestCode, verifyCode, isDemo }`. `signIn()` abre `/login`. `signOut()` volta ao modo convidado sem tirar a pessoa do app. `user.phoneMasked` é o celular mascarado, por exemplo `(11) •••••-4321`.

## Sessões (servidor)

`src/services/server/auth/token.ts` gera um JWT compacto **HS256** assinado com Web Crypto (`crypto.subtle`, disponível no runtime de servidor do Expo). O segredo vem de `APP_SESSION_SECRET`, com no mínimo 32 caracteres.

| Token | Validade | Uso |
|---|---|---|
| acesso (`use: "access"`) | 15 min | `Authorization: Bearer` nas rotas `/api` |
| renovação (`use: "refresh"`) | 30 dias (usuário) / 7 dias (convidado) | `POST /api/auth/session { grant: "refresh" }` |

- `sub` nunca é o telefone: para usuários, é `phone_` seguido de um HMAC do número em E.164 (pseudônimo estável e irreversível, conforme a LGPD). Para convidados, é um id aleatório.
- Um token de renovação não vale como token de acesso, e vice-versa.
- Cada renovação emite um par novo (rotação). Os tokens não ficam guardados no servidor, então **não há revogação individual**. Para derrubar todas as sessões, troque o `APP_SESSION_SECRET`. Se for preciso revogar sessões uma a uma, guarde um `jti` ou uma "versão de sessão" por usuário num banco.

### Rotas

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /api/auth/session` | `{ grant: "guest" }` | `{ session }` de convidado |
| `POST /api/auth/session` | `{ grant: "refresh", refreshToken }` | `{ session }` nova (401 se inválida/expirada) |
| `POST /api/auth/otp/start` | `{ phone }` | `{ sent, retryAfterSeconds, dev? }` |
| `POST /api/auth/otp/verify` | `{ phone, code }` | `{ session, user: { id, phoneMasked } }` |

As rotas `POST /api/live-session`, `/api/assistant-text` e `/api/analyze-symptoms` exigem um token de acesso válido: sem ele respondem **401** (`WWW-Authenticate: Bearer`), e sem `APP_SESSION_SECRET` configurado respondem 500, ou seja, falham fechadas (`src/services/server/request-guard.ts`).

### Limites (por processo, em memória)

| O quê | Limite |
|---|---|
| Rotas `/api` (usuário) | por `sub`: 10/min (30/min no chat de texto) |
| Rotas `/api` (convidado) | por IP: metade do limite do usuário |
| Envio de SMS | 1 a cada 30 s e 3 a cada 10 min por número; 10 por hora por IP |
| Tentativas de código | 5 a cada 10 min por número; 20 a cada 10 min por IP |
| Sessões de convidado | 20 por hora por IP |
| Renovações | 30/min por IP |

Convidados são contados por IP para que gerar tokens novos não fure o limite. **Em produção com mais de uma instância**, troque `createRateLimiter` por um armazenamento compartilhado (Redis, Upstash etc.) e confie em `x-forwarded-for` só atrás do seu proxy.

## SMS: `OtpProvider`

`src/services/server/auth/otp-provider.ts` define a interface `{ start(phone), check(phone, code) }` e dois adaptadores:

- **Twilio Verify** (produção): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` e `TWILIO_VERIFY_SERVICE_SID`. O Twilio gera, envia (canal `sms`, idioma `pt-br`), expira e confere o código; nós não guardamos código nenhum.
- **Desenvolvimento**: só quando `NODE_ENV !== "production"` **e** o Twilio não está configurado. O código é sempre `123456`, aparece no log do servidor e a resposta traz `dev: true`, para o app mostrar a dica. Em produção sem Twilio, as rotas de OTP respondem 501 e só o modo convidado funciona.

Para trocar de fornecedor (Zenvia, AWS SNS etc.), implemente `OtpProvider` e escolha-o em `resolveOtpProvider`.

Os números são normalizados para E.164 brasileiro (`+55` + DDD + celular de 9 dígitos começando com 9) em `src/features/auth/phone.ts`, o mesmo código no app e no servidor.

## Cliente

- `src/features/auth/session-client.ts` guarda a sessão no **expo-secure-store** (Keychain/Keystore, `AFTER_FIRST_UNLOCK`). O token é renovado 60 s antes de expirar. Sem sessão, pede uma de convidado. Chamadas simultâneas compartilham a mesma renovação. Se a renovação de um usuário falhar, ele vira convidado e a interface é avisada (`onExpired`).
- `apiFetch` (`src/features/auth/api-fetch.ts`) é o `fetch` de todas as chamadas a `/api`: anexa o `Bearer` e, se receber 401, renova e tenta uma única vez de novo. Os transportes de voz e de texto o recebem em `src/features/voice/config.ts`. `createHttpSymptomAnalyzer` aceita `fetchImpl`: passe `apiFetch` quando usá-lo no app. O padrão continua `fetch` porque esse módulo também é importado pelo servidor.
- **Modo demonstração**: sem `EXPO_PUBLIC_API_URL`, nada sai do aparelho e o login aceita o código `123456`. As telas avisam isso com clareza.

## LGPD

- O consentimento é explícito e registrado (versão e data). Os termos e a política abrem pelo onboarding (`EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`, ou o resumo em `src/components/auth/legal-content.ts`). **Esse resumo é um rascunho: a versão final precisa de revisão jurídica.**
- O telefone só passa pelo servidor na hora de enviar e conferir o código. No token e nos limites ele aparece apenas como HMAC.
- Na tela, o número aparece mascarado.

## Variáveis

| Variável | Onde | Obrigatória |
|---|---|---|
| `APP_SESSION_SECRET` | servidor | sim (≥ 32 caracteres) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | servidor | para login por SMS em produção |
| `EXPO_PUBLIC_API_URL` | app | para sair do modo demonstração |
| `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL` | app | não |
