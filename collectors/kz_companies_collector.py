"""Kazakhstan B2B Company & Client Database Collector.
Extracts structured company cards (Name, Site, Phone, WhatsApp, Email, City, Niche)
across 6 target industries in Kazakhstan (Almaty, Astana, Shymkent, etc.).
"""

import sys
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Target categories mapped to the 6 niches
KYP_CATEGORIES = [
    {
        "niche": "Медицинские центры и клиники",
        "category_url": "https://www.kazakhstanyp.com/category/Doctors_and_Clinics",
    },
    {
        "niche": "Юридические и бухгалтерские услуги",
        "category_url": "https://www.kazakhstanyp.com/category/Lawyers",
    },
    {
        "niche": "Недвижимость и застройщики",
        "category_url": "https://www.kazakhstanyp.com/category/Estate_agents",
    },
    {
        "niche": "Производство и строительство",
        "category_url": "https://www.kazakhstanyp.com/category/Construction_services",
    },
    {
        "niche": "Онлайн-ритейл и E-commerce",
        "category_url": "https://www.kazakhstanyp.com/category/Shopping_centres",
    },
]

CITYSITES_CATEGORIES = [
    {
        "niche": "Медицинские центры и клиники",
        "city": "Алматы",
        "url": "https://www.inalmaty.kz/catalog/4/medicina-zdorove",
    },
    {
        "niche": "Юридические и бухгалтерские услуги",
        "city": "Алматы",
        "url": "https://www.inalmaty.kz/catalog/2/biznes-uslugi-finansy",
    },
    {
        "niche": "Недвижимость и застройщики",
        "city": "Алматы",
        "url": "https://www.inalmaty.kz/catalog/11/nedvizimost",
    },
    {
        "niche": "IT-компании и Digital",
        "city": "Алматы",
        "url": "https://www.inalmaty.kz/catalog/1/komputery-orgtehnika-informacionnye-tehnologii",
    },
    {
        "niche": "Онлайн-ритейл и E-commerce",
        "city": "Алматы",
        "url": "https://www.inalmaty.kz/catalog/56/internet-magaziny",
    },
    {
        "niche": "Медицинские центры и клиники",
        "city": "Астана",
        "url": "https://www.inastana.kz/catalog/4/medicina-zdorove",
    },
    {
        "niche": "Юридические и бухгалтерские услуги",
        "city": "Астана",
        "url": "https://www.inastana.kz/catalog/2/biznes-uslugi-finansy",
    },
    {
        "niche": "Недвижимость и застройщики",
        "city": "Астана",
        "url": "https://www.inastana.kz/catalog/11/nedvizimost",
    },
    {
        "niche": "IT-компании и Digital",
        "city": "Астана",
        "url": "https://www.inastana.kz/catalog/1/komputery-orgtehnika-informacionnye-tehnologii",
    },
    {
        "niche": "Медицинские центры и клиники",
        "city": "Шымкент",
        "url": "https://www.inshymkent.kz/catalog/4/medicina-zdorove",
    },
]


