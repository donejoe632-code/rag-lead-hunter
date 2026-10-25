"""Main Entrypoint for RAG B2B Lead Hunter.
Runs automated sourcing, AI scoring, and exports prioritized client databases.
"""

import sys
import argparse
from typing import List, Dict, Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

import config
from collectors.telegram_collector import collect_from_telegram_channels
from collectors.habr_collector import collect_from_habr
from collectors.hh_collector import collect_from_hh
from analyzer import analyze_lead
from exporter import export_to_excel, export_to_csv, export_markdown_digest

console = Console()


def run_pipeline(sources: List[str] = None, area: str = "kz"):
    """Runs the lead sourcing and enrichment pipeline."""
    if sources is None:
        sources = ["telegram", "habr"]

    console.print(
        Panel.fit(
            "[bold cyan]🎯 RAG B2B LEAD HUNTER[/bold cyan]\n"
            "[dim]Автоматизированный поиск B2B-клиентов для внедрения RAG-систем и автоматизаций[/dim]",
            border_style="cyan",
        )
    )

    raw_leads: List[Dict[str, Any]] = []

    # 1. Telegram channels
    if "telegram" in sources:
        console.print("\n[bold yellow]📡 1/3 Сканирование Telegram-каналов с прямыми контактами...[/bold yellow]")
        tg_leads = collect_from_telegram_channels(config.TELEGRAM_CHANNELS)
        raw_leads.extend(tg_leads)

    # 2. Habr Career
    if "habr" in sources:
        console.print("\n[bold yellow]💼 2/3 Сканирование Хабр Карьеры по болям саппорта и баз знаний...[/bold yellow]")
        habr_queries = [
            "поддержка",
            "база знаний",
            "Notion",
            "Confluence",
            "онбординг",
        ]
        habr_leads = collect_from_habr(habr_queries)
        raw_leads.extend(habr_leads)

    # 3. HeadHunter (Playwright)
    if "hh" in sources:
        console.print("\n[bold yellow]🌐 3/3 Сканирование HeadHunter (HH.kz)...[/bold yellow]")
        area_map = {
            "kz": 40,
            "almaty": 160,
            "astana": 159,
            "cis": 113,
        }
        area_id = area_map.get(area.lower(), 40)
        hh_queries = ["оператор поддержки", "база знаний"]
        hh_leads = collect_from_hh(hh_queries, area_id=area_id)
        raw_leads.extend(hh_leads)

    console.print(f"\n[green]✔ Всего собрано вакансий и постов:[/green] [bold]{len(raw_leads)}[/bold]")

    if not raw_leads:
        console.print("[red]Не найдено лидов. Проверьте подключение к сети.[/red]")
        return

    # 4. Analyze & Score
    console.print("[bold cyan]⚙ Анализ болей, скоринг (1-10) и генерация персональных офферов...[/bold cyan]")
    enriched_leads = []
    for lead in raw_leads:
        analyzed = analyze_lead(lead)
        # Filter out very low irrelevant leads (score < 4)
        if analyzed["rag_score"] >= 4:
            enriched_leads.append(analyzed)

    console.print(f"[green]✔ Прошли скоринг и квалификацию:[/green] [bold]{len(enriched_leads)} целевых компаний[/bold]")

    # 5. Export
    console.print("[bold cyan]💾 Экспорт базы клиентов в Excel, CSV и Markdown...[/bold cyan]")
    export_to_excel(enriched_leads, config.EXCEL_OUTPUT)
    export_to_csv(enriched_leads, config.CSV_OUTPUT)
    export_markdown_digest(enriched_leads, config.MARKDOWN_SUMMARY, top_n=10)

    # 6. Display Top Results Table
    sorted_leads = sorted(enriched_leads, key=lambda x: x["rag_score"], reverse=True)
    table = Table(title="🔥 ТОП-8 Горячих Лидов для Внедрения RAG", border_style="cyan")
    table.add_column("⭐ Score", justify="center", style="bold green", width=8)
    table.add_column("Компания", style="bold white", width=22)
    table.add_column("Позиция / Боль", width=30)
    table.add_column("Контакт", style="cyan", width=22)
    table.add_column("Источник", style="dim", width=18)

    for l in sorted_leads[:8]:
        contact = l.get("contact", "")
        contact_display = contact[:20] if contact else "В вакансии"
        table.add_row(
            str(l.get("rag_score", 5)),
            l.get("company", "Компания")[:20],
            f"{l.get('title', '')[:20]}\n[dim]{l.get('category', '')}[/dim]",
            contact_display,
            l.get("source", "")[:18],
        )

    console.print(table)

    console.print("\n[bold green]Готово![/bold green] База клиентов сформирована:")
    console.print(f"📊 [bold]Excel:[/bold] {config.EXCEL_OUTPUT}")
    console.print(f"📋 [bold]CSV:[/bold] {config.CSV_OUTPUT}")
    console.print(f"📝 [bold]Дайджест сообщений:[/bold] {config.MARKDOWN_SUMMARY}")
    console.print(f"\n🖥  [bold cyan]Интерактивный просмотр базы в браузере:[/bold cyan] [bold white]python viewer.py[/bold white] или [bold white]python main.py --view[/bold white]")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAG Lead Hunter CLI")
    parser.add_argument(
        "--mode",
        choices=["quick", "all", "telegram", "habr", "hh", "view", "view-cli"],
        default="quick",
        help="quick (TG + Habr), all (TG + Habr + HH), telegram, habr, hh, view (Web Explorer), view-cli (Terminal)",
    )
    parser.add_argument(
        "--area",
        choices=["kz", "almaty", "astana", "cis"],
        default="kz",
        help="Region for HH searches",
    )
    parser.add_argument(
        "--view",
        action="store_true",
        help="Launch the interactive web viewer dashboard",
    )
    parser.add_argument(
        "--view-cli",
        action="store_true",
        help="View leads table in the terminal",
    )
    args = parser.parse_args()

    # Viewer shortcuts
    if args.view or args.mode == "view":
        from viewer import main as run_viewer
        run_viewer()
        sys.exit(0)

    if args.view_cli or args.mode == "view-cli":
        from viewer import run_cli_viewer
        run_cli_viewer()
        sys.exit(0)

    mode_sources = {
        "quick": ["telegram", "habr"],
        "all": ["telegram", "habr", "hh"],
        "telegram": ["telegram"],
        "habr": ["habr"],
        "hh": ["hh"],
    }

    selected_sources = mode_sources.get(args.mode, ["telegram", "habr"])
    run_pipeline(sources=selected_sources, area=args.area)
