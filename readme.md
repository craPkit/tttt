# TimeTac Time Tracking

RPA-export time tracking data from TimeTac, import into X; no API necessary. (Currently X is Jira only.)

This is meant for my own personal use, so no support is provided and probably won't be aligned with your workflow or your specific environment. 

This package is heavily misusing playwright for RPA, so get over it.

## Setup

npm ci

## Prerequisites  
* A Jira instance that uses Work Logs ;)  
* VPN connection to access Jira, if necessary  
* setup your .env  
  * start by `cp example.env .env` and edit  
  * `TT_URL`: your company's TimeTac instance URL  
  * `TT_USER`: your personal TimeTac user name (usually without email-suffix)
  * `TT_PASS`: your user's TimeTac password
  * `TT_PROJECT`: the TimeTac project (not task) associated with your client's Jira instance
  * `TT_START`: start date for collecting TimeTac data (DE-AT format)
  * `JIRA_URL`: Your client's Jira instance URL, excluding any suffixes (assuming standard Jira paths, if that exists)
  * `JIRA_USER`: your Jira user ID (usually the full email-address)
  * `JIRA_PASS`: your user's Jira password
  * `JRIA_MONTHS`: a list of shortened Month Names compatible with your Jira locale (usually determined by your Browser/System)

## How-to

0. Log your work in TimeTac and start each log's message with the correct Jira issue key.  
1. `npm run start`
2. From Playwright's console, run `open timetac report`.  
   3. Retry on error, check env configuration in between.  
   4. Sometimes TimeTac's internal IDs or even page flows might change. Adapt the scripts accordingly!  
4. Check the output ./report.md for correctness. Never trust bots!  
5. From Playwright's console, run `fill jira`.  
   6. This already accounts for a few known Jira quirks, but I guess each installation might have its own.  
   8. If the script fails, check Jira reports for submitted work log   
   7. Please PR any work-arounds!  

## Expected & known issues
* There might be different authentication workflows for different Jira deployments. Please PR any work-around implementations.  
* Different Jira languages might "behave" differently (i.e. use different IDs or UI controls). Please PR internationalization.  
