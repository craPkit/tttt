import { expect, test } from '@playwright/test';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { loginJira, openJira, parseAndOpenJira } from '../utils/jira.util';
import { parseComponents, parseReportContent, parseRow } from '../utils/data.util';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

test('read Components', async ({ page }) => {
  test.setTimeout(1000 * 30);

  const existing = fs.readFileSync('components.md').toString();
  const components = existing ? parseComponents(existing) : [];

  const content = fs.readFileSync('report.md').toString();
  const rows = parseReportContent(content);

  await parseAndOpenJira(page, rows[0]);
  await loginJira(page);

  let lastIssue = '';
  const issueMap = new Map<string, string>();
  // * initialize with existing data just to retain information – current data should still be fetched
  for (const [key, val] of components) {
    issueMap.set(key, val);
  }

  for (const row of rows) {
    if (!row) break;

    const { issueId, issuePrefix } = parseRow(row);

    if (lastIssue === issueId) {
      continue;
    }
    lastIssue = issueId;
    await openJira(page, issuePrefix, issueId);

    try {
      if (
        (
          await page.getByText(/^M - TVWK/).textContent({
            timeout: 100,
          })
        ).startsWith('M - TVWK')
      ) {
        issueMap.set(issueId, 'TVWK');
        continue;
      }
    } catch (e) {
      // never mind
    }

    const component = await page.locator('#components-field').textContent();

    if (issueId && !issueMap.get(issueId)) {
      issueMap.set(issueId, component?.trim());
    }
  }
  const entries = [...issueMap.entries()].sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10));

  fs.writeFileSync('components.md', entries.map((row) => row.join(': ')).join('\n'));
});

test('fill jira', async ({ page }) => {
  test.setTimeout(1000 * 120);

  const content = fs.readFileSync('report.md').toString();
  const rows = parseReportContent(content);

  await parseAndOpenJira(page, rows[0]);
  await loginJira(page);

  let lastIssue = '';

  for (const row of rows) {
    if (!row) break;

    const { issue, issuePrefix, issueId, date, note, minutes } = parseRow(row);
    const jiraTimeString = `${minutes}m`;

    if (lastIssue !== issueId) {
      lastIssue = issueId;
      await openJira(page, issuePrefix, issueId);
    }

    if (
      !(await page.getByRole('menuitem', { name: 'Log work' }).isVisible({
        timeout: 500,
      }))
    ) {
      const more = page.getByRole('button', { name: ' More' });
      await expect(more).toBeVisible();
      await more.click();
    }

    const startLogButton = page.getByRole('menuitem', { name: 'Log work' });
    await expect(startLogButton).toBeVisible();
    await startLogButton.click();

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

    await noteInput.fill(note);

    await page.getByRole('button', { name: 'Log' }).click();

    try {
      await page.getByLabel('Close').click();
    } catch (e) {
      // continue
    }

    await page.locator('#log-work-dialog').waitFor({
      state: 'hidden',
    });
  }
});
