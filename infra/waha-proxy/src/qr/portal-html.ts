export type QrPortalRenderParams = {
  mode: 'admin' | 'qr'
  activeSession: string
  inviteToken?: string
  sessionsConfig?: {
    sessions: Record<string, { wahaSession: string; displayPhone?: string; agencyName?: string }>
  }
  liveSessions?: Array<{ name: string; status: string }>
  defaultInviteMinutes?: number
  publicBaseUrl?: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Matches CoPAS client BrandLogo (~icons/material-symbols/smart-toy) and public/favicon.svg
const COPAS_ROBOT_PATH =
  'M4 15q-1.25 0-2.125-.875T1 12t.875-2.125T4 9V7q0-.825.588-1.412T6 5h3q0-1.25.875-2.125T12 2t2.125.875T15 5h3q.825 0 1.413.588T20 7v2q1.25 0 2.125.875T23 12t-.875 2.125T20 15v4q0 .825-.587 1.413T18 21H6q-.825 0-1.412-.587T4 19zm6.063-2.437q.437-.438.437-1.063t-.437-1.062T9 10t-1.062.438T7.5 11.5t.438 1.063T9 13t1.063-.437m6 0q.437-.438.437-1.063t-.437-1.062T15 10t-1.062.438T13.5 11.5t.438 1.063T15 13t1.063-.437M8 17h8v-2H8z'

const COPAS_BRAND_SVG = `<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="${COPAS_ROBOT_PATH}"/></svg>`

const COPAS_FAVICON_URI = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171717"/><path fill="#ffffff" transform="translate(4, 4)" d="${COPAS_ROBOT_PATH}"/></svg>`,
)}`

function renderBrandHtml(): string {
  return `<div class="brand">
    <div class="brand-mark">${COPAS_BRAND_SVG}</div>
    <span class="brand-name">CoPAS</span>
  </div>`
}

function renderHeadHtml(title: string, extraCss: string): string {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light dark" />
  <link rel="icon" type="image/svg+xml" href="${COPAS_FAVICON_URI}" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${COPAS_BASE_STYLES}
    ${extraCss}
  </style>
</head>`
}

const COPAS_BASE_STYLES = `
  :root {
    color-scheme: light dark;
    --bg-light: oklch(1 0 0);
    --bg-dark: oklch(0.145 0 0);
    --bg-subtle-light: oklch(0.975 0 0);
    --bg-subtle-dark: oklch(0.175 0 0);
    --card-light: oklch(1 0 0);
    --card-dark: oklch(0.205 0 0);
    --fg-light: oklch(0.145 0 0);
    --fg-dark: oklch(0.985 0 0);
    --muted-fg-light: oklch(0.47 0 0);
    --muted-fg-dark: oklch(0.75 0 0);
    --primary-light: oklch(0.205 0 0);
    --primary-dark: oklch(0.922 0 0);
    --primary-fg-light: oklch(0.985 0 0);
    --primary-fg-dark: oklch(0.205 0 0);
    --secondary-light: oklch(0.97 0 0);
    --secondary-dark: oklch(0.269 0 0);
    --border-light: oklch(0.90 0 0);
    --border-dark: oklch(0.32 0 0);
    --control-border-light: oklch(0.75 0 0);
    --control-border-dark: oklch(0.45 0 0);
    --success-bg-light: #ecfdf3;
    --success-bg-dark: #052e16;
    --success-fg-light: #15803d;
    --success-fg-dark: #86efac;
    --success-border-light: #bbf7d0;
    --success-border-dark: #166534;
    --danger-bg-light: #fef2f2;
    --danger-bg-dark: #450a0a;
    --danger-fg-light: #b91c1c;
    --danger-fg-dark: #fecaca;
    --danger-border-light: #fecaca;
    --danger-border-dark: #991b1b;
    --warn-bg-light: #fffbeb;
    --warn-bg-dark: #451a03;
    --warn-fg-light: #b45309;
    --warn-fg-dark: #fde68a;
    --warn-border-light: #fde68a;
    --warn-border-dark: #92400e;

    --bg-page: var(--bg-light);
    --bg-subtle: var(--bg-subtle-light);
    --bg-card: var(--card-light);
    --fg: var(--fg-light);
    --muted-fg: var(--muted-fg-light);
    --primary: var(--primary-light);
    --primary-fg: var(--primary-fg-light);
    --secondary: var(--secondary-light);
    --border: var(--border-light);
    --control-border: var(--control-border-light);
    --success-bg: var(--success-bg-light);
    --success-fg: var(--success-fg-light);
    --success-border: var(--success-border-light);
    --danger-bg: var(--danger-bg-light);
    --danger-fg: var(--danger-fg-light);
    --danger-border: var(--danger-border-light);
    --warn-bg: var(--warn-bg-light);
    --warn-fg: var(--warn-fg-light);
    --warn-border: var(--warn-border-light);
    --focus-ring: #2563eb;
    --radius-card: 14px;
    --radius-btn: 8px;
    --shadow-card: 0 1px 2px rgb(0 0 0 / 0.05), 0 8px 24px rgb(0 0 0 / 0.04);
    --target-size: 44px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-page: var(--bg-dark);
      --bg-subtle: var(--bg-subtle-dark);
      --bg-card: var(--card-dark);
      --fg: var(--fg-dark);
      --muted-fg: var(--muted-fg-dark);
      --primary: var(--primary-dark);
      --primary-fg: var(--primary-fg-dark);
      --secondary: var(--secondary-dark);
      --border: var(--border-dark);
      --control-border: var(--control-border-dark);
      --success-bg: var(--success-bg-dark);
      --success-fg: var(--success-fg-dark);
      --success-border: var(--success-border-dark);
      --danger-bg: var(--danger-bg-dark);
      --danger-fg: var(--danger-fg-dark);
      --danger-border: var(--danger-border-dark);
      --warn-bg: var(--warn-bg-dark);
      --warn-fg: var(--warn-fg-dark);
      --warn-border: var(--warn-border-dark);
      --focus-ring: #60a5fa;
      --shadow-card: 0 1px 3px rgb(0 0 0 / 0.35), 0 10px 28px rgb(0 0 0 / 0.25);
    }
  }

  @supports (color: light-dark(white, black)) {
    :root {
      --bg-page: light-dark(var(--bg-light), var(--bg-dark));
      --bg-subtle: light-dark(var(--bg-subtle-light), var(--bg-subtle-dark));
      --bg-card: light-dark(var(--card-light), var(--card-dark));
      --fg: light-dark(var(--fg-light), var(--fg-dark));
      --muted-fg: light-dark(var(--muted-fg-light), var(--muted-fg-dark));
      --primary: light-dark(var(--primary-light), var(--primary-dark));
      --primary-fg: light-dark(var(--primary-fg-light), var(--primary-fg-dark));
      --secondary: light-dark(var(--secondary-light), var(--secondary-dark));
      --border: light-dark(var(--border-light), var(--border-dark));
      --control-border: light-dark(var(--control-border-light), var(--control-border-dark));
      --success-bg: light-dark(var(--success-bg-light), var(--success-bg-dark));
      --success-fg: light-dark(var(--success-fg-light), var(--success-fg-dark));
      --success-border: light-dark(var(--success-border-light), var(--success-border-dark));
      --danger-bg: light-dark(var(--danger-bg-light), var(--danger-bg-dark));
      --danger-fg: light-dark(var(--danger-fg-light), var(--danger-fg-dark));
      --danger-border: light-dark(var(--danger-border-light), var(--danger-border-dark));
      --warn-bg: light-dark(var(--warn-bg-light), var(--warn-bg-dark));
      --warn-fg: light-dark(var(--warn-fg-light), var(--warn-fg-dark));
      --warn-border: light-dark(var(--warn-border-light), var(--warn-border-dark));
    }
  }

  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg-page);
    color: var(--fg);
    line-height: 1.5;
    overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
  }

  :where(a, code, .break-anywhere) { overflow-wrap: anywhere; }
  img, svg { display: block; max-inline-size: 100%; }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    user-select: none;
    text-decoration: none;
    color: inherit;
  }

  .brand-mark {
    inline-size: 28px;
    block-size: 28px;
    border-radius: 8px;
    background: var(--primary);
    color: var(--primary-fg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
    flex-shrink: 0;
  }

  .brand-name {
    font-size: 1.125rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--fg);
    white-space: nowrap;
  }

  .top-bar {
    inline-size: 100%;
    border-block-end: 1px solid var(--border);
    background: var(--bg-page);
    padding-block: 0.75rem;
    padding-inline: max(1rem, env(safe-area-inset-left, 0px)) max(1rem, env(safe-area-inset-right, 0px));
  }

  .top-bar-inner {
    inline-size: 100%;
    max-inline-size: 1700px;
    margin-inline: auto;
    padding-inline: clamp(0rem, 1.5vw, 1.25rem);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .top-bar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }

  button, .btn-link {
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    border-radius: var(--radius-btn);
    font-weight: 600;
    text-decoration: none;
    transition: opacity 120ms ease, background-color 120ms ease, border-color 120ms ease, transform 80ms ease;
    min-block-size: var(--target-size);
    min-inline-size: var(--target-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0.625rem 1.125rem;
    font-size: 0.9375rem;
    line-height: 1.25;
  }

  button:active:not(:disabled), .btn-link:active { transform: scale(0.99); }
  button:disabled { opacity: 0.55; cursor: not-allowed; }

  :where(a, button, input, select, textarea):focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 3px;
  }

  .btn-primary {
    background: var(--primary);
    color: var(--primary-fg);
    border-color: var(--primary);
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.9; }

  .btn-secondary {
    background: var(--bg-card);
    color: var(--fg);
    border-color: var(--control-border);
  }
  .btn-secondary:hover:not(:disabled) { background: var(--secondary); }

  .btn-ghost {
    background: transparent;
    color: var(--muted-fg);
    border-color: var(--border);
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--secondary);
    color: var(--fg);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 600;
    background: var(--secondary);
    color: var(--fg);
    border: 1px solid var(--border);
  }

  .pill.is-ok {
    background: var(--success-bg);
    color: var(--success-fg);
    border-color: var(--success-border);
  }

  .pill.is-scan {
    background: var(--warn-bg);
    color: var(--warn-fg);
    border-color: var(--warn-border);
  }

  .pill.is-err {
    background: var(--danger-bg);
    color: var(--danger-fg);
    border-color: var(--danger-border);
  }

  .alert-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 0.875rem 1rem;
    border-radius: 10px;
    background: var(--danger-bg);
    color: var(--danger-fg);
    border: 1px solid var(--danger-border);
    font-size: 0.95rem;
    text-align: start;
  }
  .alert-error[hidden], [hidden] { display: none !important; }

  .visually-hidden {
    position: absolute;
    clip-path: inset(50%);
    overflow: hidden;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    white-space: nowrap;
  }

  @media (forced-colors: active) {
    .card, .qr-surface, .btn-secondary, .btn-ghost, .pill, .qr-frame {
      border: 2px solid CanvasText;
    }
    .btn-primary {
      border: 2px solid ButtonText;
    }
    :where(a, button, input, select, textarea):focus-visible {
      outline: 3px solid Highlight;
    }
  }
`

