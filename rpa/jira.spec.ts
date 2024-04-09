/** @format */

import { expect, Page, test } from '@playwright/test';
import fs from 'fs';
test('read ozg components', async ({ page }) => {
  test.setTimeout(1000 * 30);

  await openJira(page, '680');
  await loginJira(page);

  const content = fs.readFileSync('report.md').toString();
  const rows = parseContent(content);
  let lastIssue = '';
  const issueMap = new Map<string, string>();

  for (const row of rows) {
    const [date, hours, description] = row;
    const [issue, note] = description?.split(':');
    const [, issueId] = issue.split(/[ -]/);

    if (lastIssue !== issueId) {
      lastIssue = issueId;
      await openJira(page, issueId);
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

  await openJira(page, '680');
  await loginJira(page);

  const content = fs.readFileSync('report.md').toString();
  const rows = parseContent(content);
  let lastIssue = '';

  // const row = rows[0];
  for (const row of rows) {
    const [date, hours, description] = row;
    const [issue, note] = description?.split(':');
    const [, issueId] = issue.split(/[ -]/);

    if (lastIssue !== issueId) {
      lastIssue = issueId;
      await openJira(page, issueId);
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
    const noteInput = page.getByLabel('Log Work: OZG-').locator('#comment');

    const [h, dm] = hours.split('.');
    console.log(hours, h, dm);
    const t = `${h}h ${parseFloat(`0.${dm}`) * 60}m`;
    await timeInput.fill(t);

    console.log(date, issue, note, t);

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

function parseContent(content: string): [date: string, hours: string, desc: string] {
  return content
    .split('\n')
    .map((row) => row.split(','))
    .filter((row) => row.length === 3)
    .sort(([, , aDesc], [, , bDesc]) => aDesc.localeCompare(bDesc)) as unknown as [date: string, hours: string, desc: string];
}

function openJira(page: Page, issue: string) {
  return page.goto(`https://dev.ihkdigital.de/tasks/browse/OZG-${issue}`);
}

async function loginJira(page: Page) {
  const button = page.getByRole('button', { name: 'Anmelden' });
  // await expect(button).toBeVisible();
  const name = page.getByLabel('Benutzername');
  // await expect(name).toBeVisible();
  const pass = page.getByLabel('Passwort');
  // await expect(pass).toBeVisible();

  await name.fill(process.env.JIRA_USER);
  await pass.fill(process.env.JIRA_PASS);
  await button.click();
}
