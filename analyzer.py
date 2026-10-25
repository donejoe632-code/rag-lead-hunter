"""Lead Analyzer and Outreach Pitch Generator for RAG & AI Automation Solutions.
Scores leads based on pain indicators and produces ready-to-send personalized messages.
"""

import re
from typing import Dict, Any


def detect_pain_category(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Detects the primary business pain and RAG opportunity from vacancy text."""
    text = (lead.get("title", "") + " " + lead.get("full_text", "")).lower()

    scores = {
        "support_overload": 0,
        "knowledge_chaos": 0,
        "onboarding_slow": 0,
        "legal_review": 0,
        "sales_copilot": 0,
    }

    # 1. Support Overload signals
    if any(
        k in text
        for k in [
            "поддержк",
            "support",
            "обращени",
            "тикетов",
            "первая линия",
            "оператор",
            "helpdesk",
            "клиентск",
        ]
    ):
        scores["support_overload"] += 4
    if any(k in text for k in ["регламент", "шаблон", "faq", "скрипт"]):
        scores["support_overload"] += 2

    # 2. Knowledge Base & Docs chaos signals
    if any(
        k in text
        for k in [
            "база знаний",
            "notion",
            "confluence",
            "технический писатель",
            "документаци",
            "knowledge",
        ]
    ):
        scores["knowledge_chaos"] += 5

    # 3. Onboarding & Training signals
    if any(
        k in text
        for k in [
            "онбординг",
            "onboarding",
            "обучение",
            "методолог",
            "адаптаци",
            "стажер",
            "l&d",
        ]
    ):
        scores["onboarding_slow"] += 4

    # 4. Legal / Contracts
    if any(
        k in text
        for k in [
            "договор",
            "юрист",
            "согласован",
            "правовой",
            "нормативн",
            "делопроизводств",
        ]
    ):
        scores["legal_review"] += 4

    # 5. Sales & Real estate
    if any(
        k in text
        for k in [
            "недвижимост",
            "отдел продаж",
            "ипотек",
            "жк",
            "риелтор",
            "прайс",
            "планировк",
        ]
    ):
        scores["sales_copilot"] += 4

    # Determine dominant pain
    top_pain = max(scores, key=scores.get)
    pain_strength = scores[top_pain]

    # Calculate overall RAG Score (1 - 10)
    base_score = 4
    if pain_strength >= 4:
        base_score += 3
    if lead.get("contact") and lead.get("contact").startswith("@"):
        base_score += 2  # direct Telegram contact is high value
    if any(k in text for k in ["казахстан", "алматы", "астана", "kz", "удален"]):
        base_score += 1

    final_score = min(10, max(1, base_score))

    labels = {
        "support_overload": "Перегрузка техподдержки и саппорта",
        "knowledge_chaos": "Хаос в документах / Confluence / Notion",
        "onboarding_slow": "Долгий онбординг и отвлечение сеньоров",
        "legal_review": "Рутинный поиск по договорам и регламентам",
        "sales_copilot": "Сложные прайсы и регламенты в продажах",
    }

    return {
        "category_id": top_pain,
        "category_label": labels.get(top_pain, "Автоматизация регламентов"),
        "score": final_score,
    }


def generate_pitches(lead: Dict[str, Any], pain_info: Dict[str, Any]) -> Dict[str, str]:
    """Generates 3 ready-to-use outreach message variants based on the detected pain."""
    title = lead.get("title", "вашу вакансию")
    company = lead.get("company", "вашей компании")
    contact = lead.get("contact", "")
    category = pain_info["category_id"]

    # --- 1. Telegram Message (conversational, value-first) ---
    if category == "support_overload":
        tg_pitch = (
            f"Здравствуйте! Увидел, что вы расширяете команду саппорта ({title}). "
            f"Обычно с ростом обращений операторы либо долго ищут ответы в регламентах, "
            f"либо ошибаются на сложных вопросах.\n\n"
            f"Мы внедряем RAG-ассистентов для операторов и клиентов на Python: бот мгновенно "
            f"находит ответ строго по вашим внутренним регламентам/базе знаний без галлюцинаций "
            f"и со ссылкой на пункт документа. Это разгружает первую линию на 30–40%.\n\n"
            f"Актуальна ли сейчас задача оптимизации нагрузки на саппорт? "
            f"Можем показать короткое 3-минутное демо на ваших тестовых файлах."
        )
    elif category == "knowledge_chaos" or category == "onboarding_slow":
        tg_pitch = (
            f"Приветствую! Заметил вакансию {title} в {company}. "
            f"Частая боль при росте команды — база знаний в Notion/Confluence разрастается, "
            f"а новичкам сложно в ней ориентироваться, из-за чего тимлиды тратят часы на однотипные вопросы.\n\n"
            f"Мы подключаем внутренний AI-поиск к вашим документам: сотрудник пишет вопрос в Telegram/Slack "
            f"обычным языком, а модель выдает точный ответ по регламентам компании с прямой ссылкой на нужную страницу.\n\n"
            f"Было бы интересно протестировать, как это упростит онбординг у вас?"
        )
    elif category == "legal_review":
        tg_pitch = (
            f"Здравствуйте! Обратил внимание на вакансию {title}. "
            f"Знаем, сколько времени у юристов и делопроизводителей уходит на ручной поиск "
            f"нужных формулировок и прецедентов по сотням договоров и актов.\n\n"
            f"Мы делаем умный RAG-поиск по внутренним базам документов: система за секунды находит "
            f"нужный пункт, сверяет редакции и цитирует источник без риска утечки во внешние сервисы.\n\n"
            f"Подскажите, открыты ли к автоматизации работы с документами? Готовы прислать пример внедрения."
        )
    else:  # Sales copilot / general
        tg_pitch = (
            f"Здравствуйте! Увидел информацию о расширении {company} ({title}). "
            f"Когда номенклатура и условия постоянно меняются, менеджерам сложно держать все параметры в голове "
            f"во время разговора с клиентом.\n\n"
            f"Мы делаем ИИ-суфлеров по регламентам и прайсам: менеджер за секунду получает точные условия "
            f"прямо в чате без необходимости рыться в таблицах.\n\n"
            f"Если вопрос актуален, с удовольствием покажем короткое демо."
        )

    # --- 2. Email Pitch (structured, ROI-focused) ---
    email_pitch = (
        f"Тема: Оптимизация работы с регламентами и базой знаний в {company}\n\n"
        f"Добрый день!\n\n"
        f"Обратил внимание на открытие позиции {title}. "
        f"Наша команда специализируется на создании безопасных RAG-систем (поисково-дополненная генерация) "
        f"для бизнеса в Казахстане и СНГ.\n\n"
        f"Какую проблему мы решаем:\n"
        f"— Упорядочиваем регламенты, инструкции и документацию в единого ИИ-ассистента;\n"
        f"— Модель отвечает строго по документам компании заказчика, исключая галлюцинации и ссылки на сторонние сайты;\n"
        f"— Сокращаем время поиска информации сотрудниками в 3–5 раз и ускоряем онбординг;\n"
        f"— Данные остаются внутри контура заказчика с разграничением прав доступа.\n\n"
        f"Готовы провести 15-минутный разбор ваших процессов и показать работающий прототип.\n"
        f"Удобно ли пообщаться на этой неделе?\n\n"
        f"С уважением,\nКоманда AI-автоматизации"
    )

    # --- 3. Short Connection Note (<300 chars, ideal for LinkedIn / quick ping) ---
    short_pitch = (
        f"Здравствуйте! Заметил открытую позицию {title[:30]}. Разрабатываем внутренние RAG-системы "
        f"по базам знаний (Notion/Confluence/регламенты) — отвечают строго по документам без галлюцинаций. "
        f"Буду рад обсудить внедрение!"
    )

    return {
        "tg_pitch": tg_pitch,
        "email_pitch": email_pitch,
        "short_pitch": short_pitch,
    }


def analyze_lead(lead: Dict[str, Any]) -> Dict[str, Any]:
    """Runs full analysis on a lead: categorizes, scores, and produces personalized outreach."""
    pain_info = detect_pain_category(lead)
    pitches = generate_pitches(lead, pain_info)

    enriched_lead = {**lead}
    enriched_lead["category"] = pain_info["category_label"]
    enriched_lead["rag_score"] = pain_info["score"]
    enriched_lead["tg_pitch"] = pitches["tg_pitch"]
    enriched_lead["email_pitch"] = pitches["email_pitch"]
    enriched_lead["short_pitch"] = pitches["short_pitch"]

    return enriched_lead
