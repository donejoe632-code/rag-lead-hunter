"""Habr Career Vacancies and Companies Collector.
Scrapes IT and digital companies hiring support, technical writers, knowledge managers.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from urllib.parse import quote


def scrape_habr_vacancies(query: str, max_pages: int = 2) -> List[Dict[str, Any]]:
    """Scrapes Habr Career for a given query."""
    base_url = "https://career.habr.com"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    leads = []
    for page in range(1, max_pages + 1):
        search_url = f"{base_url}/vacancies?q={quote(query)}&page={page}"
        try:
            resp = requests.get(search_url, headers=headers, timeout=12)
            if resp.status_code != 200:
                break
        except Exception as e:
            print(f"[-] Ошибка подключения к Хабр Карьере: {e}")
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.find_all("div", class_="vacancy-card")
        if not cards:
            break

        for card in cards:
            title_elem = card.find("div", class_="vacancy-card__title")
            if not title_elem:
                continue

            title_link = title_elem.find("a")
            title = title_link.text.strip() if title_link else title_elem.text.strip()
            vacancy_url = (
                f"{base_url}{title_link['href']}"
                if title_link and title_link.get("href")
                else ""
            )

            # Company
            company_link = card.find("a", href=lambda h: h and h.startswith("/companies/"))
            company_name = company_link.text.strip() if company_link else "IT Компания"
            company_url = (
                f"{base_url}{company_link['href']}"
                if company_link and company_link.get("href")
                else ""
            )

            # Salary
            salary_elem = card.find("div", class_="vacancy-card__salary")
            salary = salary_elem.text.strip() if salary_elem else "По договоренности"

            # Skills
            skills_elems = card.find_all(
                "a", href=lambda h: h and h.startswith("/vacancies/skills/")
            )
            skills = [s.text.strip() for s in skills_elems]

            # Meta info (Location, work format)
            meta_elem = card.find("div", class_="vacancy-card__meta")
            meta_text = meta_elem.text.strip() if meta_elem else ""

            lead = {
                "source": "Хабр Карьера",
                "title": title,
                "company": company_name,
                "salary": salary,
                "contact": company_url,  # link to company profile on Habr
                "url": vacancy_url,
                "snippet": f"Навыки: {', '.join(skills[:6])}. Формат: {meta_text}",
                "full_text": f"{title} в {company_name}. Зарплата: {salary}. Стек: {', '.join(skills)}. Инфо: {meta_text}",
            }
            leads.append(lead)

    return leads


def collect_from_habr(queries: List[str]) -> List[Dict[str, Any]]:
    """Collects leads across multiple queries from Habr Career."""
    all_leads = []
    seen_urls = set()

    for q in queries:
        print(f"[*] Сбор лидов с Хабр Карьеры по запросу: '{q}'...")
        leads = scrape_habr_vacancies(q, max_pages=1)
        for lead in leads:
            if lead["url"] not in seen_urls:
                seen_urls.add(lead["url"])
                all_leads.append(lead)
        print(f"    -> Новых уникальных: {len(leads)}")

    return all_leads
