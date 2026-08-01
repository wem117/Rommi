const fs = require("fs/promises");
const path = require("path");

async function main() {
  let puppeteer;

  try {
    puppeteer = require("puppeteer");
  } catch {
    console.error("Missing dependency: install puppeteer before running this script.");
    console.error("Run: npm install puppeteer --save-dev");
    process.exit(1);
  }

  const startUrl = process.env.CRAWL_START_URL || "https://roomi.kz";
  const maxPages = Number(process.env.CRAWL_MAX_PAGES || 20);
  const concurrency = Math.max(1, Number(process.env.CRAWL_CONCURRENCY || 2));
  const headless = process.env.CRAWL_HEADLESS !== "false";
  const outputDir = path.join(process.cwd(), "crawl-output");
  const reportPath = path.join(process.cwd(), "crawl-report.json");
  const baseUrl = new URL(startUrl);

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless,
    defaultViewport: { width: 1440, height: 960 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const queue = [startUrl];
  const queued = new Set(queue);
  const visited = new Set();
  const pages = [];

  function normalizeUrl(candidate) {
    try {
      const next = new URL(candidate, startUrl);
      next.hash = "";
      if (next.origin !== baseUrl.origin) return null;
      return next.toString().replace(/\/$/, "") || next.toString();
    } catch {
      return null;
    }
  }

  function slugify(url) {
    const next = new URL(url);
    const pathname = next.pathname === "/" ? "home" : next.pathname.replace(/^\/+/, "").replace(/[\/\\]+/g, "__");
    const query = next.search ? `__${next.search.slice(1).replace(/[^a-z0-9]+/gi, "_")}` : "";
    return `${pathname}${query}`.replace(/[^a-z0-9_]+/gi, "_").toLowerCase();
  }

  async function crawlPage(url) {
    const page = await browser.newPage();
    const consoleErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    let status = 0;
    let title = "";
    let html = "";
    let discoveredLinks = [];

    try {
      // Using domcontentloaded to prevent hanging on Supabase WebSockets/polling
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });

      status = response ? response.status() : 0;
      title = await page.title();
      html = await page.content();
      
      discoveredLinks = await page.$$eval("a[href]", (anchors) =>
        anchors
          .map((anchor) => anchor.getAttribute("href"))
          .filter((href) => typeof href === "string" && href.length > 0)
      );
    } catch (error) {
      consoleErrors.push(error instanceof Error ? error.message : String(error));
    } finally {
      const htmlPath = path.join(outputDir, `${slugify(url)}.html`);
      await fs.writeFile(htmlPath, html || "", "utf8");
      await page.close();

      return {
        result: {
          url,
          status,
          title,
          htmlPath,
          consoleErrors
        },
        links: discoveredLinks
      };
    }
  }

  while (queue.length && visited.size < maxPages) {
    const batch = queue.splice(0, concurrency).filter((url) => !visited.has(url));
    if (!batch.length) break;

    const crawled = await Promise.all(batch.map((url) => crawlPage(url)));

    for (let index = 0; index < batch.length; index += 1) {
      const url = batch[index];
      const { result, links } = crawled[index];

      visited.add(url);
      pages.push(result);

      for (const link of links) {
        const normalized = normalizeUrl(link);
        if (!normalized) continue;
        if (visited.has(normalized) || queued.has(normalized)) continue;
        if (visited.size + queue.length >= maxPages) continue;
        queued.add(normalized);
        queue.push(normalized);
      }
    }
  }

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    startUrl,
    maxPages,
    concurrency,
    pages
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Saved crawl report to ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});