export function renderQrLoginHtml(session: string, invalidAttempt: boolean): string {
  const safeSession = escapeHtml(session)
  const extraCss = `
    body {
      min-block-size: 100svh;
      min-block-size: 100dvb;
      display: flex;
      flex-direction: column;
      background: var(--bg-subtle);
    }
    .login-stage {
      flex: 1;
      display: grid;
      place-items: center;
      padding: clamp(1.25rem, 4vw, 2.5rem);
    }
    .login-wrap { inline-size: 100%; max-inline-size: 420px; display: grid; gap: 1.25rem; }
    .brand-header { display: flex; justify-content: center; }
    .card { padding: 1.75rem 1.5rem; }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-wrap: balance;
    }
    p { margin: 0 0 1.25rem; color: var(--muted-fg); font-size: 0.9375rem; text-wrap: pretty; }
    label { display: block; font-size: 0.875rem; font-weight: 500; margin-block-end: 0.375rem; }
    input {
      inline-size: 100%;
      min-block-size: 44px;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-btn);
      border: 1px solid var(--control-border);
      background: var(--bg-page);
      color: var(--fg);
      font-size: 1rem;
      margin-block-end: 1rem;
    }
    .btn-primary { inline-size: 100%; min-block-size: 46px; font-size: 1rem; }
    .alert-error { margin-block-end: 1rem; }
  `

  return `<!doctype html>
<html lang="es">
${renderHeadHtml('Acceso Panel de Control — CoPAS', extraCss)}
<body>
  <main class="login-stage">
    <div class="login-wrap">
      <header class="brand-header">
        ${renderBrandHtml()}
      </header>
      <form class="card" method="post" action="/qr/login">
        <h1>Panel de Control WhatsApp</h1>
        <p>Ingresá el token de administrador (<code>QR_PORTAL_TOKEN</code>) para administrar sesiones, generar enlaces QR y realizar pruebas para <strong>${safeSession}</strong>.</p>
        ${invalidAttempt ? '<div class="alert-error" role="alert"><span aria-hidden="true">!</span><span>Token inválido. Verificá el token e intentá nuevamente.</span></div>' : ''}
        <input type="hidden" name="session" value="${safeSession}" />
        <label for="token">Token de administrador</label>
        <input id="token" name="token" type="password" autocomplete="current-password" required placeholder="QR_PORTAL_TOKEN" />
        <button type="submit" class="btn-primary">Entrar al panel</button>
      </form>
    </div>
  </main>
</body>
</html>`
}

