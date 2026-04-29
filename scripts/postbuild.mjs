import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env");
const fallbackEnvPath = path.join(projectRoot, ".env.example");
const outputDir = path.join(projectRoot, "public");
const sourceDir = path.join(projectRoot, "src");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const env = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function normalizeSiteUrl(url) {
  return url.replace(/\/+$/, "");
}

function buildMetrikaHead(metrikaId) {
  return `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}', 'ym');

    ym(${metrikaId}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<!-- /Yandex.Metrika counter -->`;
}

function buildMetrikaNoscript(metrikaId) {
  return `<noscript><div><img src="https://mc.yandex.ru/watch/${metrikaId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`;
}

function renderTemplate(templateName, outputName, replacements) {
  const sourcePath = path.join(projectRoot, templateName);
  const targetPath = path.join(outputDir, outputName);
  let content = fs.readFileSync(sourcePath, "utf8");
  for (const [token, value] of Object.entries(replacements)) {
    content = content.split(`{{${token}}}`).join(value);
  }
  fs.writeFileSync(targetPath, content, "utf8");
}

function copyRootHtmlFilesToPublic(excludedNames = new Set()) {
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".html")) continue;
    if (excludedNames.has(entry.name)) continue;
    fs.copyFileSync(path.join(projectRoot, entry.name), path.join(outputDir, entry.name));
  }
}

const env = { ...parseEnvFile(fallbackEnvPath), ...parseEnvFile(envPath) };
const metricsEnabled = String(env.METRICS_ENABLED || "false").toLowerCase() === "true";
const metrikaId = String(env.YANDEX_METRIKA_ID || "").trim();
const siteUrl = normalizeSiteUrl(String(env.SITE_URL || "https://example.com").trim());

const indexPath = path.join(outputDir, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");

const metrikaHead = metricsEnabled ? buildMetrikaHead(metrikaId) : "";
const metrikaNoscript = metricsEnabled ? buildMetrikaNoscript(metrikaId) : "";
indexHtml = indexHtml
  .replaceAll("__SITE_URL__", siteUrl)
  .replace("__YANDEX_METRIKA_HEAD__", metrikaHead)
  .replace("__YANDEX_METRIKA_NOSCRIPT__", metrikaNoscript);
fs.writeFileSync(indexPath, indexHtml, "utf8");

renderTemplate("robots.template.txt", "robots.txt", { SITE_URL: siteUrl });
renderTemplate("sitemap.template.xml", "sitemap.xml", { SITE_URL: siteUrl });
fs.copyFileSync(path.join(sourceDir, "favicon.svg"), path.join(outputDir, "favicon.svg"));
const sourceIcoPath = path.join(sourceDir, "favicon.ico");
const rootIcoPath = path.join(projectRoot, "favicon.ico");
if (fs.existsSync(sourceIcoPath)) {
  fs.copyFileSync(sourceIcoPath, path.join(outputDir, "favicon.ico"));
} else if (fs.existsSync(rootIcoPath)) {
  fs.copyFileSync(rootIcoPath, path.join(outputDir, "favicon.ico"));
}
copyRootHtmlFilesToPublic(new Set(["index.html"]));

console.log("Postbuild completed: metrika injected, robots/sitemap/favicon generated, extra root html files copied.");

