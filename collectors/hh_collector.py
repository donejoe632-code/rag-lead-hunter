"""HeadHunter (HH.kz / HH.ru) Vacancy & Lead Collector via Playwright.
Bypasses anti-bot protection and extracts real target vacancies in Kazakhstan & CIS.
"""

import sys
import re
from typing import List, Dict, Any
from urllib.parse import quote
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def scrape_hh_vacancies(
    query: str,
    area_id: int = 40,  # 40 = Kazakhstan, 160 = Almaty, 159 = Astana, 113 = Russia
    limit: int = 15,
) -> List[Dict[str, Any]]:
    """Scrapes vacancies from HH using headless browser."""
    search_url = (
        f"https://hh.kz/search/vacancy?text={quote(query)}&area={area_id}&items_on_page=20"
    )

    leads = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                )
            )
            page.goto(search_url, timeout=35000, wait_until="domcontentloaded")
            page.wait_for_timeout(2000)

            # Get all vacancy cards or main container
            # We look for links with /vacancy/NNNNNNN
            vacancy_links = page.locator("a[href*='/vacancy/']").all()

            seen_ids = set()
            for link in vacancy_links:
                href = link.get_attribute("href") or ""
                id_match = re.search(r"/vacancy/(\d+)", href)
                if not id_match:
                    continue

                vac_id = id_match.group(1)
                if vac_id in seen_ids:
                    continue
                seen_ids.add(vac_id)

                title = link.text_content().strip()
                if not title or len(title) < 3:
                    continue

                clean_url = f"https://hh.kz/vacancy/{vac_id}"

                # Try to get surrounding card context
                parent_text = ""
                try:
                    # Ascend to the card container
                    card = link.locator(
                        "xpath=ancestor::div[contains(@class, 'vacancy-card') or contains(@class, 'serp-item')][1]"
                    )
                    if card.count() > 0:
                        parent_text = card.text_content().strip()
                except Exception:
                    parent_text = ""

                # Extract company name from parent text if possible
                company = "Работодатель с HH"
                if parent_text:
                    comp_elem = link.locator(
                        "xpath=ancestor::div[1]/following-sibling::div//a[contains(@href, '/employer/')]"
                    )
                    if comp_elem.count() > 0:
                        company = comp_elem.first.text_content().strip()

                lead = {
                    "source": "HeadHunter (HH.kz)",
                    "title": title,
                    "company": company,
                    "salary": "В вакансии",
                    "contact": clean_url,
                    "url": clean_url,
                    "snippet": parent_text[:400] if parent_text else f"Вакансия: {title}",
                    "full_text": parent_text if parent_text else title,
                }
                leads.append(lead)

                if len(leads) >= limit:
                    break

            browser.close()
    except Exception as e:
        print(f"[-] Ошибка Playwright HH: {e}")

    return leads


def collect_from_hh(queries: List[str], area_id: int = 40) -> List[Dict[str, Any]]:
    """Collects leads across multiple queries from HH."""
    all_leads = []
    seen = set()

    for q in queries:
        print(f"[*] Сбор с HeadHunter (HH.kz) по запросу: '{q}'...")
        leads = scrape_hh_vacancies(q, area_id=area_id, limit=10)
        for l in leads:
            if l["url"] not in seen:
                seen.add(l["url"])
                all_leads.append(l)
        print(f"    -> Найдено уникальных: {len(leads)}")

    return all_leads
