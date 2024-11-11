/** @format */

import { Locator } from '@playwright/test';

export type DataRow = [date: string, hours: string, desc: string];
export type Data = {
  date: string;
  minutes: number;
  desc: string;
};

export function parseRow(row: DataRow) {
  const [date, hours, description] = row;
  const [issue, note] = description?.split(':').map(trimDelimiters);
  const [issuePrefix, issueId] = issue.split(/[ -]/).map(trimDelimiters);
  const minutes = stringHoursToNumericMinutes(hours);
  return {
    date,
    issue,
    note,
    issuePrefix,
    issueId,
    minutes,
  };
}

export function stringHoursToNumericMinutes(hours: string) {
  const [h, hourFractions] = hours.split('.');
  return (parseInt(h) || 0) * 60 + parseFloat(`0.${hourFractions}`) * 60;
}

export function trimDelimiters(str: string) {
  return [...str].filter((char) => char !== '`').join('');
}

export function parseReportContent(content: string): DataRow[] {
  return content
    .split('\n')
    .map((row) => {
      const parts = row.split(/^([\d.]+?),([\d.]+?),`(.+?)`$/);
      parts.shift();
      parts.pop();
      return parts;
    })
    .filter((row) => row.length === 3)
    .sort(([, , aDesc], [, , bDesc]) => aDesc.localeCompare(bDesc)) as DataRow[];
}

export function parseComponents(content: string) {
  return content
    .split('\n')
    .map((row) => row.split(': '))
    .filter((row) => row[0]);
}

export function dateToAT(date: Date) {
  return date.toLocaleDateString('DE-AT', { dateStyle: 'medium' });
}

export function parseDateAT(dateStringAT: string) {
  const d = new Date();
  const [day, month, year] = dateStringAT.split('.').map(parseInt);
  d.setFullYear(year);
  d.setMonth(month - 1);
  d.setDate(day);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d.getTime();
}

export async function readAndPrepareData(results: Locator) {
  const data: Data[] = [];

  let date: string;
  for (const row of await results.locator('table').all()) {
    const content = await Promise.all((await row.locator('td').all()).map(async (node) => (await node.textContent()).trim()));
    if (content.length === 1) {
      continue;
    }

    const [d, desc, hours] = content;
    date = d || date;
    if (!hours) {
      continue;
    }
    data.push({
      date,
      minutes: stringHoursToNumericMinutes(hours),
      desc,
    });
  }

  data.sort(({ date: aDate, desc: aDesc }, { date: bDate, desc: bDesc }) =>
    aDate === bDate ? aDesc.localeCompare(bDesc) : parseDateAT(aDate) - parseDateAT(bDate)
  );

  // sum same activities per day for singular jira entry
  const { length } = data;
  for (let i = 0; i < length; ) {
    const d = data[i];
    let matchIndex = -1;
    for (let j = i + 1; j < length; j++) {
      const c = data[j];
      if (!c || c.date !== d.date) {
        break;
      }
      if (c.desc === d.desc) {
        matchIndex = j;
        break;
      }
    }
    if (!~matchIndex) {
      i++;
      continue;
    }
    const c = data[matchIndex];
    c.minutes += d.minutes;
    data.splice(i, 1);
  }

  return data
    .map(({ date, minutes, desc }) => [date, `${minutes / 60}`, `\`${desc}\``])
    .sort(([aDate, , aDesc], [bDate, , bDesc]) => (aDate === bDate ? aDesc.localeCompare(bDesc) : parseDateAT(aDate) - parseDateAT(bDate)));
}