export function renderQrInviteErrorHtml(): string {
  const extraCss = `
    body {
      min-block-size: 100svh;
      min-block-size: 100dvb;
      display: flex;
      flex-direction: column;
      background: var(--bg-page);
    }
    .error-stage {
      flex: 1;
      inline-size: 100%;
      max-inline-size: 1700px;
      margin-inline: auto;
      display: flex;
      align-items: center;
      padding-block: clamp(2rem, 6dvb, 4.5rem);
      padding-inline: clamp(1.25rem, 5vw, 3.5rem);
    }
    .error-copy {
      display: grid;
      gap: 1rem;
      max-inline-size: 56ch;
    }
    .icon-box {
      inline-size: 52px;
      block-size: 52px;
      border-radius: 999px;
      background: var(--danger-bg);
      color: var(--danger-fg);
      border: 1px solid var(--danger-border);
      display: grid;
      place-items: center;
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 1.35rem + 2.4vw, 3.25rem);
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.03em;
      text-wrap: balance;
    }
    p {
      margin: 0;
      color: var(--muted-fg);
      font-size: clamp(1.0625rem, 0.98rem + 0.45vw, 1.25rem);
      text-wrap: pretty;
    }
  `

  return `<!doctype html>
<html lang="es">
${renderHeadHtml('Enlace vencido — CoPAS', extraCss)}
<body>
  <header class="top-bar">
    <div class="top-bar-inner">
      ${renderBrandHtml()}
      <span class="pill is-err">Enlace inválido</span>
    </div>
  </header>
  <main class="error-stage">
    <div class="error-copy" role="alert">
      <div class="icon-box" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      </div>
      <h1>Este enlace venció o no es válido</h1>
      <p>Pedile un enlace nuevo al equipo de CoPAS para poder vincular tu WhatsApp.</p>
    </div>
  </main>
</body>
</html>`
}

