"""Telegram public channel scraper for B2B tech vacancies and leads.
Extracts company names, roles, pain triggers, and direct @telegram contacts.
"""

import re
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any


def scrape_telegram_channel(channel_name: str, limit: int = 25) -> List[Dict[str, Any]]:
    """Scrapes recent vacancy posts from a public Telegram channel via t.me/s/

    Args:
        channel_name: Name of the channel (without @).
        limit: Max number of posts to parse.
    """
    url = f"https://t.me/s/{channel_name}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
    }

    try:
        response = requests.get(url, headers=headers, timeout=12)
        if response.status_code != 200:
            return []
    except Exception as e:
        print(f"[-] Ошибка подключения к Telegram каналу @{channel_name}: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    messages = soup.find_all("div", class_="tgme_widget_message")
    leads = []

    for msg in messages[-limit:]:
        text_elem = msg.find("div", class_="tgme_widget_message_text")
        if not text_elem:
            continue

        raw_text = text_elem.get_text(separator="\n").strip()
        if len(raw_text) < 60:
            continue

        # Extract direct telegram contacts (@username)
        tg_handles = re.findall(r"(?<!\w)@([a-zA-Z0-9_]{4,32})", raw_text)
        # Filter out common channel handles or generic mentions
        filtered_handles = [
            h
            for h in tg_handles
            if h.lower()
            not in [channel_name.lower(), "bot", "channel", "admin", "tgme"]
        ]
        contact = f"@{filtered_handles[0]}" if filtered_handles else ""

        # Extract post link
        post_link_elem = msg.find("a", class_="tgme_widget_message_date")
        post_url = post_link_elem["href"] if post_link_elem else f"https://t.me/{channel_name}"

        # Detect job title and company from text
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        first_line = lines[0] if lines else "Вакансия"
        
        # Heuristic for title & company
        title = first_line[:100]
        company = "Компания из объявления"
        for line in lines[:5]:
            low = line.lower()
            if "компания:" in low or "company:" in low or "проект:" in low:
                company = line.split(":", 1)[1].strip()
                break
            elif "—" in line or "-" in line:
                parts = line.split("—") if "—" in line else line.split("-")
                if len(parts) >= 2 and len(parts[0].strip()) < 40:
                    company = parts[0].strip()
                    title = parts[1].strip()
                    break

        # Check for salary
        salary_match = re.search(
            r"(\d+[\s\d]*\s*(?:руб|rub|kzt|тнг|\$|usd|eur|€|к|k))",
            raw_text,
            re.IGNORECASE,
        )
        salary = salary_match.group(1).strip() if salary_match else "По договоренности"

        lead = {
            "source": f"Telegram (@{channel_name})",
            "title": title,
            "company": company,
            "salary": salary,
            "contact": contact,
            "url": post_url,
            "snippet": raw_text[:500],
            "full_text": raw_text,
        }
        leads.append(lead)

    return leads


def collect_from_telegram_channels(channels: List[str]) -> List[Dict[str, Any]]:
    """Scrapes multiple Telegram channels and aggregates potential leads."""
    all_leads = []
    for ch in channels:
        print(f"[*] Сбор лидов из Telegram @{ch}...")
        leads = scrape_telegram_channel(ch)
        all_leads.extend(leads)
        print(f"    -> Найдено: {len(leads)}")
    return all_leads
