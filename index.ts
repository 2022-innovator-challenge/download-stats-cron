import puppeteer from 'puppeteer';
import axios from 'axios';

async function getVersionsDownloads(page, packageName) {
  await page.goto(`https://www.npmjs.com/package/${packageName}`);
  // window as a global variable is not recognized by TypeScript, therefore ignore checks for this line
  // @ts-ignore
  return page.evaluate(() => window.__context__.context.versionsDownloads);
}

async function aggregateStats(versionsDownloads) {
  return Object.entries(versionsDownloads)
    .filter(([version]) => !version.includes('-'))
    .reduce((majorVersions, [version, downloads]) => {
      const [majorVersion] = version.split('.');
      return {
        ...majorVersions,
        [majorVersion]: (majorVersions[majorVersion] ?? 0) + downloads
      };
    }, {});
}

async function getStatsForPackage(page, packageName) {
  const versionsDownloads = await getVersionsDownloads(page, packageName);
  return aggregateStats(versionsDownloads);
}

async function getAllStats(page) {
  return ['@sap-cloud-sdk/util', '@sap/cds'].reduce(
    async (stats, packageName) => ({
      ...(await stats),
      [packageName]: await getStatsForPackage(page, packageName)
    }),
    {}
  );
}

function getBodyForPackageStats(packageName, packageStats) {
  return Object.entries(packageStats).map(([version, downloads]) => ({
    package: packageName,
    version,
    downloads
  }));
}

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const stats = await getAllStats(page);

  const data = Object.entries(stats).flatMap(([packageName, packageStats]) =>
    getBodyForPackageStats(packageName, packageStats)
  );

  try {
    await axios.request({
      method: 'post',
      url: 'http://downloadstats-service:3000/download-stats/bulk',
      data
    });
  } catch (err) {
    console.error('Failed to update download stats.');
    throw err;
  } finally {
    await browser.close();
  }
}

main();
