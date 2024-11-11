import {expect, Page} from "@playwright/test";

export function openTimetac(page: Page) {
  return page.goto(process.env.TT_URL ?? 'https://go.timetac.com/adesso');
}

export async function checkTimeTacMain(page: Page) {
  await expect(page.locator('#TimetacHeaderLogo')).toBeVisible();
  await page.locator('#loadingOverlay').waitFor({
    state: "hidden"
  });
}

export async function loginTimetac(page: Page) {
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