function renderQrScanHtml(params: {
  activeSession: string
  inviteToken: string
}): string {
  const bootstrapJson = JSON.stringify({
    activeSession: params.activeSession,
    inviteToken: params.inviteToken,
  }).replace(/</g, '\\u003c')

  const extraCss = `
    body {
      min-block-size: 100svh;
      min-block-size: 100dvb;
      display: flex;
      flex-direction: column;
      background: var(--bg-page);
    }

    .qr-main {
      flex: 1;
      inline-size: 100%;
      display: flex;
      align-items: center;
      padding-block: clamp(1.5rem, 4.5dvb, 4rem);
      padding-inline: max(clamp(1rem, 4vw, 3rem), env(safe-area-inset-left, 0px)) max(clamp(1rem, 4vw, 3rem), env(safe-area-inset-right, 0px));
      padding-block-end: max(clamp(1.5rem, 4.5dvb, 4rem), env(safe-area-inset-bottom, 0px));
    }

    .qr-stage-wrap {
      inline-size: 100%;
      max-inline-size: 1700px;
      margin-inline: auto;
      container: qr-stage / inline-size;
    }

    .qr-layout {
      inline-size: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: clamp(1.75rem, 4vw, 4.5rem);
      align-items: center;
    }

    @media (min-width: 860px) {
      .qr-layout {
        grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      }
    }

    @container qr-stage (inline-size >= 860px) {
      .qr-layout {
        grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
      }
    }

    .copy-col {
      display: grid;
      gap: clamp(1rem, 2.2vw, 1.5rem);
      justify-items: start;
      align-content: center;
      min-inline-size: 0;
    }

    h1 {
      margin: 0;
      font-size: clamp(2.125rem, 1.35rem + 2.8vw, 3.75rem);
      font-weight: 700;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: var(--fg);
      text-wrap: balance;
      max-inline-size: 16ch;
    }

    .lead {
      margin: 0;
      font-size: clamp(1.0625rem, 0.98rem + 0.45vw, 1.3125rem);
      line-height: 1.5;
      color: var(--muted-fg);
      max-inline-size: 46ch;
      text-wrap: pretty;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      inline-size: 100%;
      margin-block-start: 0.25rem;
    }

    .action-btn {
      min-block-size: 52px;
      padding: 0.875rem 1.5rem;
      font-size: 1.0625rem;
      border-radius: 10px;
      flex: 1 1 210px;
      max-inline-size: 280px;
    }
    .action-btn[hidden] { display: none; }

    .status-note {
      margin: 0;
      font-size: 0.95rem;
      color: var(--muted-fg);
      max-inline-size: 46ch;
      text-wrap: pretty;
    }
    .status-note[hidden] { display: none; }

    .qr-surface {
      inline-size: 100%;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: clamp(1.5rem, 3.5vw, 3rem);
      display: grid;
      place-items: center;
      min-block-size: clamp(290px, 44dvb, 440px);
      box-shadow: var(--shadow-card);
    }

    .stage-panel {
      inline-size: 100%;
      display: grid;
      gap: 1.125rem;
      justify-items: center;
      text-align: center;
    }
    .stage-panel[hidden] { display: none; }

    .state-icon {
      inline-size: 72px;
      block-size: 72px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: var(--bg-card);
      color: var(--fg);
      border: 1px solid var(--border);
    }

    .state-icon.is-success {
      background: var(--success-bg);
      color: var(--success-fg);
      border-color: var(--success-border);
    }

    .panel-label {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--fg);
    }

    .panel-sub {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--muted-fg);
      max-inline-size: 32ch;
      text-wrap: pretty;
    }

    .qr-frame {
      background: #ffffff;
      color: #171717;
      color-scheme: light;
      border: 1px solid #d4d4d4;
      border-radius: 14px;
      padding: 18px;
      inline-size: min(100%, 340px);
      aspect-ratio: 1 / 1;
      display: grid;
      place-items: center;
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.06);
    }

    .qr-frame img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }
    .qr-frame img[hidden] { display: none; }

    .qr-placeholder {
      color: #525252;
      font-size: 0.95rem;
      padding: 1rem;
    }
    .qr-placeholder[hidden] { display: none; }

    progress {
      inline-size: min(100%, 240px);
      block-size: 8px;
      border-radius: 999px;
      accent-color: var(--primary);
    }

    @media (max-width: 600px) {
      .action-btn {
        max-inline-size: none;
        inline-size: 100%;
      }
      .qr-frame {
        padding: 12px;
      }
    }
  `

  return `<!doctype html>
<html lang="es">
${renderHeadHtml('Vincular WhatsApp — CoPAS', extraCss)}
<body>
  <header class="top-bar">
    <div class="top-bar-inner">
      ${renderBrandHtml()}
      <div class="top-bar-actions">
        <span id="statusPill" class="pill">Verificando…</span>
      </div>
    </div>
  </header>

  <main class="qr-main">
    <div class="qr-stage-wrap">
      <div class="qr-layout">
        <div class="copy-col">
          <h1 id="headlineText">Preparando tu vinculación…</h1>
          <p id="leadText" class="lead">Un segundo, estamos verificando el estado de tu WhatsApp.</p>

          <div id="actionsRow" class="actions" hidden>
            <button id="btnPrimary" type="button" class="btn-primary action-btn" hidden>Generar código QR</button>
          </div>

          <div id="actionError" class="alert-error" role="alert" hidden>
            <span aria-hidden="true">!</span>
            <span id="actionErrorText"></span>
          </div>
        </div>

        <div class="qr-surface">
          <div id="stageLoading" class="stage-panel">
            <div class="state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </div>
            <p id="loadingLabel" class="panel-label">Verificando estado…</p>
            <progress aria-label="Preparando código QR"></progress>
          </div>

          <div id="stageIdle" class="stage-panel" hidden>
            <div class="state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z"/><path d="M20 14v3h-3"/><path d="M14 20h6"/><path d="M20 20v-1"/></svg>
            </div>
            <p class="panel-label">Tu código QR aparecerá acá</p>
            <p class="panel-sub">Tocá «Generar código QR» para mostrar el código en pantalla.</p>
          </div>

          <div id="stageScan" class="stage-panel" hidden>
            <div class="qr-frame">
              <img id="qrImg" width="320" height="320" alt="Código QR para vincular tu WhatsApp con CoPAS" hidden />
              <span id="qrPlaceholder" class="qr-placeholder">Cargando código QR…</span>
            </div>
            <p class="panel-sub">Al escanearlo, la conexión se confirmará automáticamente.</p>
          </div>

          <div id="stageDone" class="stage-panel" hidden>
            <div class="state-icon is-success" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <p class="panel-label">Conexión exitosa</p>
            <p class="panel-sub">Ya podés cerrar esta pestaña.</p>
          </div>
        </div>
      </div>

      <div id="liveAnnouncer" class="visually-hidden" aria-live="polite"></div>
    </div>
  </main>

  <script>
    const BOOT = ${bootstrapJson};
    const currentSession = BOOT.activeSession;
    const inviteToken = BOOT.inviteToken || '';
    let currentStatus = 'LOADING';
    let lastQrAt = 0;
    let pollTimer = null;
    let isBusy = false;
    let confettiPlayed = false;
    let lastAnnouncement = '';

    if (!inviteToken && window.location.search.includes('token=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const els = {
      statusPill: document.getElementById('statusPill'),
      headline: document.getElementById('headlineText'),
      lead: document.getElementById('leadText'),
      actionsRow: document.getElementById('actionsRow'),
      btnPrimary: document.getElementById('btnPrimary'),
      errorBox: document.getElementById('actionError'),
      errorText: document.getElementById('actionErrorText'),
      stageLoading: document.getElementById('stageLoading'),
      loadingLabel: document.getElementById('loadingLabel'),
      stageIdle: document.getElementById('stageIdle'),
      stageScan: document.getElementById('stageScan'),
      stageDone: document.getElementById('stageDone'),
      qrImg: document.getElementById('qrImg'),
      qrPlaceholder: document.getElementById('qrPlaceholder'),
      announcer: document.getElementById('liveAnnouncer'),
    };

    function withAuth(path) {
      if (!inviteToken) return path;
      const sep = path.includes('?') ? '&' : '?';
      return path + sep + 'invite=' + encodeURIComponent(inviteToken);
    }

    function announce(text) {
      if (!text) return;
      const msg = text === lastAnnouncement ? text + '\\u00A0' : text;
      lastAnnouncement = text;
      els.announcer.textContent = msg;
    }

    function setError(msg) {
      if (!msg) {
        els.errorBox.hidden = true;
        els.errorText.textContent = '';
      } else {
        els.errorText.textContent = msg;
        els.errorBox.hidden = false;
      }
    }

    function showStage(stageId) {
      els.stageLoading.hidden = stageId !== 'stageLoading';
      els.stageIdle.hidden = stageId !== 'stageIdle';
      els.stageScan.hidden = stageId !== 'stageScan';
      els.stageDone.hidden = stageId !== 'stageDone';
    }

    function launchConfetti() {
      if (confettiPlayed) return;
      confettiPlayed = true;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        canvas.remove();
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = () => {
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      const colors = ['#16a34a', '#22c55e', '#863bff', '#2563eb', '#f59e0b', '#171717'];
      const w = window.innerWidth;
      const h = window.innerHeight;
      const pieces = Array.from({ length: 90 }, (_, i) => {
        const fromLeft = i % 2 === 0;
        const originX = fromLeft ? w * 0.2 : w * 0.8;
        const angle = (fromLeft ? -Math.PI / 3 : (-2 * Math.PI) / 3) + (Math.random() - 0.5) * 0.7;
        const speed = 7 + Math.random() * 8;
        return {
          x: originX + (Math.random() - 0.5) * 80,
          y: h * 0.58 + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 6 + Math.random() * 6,
          color: colors[i % colors.length],
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
          tilt: Math.random() * Math.PI,
          vTilt: 0.08 + Math.random() * 0.08,
        };
      });

      const start = performance.now();
      const durationMs = 3400;

      function frame(now) {
        const elapsed = now - start;
        if (elapsed >= durationMs) {
          window.removeEventListener('resize', resize);
          canvas.remove();
          return;
        }
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const fade = elapsed > 2400 ? Math.max(0, 1 - (elapsed - 2400) / 1000) : 1;

        for (const p of pieces) {
          p.vy += 0.22;
          p.vx *= 0.99;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vRot;
          p.tilt += p.vTilt;

          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.tilt));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
          ctx.restore();
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function loadQrImage(force) {
      const now = Date.now();
      if (!force && now - lastQrAt < 20000) return;
      lastQrAt = now;
      setError('');
      if (els.qrImg.hidden) {
        els.qrPlaceholder.hidden = false;
        els.qrPlaceholder.textContent = 'Cargando código QR…';
      }
      els.qrImg.onload = () => {
        els.qrImg.hidden = false;
        els.qrPlaceholder.hidden = true;
      };
      els.qrImg.onerror = () => {
        els.qrImg.hidden = true;
        els.qrPlaceholder.hidden = false;
        els.qrPlaceholder.textContent = 'No pudimos cargar el código QR. Tocá «Actualizar QR».';
      };
      els.qrImg.src = withAuth('/qr/' + encodeURIComponent(currentSession) + '/image?t=' + now);
    }

    function applyStateView(status) {
      const prevStatus = currentStatus;
      currentStatus = status;

      if (status === 'WORKING') {
        els.statusPill.className = 'pill is-ok';
        els.statusPill.textContent = 'Conectado';
        els.headline.textContent = '¡Conexión exitosa!';
        els.lead.textContent = 'Tu WhatsApp ya quedó vinculado con CoPAS. Ya podés cerrar esta pestaña.';
        els.actionsRow.hidden = true;
        els.btnPrimary.hidden = true;
        showStage('stageDone');
        document.title = '¡Conexión exitosa! — CoPAS';
        if (prevStatus !== 'WORKING') {
          announce('¡Conexión exitosa! Tu WhatsApp ya quedó vinculado con CoPAS. Ya podés cerrar esta pestaña.');
          launchConfetti();
        }
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        return;
      }

      if (status === 'SCAN_QR_CODE') {
        els.statusPill.className = 'pill is-scan';
        els.statusPill.textContent = 'Listo para escanear';
        els.headline.textContent = 'Escaneá este código QR';
        els.lead.textContent = 'Abrí WhatsApp en tu celular → Dispositivos vinculados → Vincular un dispositivo.';
        els.actionsRow.hidden = false;
        els.btnPrimary.hidden = false;
        els.btnPrimary.textContent = 'Actualizar QR';
        showStage('stageScan');
        document.title = 'Escaneá el QR — CoPAS';
        loadQrImage(prevStatus !== 'SCAN_QR_CODE');
        if (prevStatus !== 'SCAN_QR_CODE') {
          announce('Código QR listo para escanear.');
        }
        return;
      }

      if (status === 'STARTING') {
        els.statusPill.className = 'pill';
        els.statusPill.textContent = 'Iniciando…';
        els.headline.textContent = 'Generando tu código QR…';
        els.lead.textContent = 'Esperá unos segundos, en seguida aparece en pantalla.';
        els.loadingLabel.textContent = 'Generando código QR…';
        els.actionsRow.hidden = true;
        els.btnPrimary.hidden = true;
        showStage('stageLoading');
        document.title = 'Generando código QR — CoPAS';
        return;
      }

      els.statusPill.className = 'pill';
      els.statusPill.textContent = 'Listo para vincular';
      els.headline.textContent = 'Vinculá tu WhatsApp con CoPAS';
      els.lead.textContent = 'Tocá el botón para generar tu código QR y escanealo desde WhatsApp en tu celular.';
      els.actionsRow.hidden = false;
      els.btnPrimary.hidden = false;
      els.btnPrimary.textContent = 'Generar código QR';
      showStage('stageIdle');
      document.title = 'Vincular WhatsApp — CoPAS';
    }

    async function fetchStatus() {
      const res = await fetch(withAuth('/qr/' + encodeURIComponent(currentSession) + '/status'), {
        credentials: 'same-origin',
      });
      if (res.status === 401 || res.status === 403) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        els.statusPill.className = 'pill is-err';
        els.statusPill.textContent = 'Enlace vencido';
        els.actionsRow.hidden = true;
        els.btnPrimary.disabled = true;
        setError('Este enlace venció o ya no es válido. Pedile uno nuevo al equipo de CoPAS.');
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.detail ? data.detail.status : 'NOT_FOUND';
    }

    async function pollStatus() {
      if (isBusy) return;
      try {
        const status = await fetchStatus();
        if (status) applyStateView(status);
      } catch {}
    }

    async function handlePrimaryClick() {
      if (isBusy) return;
      isBusy = true;
      setError('');
      els.btnPrimary.disabled = true;
      const wasScan = currentStatus === 'SCAN_QR_CODE';
      els.btnPrimary.textContent = wasScan ? 'Actualizando QR…' : 'Generando QR…';

      try {
        const latest = await fetchStatus();
        if (latest === 'WORKING') {
          applyStateView('WORKING');
          return;
        }
        if (latest !== 'SCAN_QR_CODE') {
          const startRes = await fetch(withAuth('/qr/' + encodeURIComponent(currentSession) + '/start'), {
            method: 'POST',
            credentials: 'same-origin',
          });
          if (!startRes.ok) {
            throw new Error('No pudimos generar el código QR. Intentá nuevamente.');
          }
          currentStatus = '';
        }
        const after = await fetchStatus();
        if (after === 'SCAN_QR_CODE') {
          applyStateView('SCAN_QR_CODE');
          loadQrImage(true);
          announce('Código QR actualizado.');
        } else if (after) {
          applyStateView(after);
        }
      } catch (err) {
        setError(err && err.message ? err.message : 'Ocurrió un error. Intentá nuevamente.');
      } finally {
        isBusy = false;
        els.btnPrimary.disabled = false;
        if (currentStatus === 'SCAN_QR_CODE') {
          els.btnPrimary.textContent = 'Actualizar QR';
        } else if (currentStatus !== 'WORKING') {
          els.btnPrimary.textContent = 'Generar código QR';
        }
      }
    }

    els.btnPrimary.addEventListener('click', handlePrimaryClick);

    pollStatus();
    pollTimer = setInterval(pollStatus, 1500);
  </script>
</body>
</html>`
}

