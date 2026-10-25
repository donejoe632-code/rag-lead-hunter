"""Configuration and settings for RAG B2B Lead Hunter.
"""

from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.resolve()
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

EXCEL_OUTPUT = OUTPUT_DIR / "leads_rag_target.xlsx"
CSV_OUTPUT = OUTPUT_DIR / "leads_rag_target.csv"
MARKDOWN_SUMMARY = OUTPUT_DIR / "hot_leads_digest.md"

# Niche search queries and pain trigger keywords
SEARCH_QUERIES = {
    "support": [
        "поддержка",
        "специалист службы поддержки",
        "оператор чата",
        "первая линия",
        "руководитель поддержки",
        "helpdesk",
    ],
    "knowledge_base": [
        "база знаний",
        "Notion",
        "Confluence",
        "технический писатель",
        "knowledge manager",
        "менеджер базы знаний",
    ],
    "onboarding_ld": [
        "онбординг",
        "специалист по обучению",
        "методолог",
        "L&D",
        "адаптация персонала",
    ],
    "legal_docs": [
        "договорная работа",
        "юрисконсульт",
        "делопроизводитель",
        "обработка документов",
    ],
    "tech_ai": [
        "AI automation",
        "RAG",
        "LLM",
        "интегратор",
        "n8n",
        "автоматизация процессов",
    ],
}

# Telegram public channels with vacancies & direct HR/founder contacts
TELEGRAM_CHANNELS = [
    "workayte",
    "rabota_v_ii",
    "GameDev_and_Tech_vacancy",
    "remoteit",
    "it_jobs_kz",
    "digital_jobs",
    "tproger_jobs",
]

# Scoring Weights
SCORE_CRITERIA = {
    "has_direct_telegram": 3.0,
    "has_knowledge_base_pain": 2.5,
    "has_support_overload_pain": 2.5,
    "has_onboarding_pain": 2.0,
    "has_salary": 1.0,
    "kazakhstan_location": 1.5,
}
