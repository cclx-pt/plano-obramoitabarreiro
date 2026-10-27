#!/usr/bin/env python3
"""Gera index.html (versão só de leitura) a partir da página Plano da Obra no Claude.

Uso: python3 tools/build.py <pagina_ao_vivo.html> [index.html]
Só reescreve index.html se os dados do plano mudaram. Imprime CHANGED ou UNCHANGED.
"""
import sys, re, json, hashlib, datetime as dt
from zoneinfo import ZoneInfo

src = open(sys.argv[1], encoding="utf-8").read()
out = sys.argv[2] if len(sys.argv) > 2 else "index.html"

def grab(pat, s, what):
    m = re.search(pat, s, re.S)
    if not m:
        sys.exit(f"ERRO: não encontrei {what} na página")
    return m

state_txt = grab(r'<script type="application/json" id="state">(.*?)</script>', src, "os dados").group(1)
state = json.loads(state_txt)
digest = hashlib.sha256(json.dumps(state, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]

try:
    old = open(out, encoding="utf-8").read()
    m = re.search(r'name="plano-hash" content="([0-9a-f]+)"', old)
    if m and m.group(1) == digest:
        print("UNCHANGED"); sys.exit(0)
except FileNotFoundError:
    pass

css = grab(r'<style id="css">(.*?)</style>', src, "o estilo").group(1)
js = grab(r'<script id="appjs">(.*?)</script>', src, "o script").group(1)

now = dt.datetime.now(ZoneInfo("Europe/Lisbon"))
stamp = now.strftime("%d/%m/%Y às %H:%M")

# Versão estática: sem ligação ao Claude, sem gravação.
js = re.sub(r"\(window\.claude&&window\.claude\.use\?.*?\}\);\n", "", js, flags=re.S)
js = js.replace("saveMsg='A ligar…'", "saveMsg='Só leitura'")

ro_css = """
/* Versão pública só de leitura */
.btn.add,.btn.del,.g-add,.hint{display:none!important}
.st{pointer-events:none}
.in:disabled,.gd:disabled{opacity:1;color:var(--ink);-webkit-text-fill-color:var(--ink);cursor:default;border-color:transparent}
.gd::-webkit-calendar-picker-indicator,.in::-webkit-calendar-picker-indicator{display:none}
.ro{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-top:14px;padding:10px 14px;border:1px solid var(--line);border-radius:6px;background:var(--surface);font-size:13px;color:var(--muted)}
.ro b{color:var(--ink)}
"""
ro_js = """
(function(){
  function lock(){document.querySelectorAll('#app input,#app select,#app button').forEach(function(e){e.disabled=true;e.tabIndex=-1});
    var h=document.querySelector('#app header .lede');
    if(h&&!document.querySelector('.ro')){var d=document.createElement('div');d.className='ro';
      d.innerHTML='<b>Versão só de leitura</b><span>Atualizada automaticamente de hora a hora. Última alteração: STAMP.</span>';h.after(d)}}
  lock();new MutationObserver(lock).observe(document.getElementById('app'),{childList:true});
})();
""".replace("STAMP", stamp)

state_out = json.dumps(state, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
html = f"""<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="plano-hash" content="{digest}">
<title>Plano da Obra</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Narrow:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<style>:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}[hidden]{{display:none!important}}</style>
<style id="css">{css}{ro_css}</style>
</head><body><div id="app"></div>
<script type="application/json" id="state">{state_out}</script>
<script id="appjs">{js}</script>
<script>{ro_js}</script>
</body></html>
"""
open(out, "w", encoding="utf-8").write(html)
print("CHANGED")
