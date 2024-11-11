import { test, expect, Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import {
  DataRow,
  Data,
  dateToAT,
  parseDateAT,
  stringHoursToNumericMinutes,
  readAndPrepareData
} from '../utils/data.util';
import { checkTimeTacMain, loginTimetac } from '../utils/timetac.util';
import { groupBy, map } from 'lodash';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

test('open timetac report', async ({ page }) => {
  test.setTimeout(1000 * 30);

  await loginTimetac(page);
  await checkTimeTacMain(page);

  if (!(await page.locator('#panel_left_time_tracker-bodyWrap').isVisible())) {
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
    state: 'visible',
  });

  // open auswertung
  const item = page.getByText('nach Mitarbeiter und Datum');
  await expect(item).toBeVisible();
  await item.click();

  await page.getByLabel('Startdatum:').fill(process.env.TT_START ?? dateToAT(new Date()));
  if (process.env.TT_END) {
    await page.getByLabel('Enddatum:').fill(process.env.TT_END);
  }

  await page.locator('#statistic_project_combo-trigger-picker').click();

  await page.getByText('Alle entfernen').click();

  // * scroll lazy rendered view until project item is visible
  let projItem: Locator;
  const gridContainer = page.locator('.projecttask-combo-selection .x-grid-item-container');
  do {
    await gridContainer.locator('table').first().scrollIntoViewIfNeeded();

    projItem = gridContainer.getByText(process.env.TT_PROJECT, { exact: false });
  } while (!(await projItem.isVisible({ timeout: 50 })));

  await projItem.click();
  await page.getByText('OK').click();

  await page.getByRole('button', { name: 'Anzeigen', exact: true }).click();
  const resultsPanel = page.locator('#grid_statistic_per_employee_and_date-bodyWrap');
  await expect(resultsPanel).toBeVisible();

  await page.locator('#grid_statistic_per_employee_and_date .x-mask').waitFor({ state: 'hidden' });

  const results = resultsPanel.locator('.x-grid-item-container');

  // *** read data
  const dataRows = await readAndPrepareData(results);

  fs.writeFileSync('report.md', dataRows.join('\n'));
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
