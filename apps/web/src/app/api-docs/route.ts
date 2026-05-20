export async function GET(): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>PledgeOFF API Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --canvas:    #0A0A0B;
      --surface:   #111114;
      --border:    #1F1F23;
      --t1:        #F5F5F4;
      --t2:        #A1A1A6;
      --t3:        #808088;
      --accent:    #D6FF3D;
      --validated: #7DD66B;
      --caution:   #E8B341;
      --kill:      #E55B3C;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--canvas);
      color: var(--t1);
      font-family: "Inter Tight", system-ui, sans-serif;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Header bar ── */
    .swagger-ui .topbar { display: none; }

    .api-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .api-header-logo {
      font-family: "Inter Tight", system-ui, sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.04em;
      color: var(--t1);
    }
    .api-header-logo span {
      color: var(--accent);
    }
    .api-header-badge {
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--t3);
      border: 1px solid var(--border);
      background: var(--canvas);
      padding: 3px 8px;
      border-radius: 4px;
    }

    /* ── Wrapper ── */
    .swagger-ui {
      font-family: "Inter Tight", system-ui, sans-serif !important;
      color: var(--t1) !important;
    }

    /* ── Main wrapper ── */
    .swagger-ui .wrapper {
      max-width: 1100px;
      padding: 0 24px;
    }

    /* ── Info block ── */
    .swagger-ui .info {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0 16px;
    }
    .swagger-ui .info .title {
      font-family: "Inter Tight", system-ui, sans-serif !important;
      font-size: 22px !important;
      font-weight: 700 !important;
      letter-spacing: -0.04em !important;
      color: var(--t1) !important;
    }
    .swagger-ui .info .title small {
      font-size: 12px !important;
      color: var(--t3) !important;
      font-weight: 400 !important;
      letter-spacing: 0 !important;
    }
    .swagger-ui .info p,
    .swagger-ui .info li,
    .swagger-ui .info a {
      color: var(--t2) !important;
      font-size: 13px !important;
    }
    .swagger-ui .info a { color: var(--accent) !important; text-decoration: none; }
    .swagger-ui .info a:hover { opacity: 0.8; }

    /* ── Scheme selector ── */
    .swagger-ui .scheme-container {
      background: var(--surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: 8px !important;
      padding: 12px 16px !important;
      margin-bottom: 16px !important;
      box-shadow: none !important;
    }
    .swagger-ui .scheme-container .schemes > label {
      color: var(--t3) !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
    }

    /* ── Authorize button ── */
    .swagger-ui .auth-wrapper .authorize {
      background: var(--accent) !important;
      color: #000 !important;
      border: none !important;
      border-radius: 6px !important;
      font-family: "Inter Tight", system-ui, sans-serif !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      padding: 8px 16px !important;
      cursor: pointer !important;
    }
    .swagger-ui .auth-wrapper .authorize:hover { opacity: 0.9 !important; }
    .swagger-ui .auth-wrapper .authorize svg { fill: #000 !important; }

    /* ── Tag / section headers ── */
    .swagger-ui .opblock-tag {
      background: transparent !important;
      border-bottom: 1px solid var(--border) !important;
      padding: 12px 0 !important;
      margin: 8px 0 !important;
    }
    .swagger-ui .opblock-tag h3 {
      font-family: "Inter Tight", system-ui, sans-serif !important;
      font-size: 15px !important;
      font-weight: 600 !important;
      letter-spacing: -0.02em !important;
      color: var(--t1) !important;
    }
    .swagger-ui .opblock-tag small {
      color: var(--t3) !important;
      font-size: 12px !important;
    }
    .swagger-ui .opblock-tag:hover { background: transparent !important; }
    .swagger-ui .opblock-tag svg { fill: var(--t2) !important; }

    /* ── Operation blocks ── */
    .swagger-ui .opblock {
      border-radius: 6px !important;
      border: 1px solid var(--border) !important;
      background: var(--surface) !important;
      margin-bottom: 6px !important;
      box-shadow: none !important;
    }
    .swagger-ui .opblock .opblock-summary {
      border-bottom: none !important;
      padding: 10px 12px !important;
    }
    .swagger-ui .opblock .opblock-summary-description {
      color: var(--t2) !important;
      font-size: 13px !important;
    }
    .swagger-ui .opblock .opblock-summary-path {
      color: var(--t1) !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 13px !important;
    }
    .swagger-ui .opblock .opblock-summary-path__deprecated {
      color: var(--t3) !important;
    }

    /* Method colors */
    .swagger-ui .opblock.opblock-get {
      border-color: #1a3a4a !important;
      background: #0d1e26 !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #1e6fa0 !important;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #1a3a1a !important;
      background: #0d1e0d !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #2d7a2d !important;
    }
    .swagger-ui .opblock.opblock-put,
    .swagger-ui .opblock.opblock-patch {
      border-color: #3a2e1a !important;
      background: #1e1a0d !important;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method,
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #8a5c00 !important;
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #3a1a1a !important;
      background: #1e0d0d !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #8a2000 !important;
    }

    .swagger-ui .opblock-summary-method {
      font-family: "JetBrains Mono", monospace !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      border-radius: 4px !important;
      min-width: 58px !important;
    }

    /* ── Expanded operation body ── */
    .swagger-ui .opblock-body {
      background: var(--canvas) !important;
      border-top: 1px solid var(--border) !important;
    }
    .swagger-ui .opblock-section-header {
      background: var(--surface) !important;
      border-bottom: 1px solid var(--border) !important;
    }
    .swagger-ui .opblock-section-header h4 {
      font-family: "JetBrains Mono", monospace !important;
      font-size: 11px !important;
      font-weight: 500 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      color: var(--t3) !important;
    }
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-external-docs-wrapper p,
    .swagger-ui .opblock-title_normal p {
      color: var(--t2) !important;
      font-size: 13px !important;
    }

    /* ── Tables ── */
    .swagger-ui table {
      background: transparent !important;
    }
    .swagger-ui table thead tr th {
      background: var(--surface) !important;
      border-bottom: 1px solid var(--border) !important;
      color: var(--t3) !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      font-weight: 500 !important;
      padding: 8px 12px !important;
    }
    .swagger-ui table tbody tr td {
      border-bottom: 1px solid var(--border) !important;
      color: var(--t2) !important;
      font-size: 13px !important;
      padding: 8px 12px !important;
      background: transparent !important;
    }
    .swagger-ui table tbody tr:hover td {
      background: var(--surface) !important;
    }

    /* ── Parameters ── */
    .swagger-ui .parameters-col_description p {
      color: var(--t2) !important;
      font-size: 13px !important;
    }
    .swagger-ui .parameter__name {
      font-family: "JetBrains Mono", monospace !important;
      color: var(--t1) !important;
      font-size: 13px !important;
    }
    .swagger-ui .parameter__type {
      color: var(--t3) !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 12px !important;
    }
    .swagger-ui .parameter__in {
      color: var(--t3) !important;
      font-size: 11px !important;
      font-family: "JetBrains Mono", monospace !important;
    }
    .swagger-ui .required > .parameter__name::after {
      color: var(--kill) !important;
    }

    /* ── Response codes ── */
    .swagger-ui .responses-inner {
      background: transparent !important;
    }
    .swagger-ui .response-col_status {
      font-family: "JetBrains Mono", monospace !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: var(--validated) !important;
    }
    .swagger-ui .response-col_links {
      color: var(--t3) !important;
    }
    .swagger-ui table.responses-table tbody tr:first-child .response-col_status {
      color: var(--validated) !important;
    }
    .swagger-ui table.responses-table tbody tr:not(:first-child) .response-col_status {
      color: var(--caution) !important;
    }
    .swagger-ui .response-col_description__inner p {
      color: var(--t2) !important;
      font-size: 13px !important;
    }

    /* ── Code / JSON ── */
    .swagger-ui .microlight,
    .swagger-ui pre.microlight {
      background: var(--canvas) !important;
      color: var(--t1) !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 12px !important;
      border: 1px solid var(--border) !important;
      border-radius: 6px !important;
      padding: 12px !important;
    }
    .swagger-ui .highlight-code {
      background: var(--canvas) !important;
    }
    .swagger-ui .highlight-code > .microlight {
      background: var(--canvas) !important;
    }
    .swagger-ui textarea {
      background: var(--canvas) !important;
      color: var(--t1) !important;
      border: 1px solid var(--border) !important;
      border-radius: 4px !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 12px !important;
    }

    /* ── Models / Schema ── */
    .swagger-ui section.models {
      background: var(--surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: 8px !important;
      padding: 0 !important;
      margin-top: 24px !important;
    }
    .swagger-ui section.models h4 {
      font-family: "Inter Tight", system-ui, sans-serif !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      color: var(--t1) !important;
      border-bottom: 1px solid var(--border) !important;
      padding: 12px 16px !important;
      margin: 0 !important;
    }
    .swagger-ui section.models .model-container {
      background: var(--canvas) !important;
      border: 1px solid var(--border) !important;
      border-radius: 6px !important;
      margin: 8px 12px !important;
    }
    .swagger-ui .model-title {
      font-family: "JetBrains Mono", monospace !important;
      color: var(--t1) !important;
      font-size: 13px !important;
    }
    .swagger-ui .model {
      color: var(--t2) !important;
      font-family: "JetBrains Mono", monospace !important;
      font-size: 12px !important;
    }
    .swagger-ui .prop-type { color: #7DD66B !important; }
    .swagger-ui .prop-format { color: var(--caution) !important; }
    .swagger-ui span.prop.prop-format { color: var(--caution) !important; }

    /* ── SVG icons ── */
    .swagger-ui svg { fill: var(--t2) !important; }
    .swagger-ui .arrow { fill: var(--t3) !important; }

    /* ── Select / inputs ── */
    .swagger-ui select {
      background: var(--surface) !important;
      color: var(--t1) !important;
      border: 1px solid var(--border) !important;
      border-radius: 4px !important;
      font-family: "Inter Tight", system-ui, sans-serif !important;
    }
    .swagger-ui input[type=text],
    .swagger-ui input[type=email],
    .swagger-ui input[type=password] {
      background: var(--canvas) !important;
      color: var(--t1) !important;
      border: 1px solid var(--border) !important;
      border-radius: 4px !important;
      font-family: "JetBrains Mono", monospace !important;
    }
    .swagger-ui input[type=text]:focus,
    .swagger-ui input[type=email]:focus,
    .swagger-ui input[type=password]:focus {
      border-color: var(--accent) !important;
      outline: none !important;
    }
    .swagger-ui label {
      color: var(--t3) !important;
      font-size: 12px !important;
    }

    /* ── Modal / Dialog ── */
    .swagger-ui .dialog-ux .backdrop-ux {
      background: rgba(0,0,0,0.7) !important;
    }
    .swagger-ui .dialog-ux .modal-ux {
      background: var(--surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: 8px !important;
      box-shadow: 0 24px 48px rgba(0,0,0,0.5) !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header {
      background: var(--surface) !important;
      border-bottom: 1px solid var(--border) !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 {
      color: var(--t1) !important;
      font-family: "Inter Tight", system-ui, sans-serif !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content {
      background: var(--canvas) !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content p,
    .swagger-ui .dialog-ux .modal-ux-content h4 {
      color: var(--t2) !important;
    }

    /* ── Buttons general ── */
    .swagger-ui button {
      font-family: "Inter Tight", system-ui, sans-serif !important;
    }
    .swagger-ui .btn {
      border-radius: 6px !important;
      font-weight: 600 !important;
      font-size: 13px !important;
    }
    .swagger-ui .btn.authorize {
      background: var(--accent) !important;
      color: #000 !important;
      border-color: var(--accent) !important;
    }
    .swagger-ui .btn.cancel {
      background: transparent !important;
      color: var(--t2) !important;
      border: 1px solid var(--border) !important;
    }
    .swagger-ui .btn.cancel:hover {
      background: var(--surface) !important;
      color: var(--t1) !important;
    }
    .swagger-ui .close-tag {
      color: var(--t2) !important;
    }

    /* ── Copy button ── */
    .swagger-ui .copy-to-clipboard {
      background: var(--surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: 4px !important;
    }
    .swagger-ui .copy-to-clipboard button {
      background: transparent !important;
    }

    /* ── Loading state ── */
    .swagger-ui .loading-container .loading::before {
      border-color: var(--border) !important;
      border-top-color: var(--accent) !important;
    }

    /* ── Links ── */
    .swagger-ui a { color: var(--accent) !important; }
    .swagger-ui a:hover { opacity: 0.8 !important; }

    /* ── Expand/collapse arrows ── */
    .swagger-ui .expand-operation svg,
    .swagger-ui .arrow svg { fill: var(--t3) !important; }
  </style>
</head>
<body>
  <div class="api-header">
    <div class="api-header-logo">Pledge<span>OFF</span></div>
    <div class="api-header-badge">API v1</div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        deepLinking: true,
        tryItOutEnabled: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      });
    };
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
