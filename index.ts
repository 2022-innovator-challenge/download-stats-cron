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

async function getBodyForPackageStats(packageName, packgeStats) {
  for (const [version, downloads] of Object.entries(packgeStats)) {
    const body = {
      package: packageName,
      version,
      downloads
    };

    console.log(body);

    // await axios.request({
    //   method: 'post',
    //   url: 'https://downloadstats.c2aecf0.kyma.ondemand.com/download-stats',
    //   data: body
    // });
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome'
  });
  const page = await browser.newPage();
  // eslint-disable-next-line no-console
  const stats = await getAllStats(page);
  console.log(stats);

  for (const [packageName, packageStats] of Object.entries(stats)) {
    await getBodyForPackageStats(packageName, packageStats);
  }

  await browser.close();
}

main();
