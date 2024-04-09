/** @format */

import { expect, Page, test } from '@playwright/test';
import fs from 'fs';

type DataRow = [date: string, hours: string, desc: string];

test('read ozg components', async ({ page }) => {
  test.setTimeout(1000 * 30);

  const content = fs.readFileSync('report.md').toString();
  const rows = parseContent(content);

  await openJira(page, rows[0]);
  await loginJira(page);

  let lastIssue = '';
  const issueMap = new Map<string, string>();

  for (const row of rows) {
    const {issueId, } = parseRow(row);

    if (lastIssue !== issueId) {
      lastIssue = issueId;
      await openJira(page, row);
    }

    const component = await page.locator('#components-field').textContent();

    if (issueId && !issueMap.get(issueId)) {
      issueMap.set(issueId, component?.trim());
    }
  }
  const entries = [...issueMap.entries()];

  fs.writeFileSync('components.md', entries.map((row) => row.join(': ')).join('\n'));
});

test('fill jira', async ({ page }) => {
  test.setTimeout(1000 * 60);

  const content = fs.readFileSync('report.md').toString();
  const rows = parseContent(content);

  await openJira(page, rows[0]);
  await loginJira(page);

  let lastIssue = '';

  for (const row of rows) {
    const {
      issue,
      issuePrefix,
      issueId,
      date,
      note,
      jiraTimeString
    } = parseRow(row);

    if (lastIssue !== issueId) {
      lastIssue = issueId;
      await openJira(page, row);
    }

    if (
      !(await page.getByRole('menuitem', { name: 'Log work' }).isVisible({
        timeout: 100,
      }))
    ) {
      const more = page.getByRole('button', { name: ' More' });
      await expect(more).toBeVisible();
      await more.click();
    }

    await page.getByRole('menuitem', { name: 'Log work' }).click();

    const timeInput = page.locator('#log-work-time-logged');
    await expect(timeInput).toBeVisible();

    const dayInput = page.locator('#log-work-date-logged-date-picker');
    const noteInput = page.getByLabel(`Log Work: ${issuePrefix}`).locator('#comment');

    await timeInput.fill(jiraTimeString);

    console.log(date, issue, note, jiraTimeString);

    const [DD, MM, YYYY] = date.split('.');
    await dayInput.fill(
      `${DD}/${
        JSON.parse(process.env.JIRA_MONTHS ?? '["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]')[
          parseInt(MM) - 1
        ]
      }/${YYYY} 10:00`
    );

    await noteInput.fill(note.slice(0, -1).trim());

    await page.getByRole('button', { name: 'Log' }).click();

    await page.locator('#log-work-dialog').waitFor({
      state: 'hidden',
    });
  }
});

function parseContent(content: string): DataRow[] {
  return content
    .split('\n')
    .map((row) => row.split(','))
    .filter((row) => row.length === 3)
    .sort(([, , aDesc], [, , bDesc]) => aDesc.localeCompare(bDesc)) as DataRow[];
}

function parseRow(row: DataRow) {
  const [date, hours, description] = row;
  const [issue, note] = description?.split(':');
  const [issuePrefix, issueId] = issue.split(/[ -]/);

  const [h, hourFractions] = hours.split('.');
  // console.log(hours, h, dm);
  const jiraTimeString = `${h}h ${parseFloat(`0.${hourFractions}`) * 60}m`;

  return {
    date, issue, note, issuePrefix, issueId, jiraTimeString
  }
}

function openJira(page: Page, row: DataRow) {
  const {issuePrefix} = parseRow(row);
  return page.goto(`${process.env.JIRA_URL}/tasks/browse/${process.env.JIRA_PREFIX}${issuePrefix}-1`);
}

async function loginJira(page: Page) {
  const button = page.getByRole('button', { name: 'Anmelden' });
  await expect(button).toBeVisible();
  const name = page.getByLabel('Benutzername');
  await expect(name).toBeVisible();
  const pass = page.getByLabel('Passwort');
  await expect(pass).toBeVisible();

  await name.fill(process.env.JIRA_USER);
  await pass.fill(process.env.JIRA_PASS);
  await button.click();
}
