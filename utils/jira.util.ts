import {expect, Page} from "@playwright/test";
import {DataRow, parseRow} from "./data.util";


export function parseAndOpenJira(page: Page, row: DataRow) {
  if (!row) throw new Error('data is malformed');
  const { issuePrefix, issueId } = parseRow(row);
  return openJira(page, issuePrefix, issueId);
}

export function openJira(page: Page, issuePrefix: string, issueId: string) {
  return page.goto(`${process.env.JIRA_URL}/tasks/browse/${issuePrefix}-${issueId ?? 1}`);
}

export async function loginJira(page: Page) {
  try {
    const button = page.getByRole('button', { name: 'Anmelden' });
    await expect(button).toBeVisible({timeout: 1000});
    const name = page.getByLabel('Benutzername');
    await expect(name).toBeVisible();
    const pass = page.getByLabel('Passwort');
    await expect(pass).toBeVisible();
    await name.fill(process.env.JIRA_USER);
    await pass.fill(process.env.JIRA_PASS);
    await button.click();
  } catch (e) {
    // Vorschaltseite für Azure-Konto
    const link = await page.getByText('Weiter mit Benutzername und Passwort');
    await expect(link).toBeVisible();
    await link.click();
    await loginJira(page);
  }

}