def extract_kyp_company_detail(profile_url: str) -> Dict[str, str]:
    """Extracts direct contacts (site, mobile, phones, email) from company page."""
    details = {
        "website": "",
        "phone": "",
        "whatsapp": "",
        "email": "",
    }
    try:
        resp = requests.get(profile_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return details
        soup = BeautifulSoup(resp.text, "html.parser")

        phones = []
        for a in soup.find_all("a"):
            href = a.get("href", "")
            if href.startswith("tel:"):
                raw_phone = href.replace("tel:", "").strip()
                if raw_phone and raw_phone not in phones:
                    phones.append(raw_phone)
            elif "mailto:" in href:
                email = href.replace("mailto:", "").split("?")[0].strip()
                if email and not details["email"]:
                    details["email"] = email
            elif "/redir/" in href and "u=" in href:
                # The real company website
                parsed_u = href.split("u=", 1)[1]
                real_site = urllib.parse.unquote_plus(parsed_u).strip("/")
                if real_site and not real_site.startswith("http"):
                    real_site = f"https://{real_site}"
                if real_site and not details["website"]:
                    details["website"] = real_site

        # Detect WhatsApp from mobile numbers (+7 701, +7 702, +7 705, +7 707, +7 777, +7 708, etc.)
        for p in phones:
            clean_digits = re.sub(r"\D", "", p)
            if len(clean_digits) == 11 and (
                clean_digits.startswith("770")
                or clean_digits.startswith("777")
                or clean_digits.startswith("778")
                or clean_digits.startswith("771")
                or clean_digits.startswith("775")
                or clean_digits.startswith("776")
            ):
                details["whatsapp"] = f"+{clean_digits}"
                break

        if phones:
            details["phone"] = ", ".join(phones[:2])

    except Exception:
        pass

    return details


def scrape_kyp_category(cat_info: Dict[str, str], max_pages: int = 1) -> List[Dict[str, Any]]:
    """Scrapes company listings from KazakhstanYP."""
    leads = []
    base_url = cat_info["category_url"]
    niche = cat_info["niche"]

    for page in range(1, max_pages + 1):
        url = f"{base_url}/{page}" if page > 1 else base_url
        try:
            resp = requests.get(url, headers=HEADERS, timeout=12)
            if resp.status_code != 200:
                break
        except Exception:
            break

        soup = BeautifulSoup(resp.text, "html.parser")
        cards = soup.find_all("div", class_="company")
        if not cards:
            break

        for card in cards:
            title_link = card.find("a", href=lambda h: h and h.startswith("/company/"))
            if not title_link:
                continue

            name = title_link.text.strip()
            if not name:
                continue

            profile_url = f"https://www.kazakhstanyp.com{title_link['href']}"

            # Address & city
            addr_elem = card.find("div", class_="address")
            addr_text = addr_elem.text.strip() if addr_elem else ""

            city = "Казахстан"
            if "Almaty" in addr_text or "Алматы" in addr_text:
                city = "Алматы"
            elif "Astana" in addr_text or "Астана" in addr_text:
                city = "Астана"
            elif "Shymkent" in addr_text or "Шымкент" in addr_text:
                city = "Шымкент"

            # Phone from card
            phone_elem = card.find("div", class_="phone")
            phone = phone_elem.text.strip() if phone_elem else ""

            # Fetch detailed profile
            det = extract_kyp_company_detail(profile_url)
            final_phone = det["phone"] or phone
            whatsapp = det["whatsapp"]
            if not whatsapp and final_phone:
                digits = re.sub(r"\D", "", final_phone)
                if len(digits) == 11 and digits.startswith("77"):
                    whatsapp = f"+{digits}"

            lead = {
                "company": name,
                "niche": niche,
                "city": city,
                "phone": final_phone,
                "whatsapp": whatsapp,
                "email": det["email"],
                "website": det["website"],
                "address": addr_text,
                "source": "Справочник РК (KazakhstanYP)",
                "profile_url": profile_url,
            }
            leads.append(lead)

    return leads


def scrape_citysites_category(cat_info: Dict[str, str]) -> List[Dict[str, Any]]:
    """Scrapes CitySites catalog (inalmaty / inastana / inshymkent)."""
    leads = []
    url = cat_info["url"]
    niche = cat_info["niche"]
    city = cat_info["city"]

    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return []
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.find_all("div", class_="company-card-wrapper")

    for c in cards:
        name_link = c.find("a", href=lambda h: h and "/catalog/index/" in h)
        if not name_link:
            continue

        raw_name = name_link.text.strip()
        if not raw_name:
            continue

        profile_url = name_link.get("href", "")

        # Extract phone from text
        text_content = c.text
        phone_match = re.search(r"(\+?7\s*\(?\d{3}\)?\s*[\d\-\s]{6,10})", text_content)
        phone = phone_match.group(1).strip() if phone_match else ""

        # Extract address
        addr_match = re.search(
            r"(мкр\.[^\n\r]+|ул\.[^\n\r]+|пр\.[^\n\r]+|[А-Яа-я\s\d,]{8,40}\d+)", text_content
        )
        address = addr_match.group(1).strip() if addr_match else ""

        # Check for WhatsApp
        whatsapp = ""
        if phone:
            digits = re.sub(r"\D", "", phone)
            if len(digits) == 11 and (
                digits.startswith("770")
                or digits.startswith("777")
                or digits.startswith("778")
                or digits.startswith("771")
                or digits.startswith("775")
                or digits.startswith("776")
            ):
                whatsapp = f"+{digits}"

        lead = {
            "company": raw_name,
            "niche": niche,
            "city": city,
            "phone": phone,
            "whatsapp": whatsapp,
            "email": "",
            "website": "",
            "address": address,
            "source": f"Городской каталог ({city})",
            "profile_url": profile_url,
        }
        leads.append(lead)

    return leads


def collect_kz_database() -> List[Dict[str, Any]]:
    """Runs parallel collection across Kazakhstan business directories."""
    all_leads = []
    seen_keys = set()

    print("[*] Сбор базы предприятий Казахстана по 6 нишам...")

    tasks = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        for cat in KYP_CATEGORIES:
            tasks.append(executor.submit(scrape_kyp_category, cat, 1))
        for cat in CITYSITES_CATEGORIES:
            tasks.append(executor.submit(scrape_citysites_category, cat))

        for future in as_completed(tasks):
            try:
                results = future.result()
                for item in results:
                    norm_key = re.sub(r"[\W_]+", "", item["company"][:18].lower())
                    if norm_key and norm_key not in seen_keys:
                        seen_keys.add(norm_key)
                        all_leads.append(item)
            except Exception:
                pass

    print(f"[✔] Всего собрано уникальных компаний: {len(all_leads)}")
    return all_leads