function renderQrAdminHtml(params: {
  activeSession: string
  sessionsConfig?: {
    sessions: Record<string, { wahaSession: string; displayPhone?: string; agencyName?: string }>
  }
  liveSessions?: Array<{ name: string; status: string }>
  defaultInviteMinutes?: number
  publicBaseUrl?: string
}): string {
  const safeSession = escapeHtml(params.activeSession)
  const inviteMinutes = params.defaultInviteMinutes || 15
  const bootstrapJson = JSON.stringify({
    mode: 'admin',
    activeSession: params.activeSession,
    sessionsConfig: params.sessionsConfig?.sessions || {},
    liveSessions: params.liveSessions || [],
    publicBaseUrl: params.publicBaseUrl || '',
  }).replace(/</g, '\\u003c')

  const extraCss = `
    body {
      min-block-size: 100svh;
      min-block-size: 100dvb;
      display: flex;
      flex-direction: column;
      background: var(--bg-subtle);
    }

    .panel-main {
      flex: 1;
      inline-size: 100%;
      max-inline-size: 1700px;
      margin-inline: auto;
      padding-block: clamp(1rem, 2.5vw, 1.75rem);
      padding-inline: clamp(1rem, 3vw, 2rem);
    }

    .page-head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.75rem;
      margin-block-end: 1.25rem;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.375rem, 1.15rem + 0.9vw, 1.75rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      text-wrap: balance;
    }

    h2 {
      margin: 0 0 0.375rem;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.015em;
    }

    .muted {
      color: var(--muted-fg);
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.45;
      text-wrap: pretty;
    }

    .bento {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.25rem;
      align-items: start;
    }

    @media (min-width: 980px) {
      .bento {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
    }

    .col-stack {
      display: grid;
      gap: 1.25rem;
      min-inline-size: 0;
    }

    .card {
      padding: 1.25rem 1.375rem;
      min-inline-size: 0;
    }

    .card-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-block-end: 0.5rem;
    }

    .field-grid {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      margin-block-start: 0.75rem;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-block-start: 0.75rem;
    }

    label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--muted-fg);
      margin-block-end: 0.25rem;
    }

    input, select, textarea {
      inline-size: 100%;
      min-block-size: 42px;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-btn);
      border: 1px solid var(--control-border);
      background: var(--bg-page);
      color: var(--fg);
      font-size: 0.9rem;
      font-family: inherit;
    }

    textarea {
      min-block-size: 84px;
      resize: vertical;
    }

    .divider-top {
      margin-block-start: 1rem;
      padding-block-start: 1rem;
      border-block-start: 1px solid var(--border);
    }

    .btn-green { background: #16a34a; color: #ffffff; border-color: #16a34a; }
    .btn-amber { background: #d97706; color: #ffffff; border-color: #d97706; }
    .btn-red { background: #dc2626; color: #ffffff; border-color: #dc2626; }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid var(--border);
    }
    .b-ok { background: var(--success-bg); color: var(--success-fg); border-color: var(--success-border); }
    .b-qr { background: var(--warn-bg); color: var(--warn-fg); border-color: var(--warn-border); }
    .b-warn { background: var(--danger-bg); color: var(--danger-fg); border-color: var(--danger-border); }
    .b-idle { background: var(--secondary); color: var(--muted-fg); }

    .invite-result {
      margin-block-start: 0.75rem;
      padding: 0.75rem;
      border-radius: 10px;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      display: grid;
      gap: 0.5rem;
    }
    .invite-result[hidden] { display: none; }

    .qr-preview {
      margin-block-start: 1rem;
      background: #ffffff;
      color: #171717;
      color-scheme: light;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #d4d4d4;
      inline-size: min(100%, 260px);
      aspect-ratio: 1 / 1;
      display: grid;
      place-items: center;
    }
    .qr-preview img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: contain;
    }

    .log {
      margin-block-start: 0.75rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      white-space: pre-wrap;
      max-block-size: 240px;
      overflow: auto;
    }
    .log[hidden] { display: none; }
  `

  return `<!doctype html>
<html lang="es">
${renderHeadHtml('Panel de Control — CoPAS', extraCss)}
<body>
  <header class="top-bar">
    <div class="top-bar-inner">
      ${renderBrandHtml()}
      <div class="top-bar-actions">
        <span class="pill">Panel de control</span>
        <form method="post" action="/qr/logout-admin" style="margin:0;">
          <button type="submit" class="btn-ghost" style="min-block-size:36px; padding:0.375rem 0.75rem; font-size:0.8125rem;">Salir</button>
        </form>
      </div>
    </div>
  </header>

  <main class="panel-main">
    <div class="page-head">
      <div>
        <h1>Panel de Control WhatsApp</h1>
        <p class="muted">Generá links QR para clientes finales, administrá sesiones y realizá envíos manuales de prueba.</p>
      </div>
      <a class="btn-link btn-secondary" href="/qr/${encodeURIComponent(params.activeSession)}" target="_blank" rel="noopener noreferrer">Abrir vista QR cliente</a>
    </div>

    <div class="bento">
      <div class="col-stack">
        <section class="card" aria-labelledby="sec-links">
          <h2 id="sec-links">Sesiones y Links de Acceso QR</h2>
          <p class="muted">Elegí la sesión de la agencia y generá un enlace temporal exclusivo para que el cliente escanee su QR.</p>

          <div class="field-grid">
            <div>
              <label for="sessionSelect">Sesiones registradas</label>
              <select id="sessionSelect"></select>
            </div>
            <div>
              <label for="sessionInput">Abrir o crear sesión por nombre</label>
              <div class="row" style="margin-block-start:0;">
                <input id="sessionInput" value="${safeSession}" placeholder="ej. agencia-norte" style="flex:1; min-inline-size:140px;" />
                <button type="button" class="btn-secondary" onclick="switchSession()">Abrir</button>
              </div>
            </div>
          </div>

          <div class="divider-top">
            <label for="inviteTtl">Enlace temporal para cliente final (sesión <strong>${safeSession}</strong>)</label>
            <div class="row" style="margin-block-start:0.25rem;">
              <select id="inviteTtl" style="inline-size:auto; min-inline-size:160px;">
                <option value="15" ${inviteMinutes === 15 ? 'selected' : ''}>Expira en 15 min</option>
                <option value="30" ${inviteMinutes === 30 ? 'selected' : ''}>Expira en 30 min</option>
                <option value="60" ${inviteMinutes === 60 ? 'selected' : ''}>Expira en 60 min</option>
                <option value="120" ${inviteMinutes === 120 ? 'selected' : ''}>Expira en 120 min</option>
              </select>
              <button type="button" class="btn-primary" onclick="generateInviteLink()">Generar y copiar link</button>
            </div>

            <div id="inviteResult" class="invite-result" hidden>
              <p id="inviteStatus" class="muted" role="status"></p>
              <code id="inviteUrlText" class="break-anywhere" style="font-size:0.8125rem;"></code>
              <div class="row" style="margin-block-start:0;">
                <button type="button" class="btn-secondary" onclick="copyLastInviteLink()">Copiar enlace</button>
                <a id="inviteOpenLink" class="btn-link btn-ghost" href="#" target="_blank" rel="noopener noreferrer">Probar enlace</a>
              </div>
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="sec-session">
          <div class="card-header">
            <h2 id="sec-session" style="margin:0;">Estado de sesión: <span id="sessionLabel">${safeSession}</span></h2>
            <span id="statusBadge" class="badge b-idle">Consultando…</span>
          </div>
          <p id="meInfo" class="muted"></p>

          <div class="row">
            <button type="button" class="btn-green" onclick="sessionAction('start')">Iniciar / Generar QR</button>
            <button type="button" class="btn-amber" onclick="sessionAction('restart')">Reiniciar</button>
            <button type="button" class="btn-red" onclick="sessionAction('logout')">Cerrar sesión</button>
            <button type="button" class="btn-secondary" onclick="syncStatusWithCopas()">Sincronizar con CoPAS</button>
          </div>
          <p id="sessionActionMsg" class="muted" style="margin-block-start:0.5rem;" role="status"></p>

          <div id="qrArea" hidden>
            <div class="qr-preview">
              <img id="qrImg" width="240" height="240" alt="Vista previa del código QR de WhatsApp" />
            </div>
            <div class="row">
              <button type="button" class="btn-secondary" onclick="refreshQr(true)">Refrescar QR ahora</button>
            </div>

            <div class="divider-top">
              <label for="pairPhone">Vincular con código numérico (soporte sin cámara)</label>
              <div class="row" style="margin-block-start:0.25rem;">
                <input id="pairPhone" placeholder="5493704609703" style="flex:1; min-inline-size:150px;" />
                <button type="button" class="btn-primary" onclick="requestPairingCode()">Pedir código</button>
              </div>
              <p id="pairResult" class="muted" style="margin-block-start:0.5rem;"></p>
            </div>
          </div>
        </section>
      </div>

      <section class="card" aria-labelledby="sec-manual">
        <h2 id="sec-manual">Disparo Manual de Mensaje</h2>
        <p class="muted">Envía mensajes de prueba directo desde el panel usando la cola humana de <code>waha-proxy</code> y seguí los eventos en vivo.</p>

        <div class="field-grid">
          <div>
            <label for="phoneIdInput">phoneNumberId / endpoint</label>
            <input id="phoneIdInput" value="5493718446327" />
          </div>
          <div>
            <label for="msgMode">Tipo de envío</label>
            <select id="msgMode" onchange="toggleMode()">
              <option value="template">Plantilla recordatorio_vencimiento</option>
              <option value="text">Texto libre</option>
            </select>
          </div>
          <div>
            <label for="toInput">Teléfono destino</label>
            <input id="toInput" placeholder="543704609703" />
          </div>
        </div>

        <div id="tplFields" class="field-grid">
          <div><label for="tplCustomer">Asegurado (customer_name)</label><input id="tplCustomer" value="Lucas Fernández" /></div>
          <div><label for="tplAgency">Agencia (agency_name)</label><input id="tplAgency" value="Agencia CoPAS Seguros" /></div>
          <div><label for="tplPlate">Patente (plate_number)</label><input id="tplPlate" value="AE482KM" /></div>
          <div><label for="tplDate">Vencimiento (expiration_date)</label><input id="tplDate" value="20/11/2026" /></div>
          <div><label for="tplAmount">Monto (amount)</label><input id="tplAmount" value="48.500,00" /></div>
        </div>

        <div id="textFields" hidden style="margin-block-start:0.75rem;">
          <label for="freeText">Mensaje de texto</label>
          <textarea id="freeText" placeholder="Hola, te escribimos de tu agencia de seguros..."></textarea>
        </div>

        <div class="row">
          <button id="sendBtn" type="button" class="btn-primary" onclick="sendManualMessage()">Enviar mensaje manual</button>
        </div>
        <div id="sendLog" class="log" hidden></div>
      </section>
    </div>
  </main>

  <script>
    const BOOT = ${bootstrapJson};
    const currentSession = BOOT.activeSession;
    let lastQrAt = 0;
    let lastStatus = '';
    let lastInviteUrl = '';

    if (window.location.search.includes('token=')) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('token');
      window.history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search);
    }

    function populateSelectors() {
      const sel = document.getElementById('sessionSelect');
      const seen = new Set();
      const entries = [];
      for (const [phoneId, cfg] of Object.entries(BOOT.sessionsConfig || {})) {
        if (!seen.has(cfg.wahaSession)) {
          seen.add(cfg.wahaSession);
          entries.push({ session: cfg.wahaSession, label: cfg.wahaSession + ' (' + phoneId + ')' });
        }
      }
      for (const s of (BOOT.liveSessions || [])) {
        if (!seen.has(s.name)) {
          seen.add(s.name);
          entries.push({ session: s.name, label: s.name + ' [' + s.status + ']' });
        }
      }
      if (!seen.has(currentSession)) {
        entries.unshift({ session: currentSession, label: currentSession });
      }
      const opts = entries.map((item) => {
        const opt = document.createElement('option');
        opt.value = item.session;
        opt.textContent = item.label;
        if (item.session === currentSession) opt.selected = true;
        return opt;
      });
      sel.replaceChildren(...opts);
      sel.onchange = () => {
        document.getElementById('sessionInput').value = sel.value;
        switchSession();
      };

      const matchingEntry = Object.entries(BOOT.sessionsConfig || {}).find(([k, v]) => k !== 'default' && v.wahaSession === currentSession);
      if (matchingEntry) {
        document.getElementById('phoneIdInput').value = matchingEntry[0];
      }
    }

    function switchSession() {
      const val = document.getElementById('sessionInput').value.trim();
      if (!val) return;
      window.location.href = '/qr?session=' + encodeURIComponent(val);
    }

    function legacyCopy(text) {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0;';
      document.body.append(field);
      field.select();
      try { return document.execCommand('copy'); } finally { field.remove(); }
    }

    async function writeClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return legacyCopy(text);
      }
    }

    async function copyLastInviteLink() {
      if (!lastInviteUrl) return;
      const statusEl = document.getElementById('inviteStatus');
      const ok = await writeClipboard(lastInviteUrl);
      statusEl.textContent = ok
        ? 'Enlace copiado al portapapeles.'
        : 'No se pudo copiar automáticamente; seleccionalo arriba.';
    }

    async function generateInviteLink() {
      const ttlMinutes = Number.parseInt(document.getElementById('inviteTtl').value, 10) || 15;
      const box = document.getElementById('inviteResult');
      const statusEl = document.getElementById('inviteStatus');
      const urlText = document.getElementById('inviteUrlText');
      const openLink = document.getElementById('inviteOpenLink');

      box.hidden = false;
      statusEl.textContent = 'Generando enlace temporal…';
      urlText.textContent = '';

      try {
        const res = await fetch('/qr/' + encodeURIComponent(currentSession) + '/invite', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttlMinutes }),
        });
        const data = await res.json();
        if (!res.ok) {
          statusEl.textContent = 'Error generando enlace: ' + (data.error || res.status);
          return;
        }
        const baseUrl = (BOOT.publicBaseUrl || '').trim() || window.location.origin;
        lastInviteUrl = baseUrl + data.invitePath;
        urlText.textContent = lastInviteUrl;
        openLink.href = lastInviteUrl;
        const copied = await writeClipboard(lastInviteUrl);
        statusEl.textContent = (copied ? 'Link copiado' : 'Link generado') + ' (expira ' + data.expiresAt + ')';
      } catch (err) {
        statusEl.textContent = 'Error de red: ' + err.message;
      }
    }

    function refreshQr(force) {
      const now = Date.now();
      if (!force && now - lastQrAt < 20000) return;
      lastQrAt = now;
      document.getElementById('qrImg').src = '/qr/' + encodeURIComponent(currentSession) + '/image?t=' + now;
    }

    async function pollStatus() {
      try {
        const res = await fetch('/qr/' + encodeURIComponent(currentSession) + '/status', {
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = await res.json();
        const detail = data.detail;
        const status = detail ? detail.status : 'NOT_FOUND';
        const badge = document.getElementById('statusBadge');
        badge.textContent = status;
        badge.className = 'badge ' + (status === 'WORKING' ? 'b-ok' : status === 'SCAN_QR_CODE' ? 'b-qr' : (status === 'FAILED' || status === 'STOPPED') ? 'b-warn' : 'b-idle');

        const meEl = document.getElementById('meInfo');
        if (detail && detail.me && detail.me.id) {
          meEl.textContent = 'Conectado como: ' + (detail.me.pushName || '') + ' (' + detail.me.id + ')';
        } else if (!detail) {
          meEl.textContent = 'La sesión todavía no existe en WAHA. Tocá «Iniciar / Generar QR».';
        } else {
          meEl.textContent = 'Estado actual en WAHA: ' + status;
        }

        const qrArea = document.getElementById('qrArea');
        if (status === 'SCAN_QR_CODE') {
          qrArea.hidden = false;
          refreshQr(lastStatus !== 'SCAN_QR_CODE');
        } else {
          qrArea.hidden = true;
        }
        lastStatus = status;
      } catch {}
    }

    async function sessionAction(action) {
      const msgEl = document.getElementById('sessionActionMsg');
      msgEl.textContent = 'Ejecutando acción "' + action + '"…';
      try {
        const res = await fetch('/qr/' + encodeURIComponent(currentSession) + '/' + action, {
          method: 'POST',
          credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errMsg = (data && data.error && data.error.message) || data.error || ('HTTP ' + res.status);
          msgEl.textContent = 'Error (' + action + '): ' + errMsg;
          return;
        }
        msgEl.textContent = 'Acción "' + action + '" ejecutada correctamente.';
        lastStatus = '';
        await pollStatus();
      } catch (err) {
        msgEl.textContent = 'Error de red (' + action + '): ' + err.message;
      }
    }

    async function syncStatusWithCopas() {
      const msgEl = document.getElementById('sessionActionMsg');
      msgEl.textContent = 'Sincronizando estados con CoPAS…';
      try {
        const res = await fetch('/qr/sync-status', {
          method: 'POST',
          credentials: 'same-origin',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          msgEl.textContent = 'Error sincronizando: ' + (data.error || ('HTTP ' + res.status));
          return;
        }
        if (!data.reachable) {
          msgEl.textContent = 'WAHA no está accesible en este momento.';
          return;
        }
        msgEl.textContent = 'Sincronización CoPAS: ' + (data.forwarded || 0) + ' enviadas, ' + (data.skipped || 0) + ' omitidas, ' + (data.failed || 0) + ' fallidas.';
      } catch (err) {
        msgEl.textContent = 'Error de red sincronizando: ' + err.message;
      }
    }

    async function requestPairingCode() {
      const phone = document.getElementById('pairPhone').value.trim();
      const out = document.getElementById('pairResult');
      out.textContent = 'Solicitando código…';
      try {
        const res = await fetch('/qr/' + encodeURIComponent(currentSession) + '/pairing-code', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone }),
        });
        const data = await res.json();
        out.textContent = res.ok && data.code ? 'Código para ingresar en WhatsApp: ' + data.code : 'Error: ' + JSON.stringify(data);
      } catch (err) {
        out.textContent = 'Error: ' + err.message;
      }
    }

    function toggleMode() {
      const mode = document.getElementById('msgMode').value;
      document.getElementById('tplFields').hidden = mode !== 'template';
      document.getElementById('textFields').hidden = mode !== 'text';
    }

    async function sendManualMessage() {
      const btn = document.getElementById('sendBtn');
      const logEl = document.getElementById('sendLog');
      logEl.hidden = false;
      btn.disabled = true;

      const phoneNumberId = document.getElementById('phoneIdInput').value.trim() || 'default';
      const to = document.getElementById('toInput').value.trim();
      const mode = document.getElementById('msgMode').value;
      const body = mode === 'text'
        ? {
            phoneNumberId,
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: document.getElementById('freeText').value.trim() },
          }
        : {
            phoneNumberId,
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: 'recordatorio_vencimiento',
              language: { code: 'es_AR' },
              components: [{
                type: 'body',
                parameters: [
                  { type: 'text', parameter_name: 'customer_name', text: document.getElementById('tplCustomer').value.trim() },
                  { type: 'text', parameter_name: 'agency_name', text: document.getElementById('tplAgency').value.trim() },
                  { type: 'text', parameter_name: 'plate_number', text: document.getElementById('tplPlate').value.trim() },
                  { type: 'text', parameter_name: 'expiration_date', text: document.getElementById('tplDate').value.trim() },
                  { type: 'text', parameter_name: 'amount', text: document.getElementById('tplAmount').value.trim() },
                ],
              }],
            },
          };

      try {
        logEl.textContent = 'Encolando mensaje…';
        const res = await fetch('/qr/' + encodeURIComponent(currentSession) + '/test-send', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          logEl.textContent = 'Error HTTP ' + res.status + ':\\n' + JSON.stringify(data, null, 2);
          btn.disabled = false;
          return;
        }
        const wamid = data.messages && data.messages[0] && data.messages[0].id;
        logEl.textContent = 'Encolado wamid: ' + wamid + '\\nEsperando despacho humano (typing + cooldown)…';

        let attempts = 0;
        const timer = setInterval(async () => {
          attempts++;
          const evRes = await fetch('/qr/' + encodeURIComponent(currentSession) + '/events?wamid=' + encodeURIComponent(wamid) + '&limit=10', {
            credentials: 'same-origin',
          });
          if (evRes.ok) {
            const evData = await evRes.json();
            logEl.textContent = (evData.items || []).slice().reverse().map((e) => '[' + e.eventType + '] ' + e.message).join('\\n');
            if ((evData.items || []).some((e) => e.eventType === 'waha_dispatched' || e.eventType === 'job_failed') || attempts >= 15) {
              clearInterval(timer);
              btn.disabled = false;
            }
          }
        }, 2000);
      } catch (err) {
        logEl.textContent = 'Error: ' + err.message;
        btn.disabled = false;
      }
    }

    populateSelectors();
    pollStatus();
    setInterval(pollStatus, 3000);
  </script>
</body>
</html>`
}

export function renderQrPortalHtml(params: QrPortalRenderParams): string {
  if (params.mode === 'qr') {
    return renderQrScanHtml({
      activeSession: params.activeSession,
      inviteToken: params.inviteToken || '',
    })
  }
  return renderQrAdminHtml({
    activeSession: params.activeSession,
    sessionsConfig: params.sessionsConfig,
    liveSessions: params.liveSessions,
    defaultInviteMinutes: params.defaultInviteMinutes,
    publicBaseUrl: params.publicBaseUrl,
  })
}
