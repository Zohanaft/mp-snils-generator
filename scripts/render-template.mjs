import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env");
const fallbackEnvPath = path.join(projectRoot, ".env.example");
const publicDir = path.join(projectRoot, "public");
const sourceDir = path.join(projectRoot, "src");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const env = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function normalizeSiteUrl(siteUrl) {
  return siteUrl.replace(/\/+$/, "");
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

function renderTemplate(templatePath, outputPath, replacements) {
  const source = fs.readFileSync(templatePath, "utf8");
  let output = source;

  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(`{{${token}}}`).join(value);
  }

  fs.writeFileSync(outputPath, output, "utf8");
}

function copyRootHtmlFilesToPublic(excludedNames = new Set()) {
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".html")) continue;
    if (excludedNames.has(entry.name)) continue;
    fs.copyFileSync(path.join(projectRoot, entry.name), path.join(publicDir, entry.name));
  }
}

const exampleEnv = parseEnvFile(fallbackEnvPath);
const fileEnv = parseEnvFile(envPath);
const env = { ...exampleEnv, ...fileEnv };

const metricsEnabled = String(env.METRICS_ENABLED || "false").toLowerCase() === "true";
const metrikaId = String(env.YANDEX_METRIKA_ID || "").trim();
const siteUrl = normalizeSiteUrl(String(env.SITE_URL || "https://example.com").trim());

const replacements = {
  SITE_URL: siteUrl,
  YANDEX_METRIKA_HEAD: "",
  YANDEX_METRIKA_NOSCRIPT: ""
};

fs.mkdirSync(publicDir, { recursive: true });

if (metricsEnabled) {
  if (!/^\d+$/.test(metrikaId)) {
    throw new Error("METRICS_ENABLED=true, but YANDEX_METRIKA_ID is empty or invalid.");
  }

  replacements.YANDEX_METRIKA_HEAD = buildMetrikaHead(metrikaId);
  replacements.YANDEX_METRIKA_NOSCRIPT = buildMetrikaNoscript(metrikaId);
}

renderTemplate(
  path.join(projectRoot, "index.template.html"),
  path.join(publicDir, "index.html"),
  replacements
);

renderTemplate(
  path.join(projectRoot, "robots.template.txt"),
  path.join(publicDir, "robots.txt"),
  replacements
);

renderTemplate(
  path.join(projectRoot, "sitemap.template.xml"),
  path.join(publicDir, "sitemap.xml"),
  replacements
);

fs.copyFileSync(path.join(sourceDir, "tailwind.css"), path.join(publicDir, "tailwind.css"));
fs.copyFileSync(path.join(sourceDir, "favicon.svg"), path.join(publicDir, "favicon.svg"));
copyRootHtmlFilesToPublic(new Set(["index.template.html"]));

console.log("Templates rendered to /public: index.html, robots.txt, sitemap.xml, tailwind.css, favicon.svg, extra root html files");
