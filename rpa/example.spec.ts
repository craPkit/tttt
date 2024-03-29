import {test, expect, Page, Locator} from '@playwright/test';
import * as fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function openTimetac(page: Page) {
  return page.goto(process.env.TT_URL ?? 'https://go.timetac.com/adesso');
}

async function checkTimeTacMain(page: Page) {
  await expect(page.locator('#TimetacHeaderLogo')).toBeVisible();
  await page.locator('#loadingOverlay').waitFor({
    state: "hidden"
  });
}

async function loginTimetac(page: Page) {
  await openTimetac(page);

  const button = page.getByRole('button', {name: 'Login'});
  // await expect(button).toBeVisible();
  const name = page.locator('#userName');
  // await expect(name).toBeVisible();
  const pass = page.locator('#userPass');
  // await expect(pass).toBeVisible();

  await name.fill(process.env.TT_USER);
  await pass.fill(process.env.TT_PASS);
  await button.click();
}

test('open timetac report', async ({page}) => {
  await loginTimetac(page);
  await checkTimeTacMain(page);

  if (!await page.locator('#panel_left_time_tracker-bodyWrap').isVisible()) {
    await page.getByLabel('erweitern').click();
  }

  // open auswertungen accordion
  const auswertungen = page.locator('#panel_left_statistic_header-title');
  await auswertungen.click();

  const awButton = page.locator('#stat_submit_button-btnEl');
  await expect(awButton).toBeVisible();

  // wait for accordion animation settled
  await page.waitForTimeout(300);

  // open dropdown
  const selectTrigger = page.locator('#menu_filter_statistic_report_combo-trigger-picker');
  await expect(selectTrigger).toBeVisible();
  await selectTrigger.click();

  await page.locator('#menu_filter_statistic_report_combo-picker').waitFor({
    state: 'visible'
  });

  // open auswertung
  const item = page.getByText('nach Mitarbeiter und Datum');
  await expect(item).toBeVisible();
  await item.click();

  await (page.getByLabel('Startdatum:')).fill('22.03.2024');
  await (page.getByLabel('Enddatum:')).fill('31.03.2024');

  await (page.locator('#statistic_project_combo-trigger-picker')).click();

  await (page.getByText('Alle entfernen')).click();

  // * scroll lazy rendered view until project item is visible
  let projItem: Locator;
  const table = page.locator('.projecttask-combo-selection .x-grid-item-container');
  do {
    await table.locator('table').first().scrollIntoViewIfNeeded();

    projItem = table.getByText(process.env.TT_PROJECT, {exact: false});
  } while (!await projItem.isVisible({timeout: 50}));

  await (projItem).click();
  await (page.getByText('OK')).click();

  await page.getByRole('button', {name: 'Anzeigen', exact: true}).click();
  const resultsPanel = page.locator('#grid_statistic_per_employee_and_date-bodyWrap');
  await expect(resultsPanel).toBeVisible();

  await page.locator('#grid_statistic_per_employee_and_date .x-mask').waitFor({state: 'hidden'});

  const results = resultsPanel.locator('.x-grid-item-container');

  // *** read data
  let date: string;
  const data: [date: string, hours: string, description: string][] = [];
  for (const row of await results.locator('table').all()) {
    const content = (await Promise.all((await row.locator('td').all()).map(async (node) => (await node.textContent()).trim())));
    if (content.length === 1) {
      continue;
    }

    date = content[0] || date;

    const hours = content[2];
    if (!hours) {
      continue;
    }

    const description = content[1];
    data.push([date, hours, `\`${description}\``]);
  }

  fs.writeFileSync('report.md', data.join('\n'));
});

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');
//
//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();
//
//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });
