"""Interactive Viewer & Outreach CRM Dashboard for RAG Lead Hunter.

Allows browsing, filtering, searching, and managing B2B clients and RAG leads
via a web application or terminal (CLI).

Usage:
  python viewer.py                 # Launches the web dashboard in browser
  python viewer.py --port 8080     # Specify port
  python viewer.py --no-browser    # Do not auto-open browser
  python viewer.py --cli           # Browse base directly in terminal (Rich)
  python viewer.py --cli --min-score 8
"""

import sys
import os
import json
import socket
import argparse
import webbrowser
import threading
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import pandas as pd
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

console = Console()

BASE_DIR = Path(__file__).parent.resolve()
OUTPUT_DIR = BASE_DIR / "output"
WEB_DIR = BASE_DIR / "web"
CRM_FILE = OUTPUT_DIR / "crm_status.json"

app = FastAPI(title="RAG Lead Hunter Explorer")


def find_available_port(start_port: int = 8080, max_attempts: int = 50) -> int:
    """Finds an unused TCP port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start_port


def load_crm_status() -> Dict[str, Any]:
    """Loads CRM status and notes from disk."""
    if CRM_FILE.exists():
        try:
            return json.loads(CRM_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            console.print(f"[yellow]Предупреждение: ошибка чтения crm_status.json: {e}[/yellow]")
    return {}


def save_crm_status(data: Dict[str, Any]):
    """Saves CRM status and notes to disk atomically."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    tmp_file = CRM_FILE.with_suffix(".tmp")
    tmp_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_file.replace(CRM_FILE)


def resolve_file(pattern: str, is_csv: bool = True) -> Optional[Path]:
    """Finds target file in output directory handling Windows encoding quirks."""
    if not OUTPUT_DIR.exists():
        return None

    # Check direct name first
    target = OUTPUT_DIR / pattern
    if target.exists():
        return target

    # Glob matching
    ext = ".csv" if is_csv else ".xlsx"
    for p in OUTPUT_DIR.glob(f"*{ext}"):
        if pattern == "leads_rag_target" and "leads_rag_target" in p.name:
            return p
        elif pattern == "kz_companies" and "leads" not in p.name:
            return p

    return None


def load_rag_leads() -> List[Dict[str, Any]]:
    """Loads and formats prioritized RAG leads."""
    csv_path = resolve_file("leads_rag_target", is_csv=True)
    if not csv_path or not csv_path.exists():
        return []

    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
    except Exception:
        try:
            df = pd.read_csv(csv_path, encoding="utf-8")
        except Exception:
            return []

    df = df.fillna("")
    leads = []
    crm = load_crm_status()

    for idx, row in df.iterrows():
        lead_id = f"rag_{idx + 1}"
        score = row.get("rag_score")
        try:
            score = int(score)
        except (ValueError, TypeError):
            score = 5

        item = {
            "id": lead_id,
            "rag_score": score,
            "company": str(row.get("company", "")).strip(),
            "title": str(row.get("title", "")).strip(),
            "category": str(row.get("category", "")).strip(),
            "source": str(row.get("source", "")).strip(),
            "contact": str(row.get("contact", "")).strip(),
            "url": str(row.get("url", "")).strip(),
            "salary": str(row.get("salary", "")).strip(),
            "tg_pitch": str(row.get("tg_pitch", "")).strip(),
            "email_pitch": str(row.get("email_pitch", "")).strip(),
            "status": crm.get(lead_id, {}).get("status", "new"),
            "notes": crm.get(lead_id, {}).get("notes", ""),
        }
        leads.append(item)

    return leads


def load_kz_companies() -> List[Dict[str, Any]]:
    """Loads and formats pure B2B client database for Kazakhstan."""
    csv_path = resolve_file("kz_companies", is_csv=True)
    if not csv_path or not csv_path.exists():
        return []

    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig")
    except Exception:
        try:
            df = pd.read_csv(csv_path, encoding="utf-8")
        except Exception:
            return []

    df = df.fillna("")
    companies = []

    for idx, row in df.iterrows():
        raw_wa = str(row.get("whatsapp", "")).strip()
        # Clean float .0 from excel exports
        if raw_wa.endswith(".0"):
            raw_wa = raw_wa[:-2]

        raw_phone = str(row.get("phone", "")).strip()
        # Clean multiline phones
        raw_phone = " ".join(raw_phone.split())

        raw_addr = str(row.get("address", "")).strip()
        raw_addr = " ".join(raw_addr.split())

        item = {
            "id": f"kz_{idx + 1}",
            "company": str(row.get("company", "")).strip(),
            "niche": str(row.get("niche", "")).strip(),
            "city": str(row.get("city", "Казахстан")).strip(),
            "phone": raw_phone,
            "whatsapp": raw_wa,
            "email": str(row.get("email", "")).strip(),
            "website": str(row.get("website", "")).strip(),
            "address": raw_addr,
            "source": str(row.get("source", "")).strip(),
        }
        companies.append(item)

    return companies


def load_hot_digest() -> List[Dict[str, Any]]:
    """Loads the hot leads digest markdown if available."""
    digest_path = OUTPUT_DIR / "hot_leads_digest.md"
    if not digest_path.exists():
        return []

    try:
        content = digest_path.read_text(encoding="utf-8")
    except Exception:
        return []

    # Simple section parser
    sections = content.split("---")
    parsed = []
    for s in sections:
        s = s.strip()
        if not s or "###" not in s:
            continue
        parsed.append({"raw": s})
    return parsed


# ==============================================================================
# FastAPI Routes
# ==============================================================================

# Mount static files and assets
if WEB_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")

if (BASE_DIR / "data").exists():
    app.mount("/data", StaticFiles(directory=str(BASE_DIR / "data")), name="data")

if OUTPUT_DIR.exists():
    app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = BASE_DIR / "index.html"
    if not index_file.exists():
        index_file = WEB_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return HTMLResponse(content=index_file.read_text(encoding="utf-8"))


@app.get("/style.css")
async def serve_css():
    css_file = BASE_DIR / "style.css"
    if not css_file.exists():
        css_file = WEB_DIR / "style.css"
    return FileResponse(str(css_file), media_type="text/css")


@app.get("/app.js")
async def serve_js():
    js_file = BASE_DIR / "app.js"
    if not js_file.exists():
        js_file = WEB_DIR / "app.js"
    return FileResponse(str(js_file), media_type="application/javascript")


@app.get("/api/leads")
async def get_leads():
    return JSONResponse(content=load_rag_leads())


@app.get("/api/companies")
async def get_companies():
    return JSONResponse(content=load_kz_companies())


@app.get("/api/digest")
async def get_digest():
    return JSONResponse(content=load_hot_digest())


@app.get("/api/crm")
async def get_crm():
    return JSONResponse(content=load_crm_status())


@app.post("/api/crm/update")
async def update_crm(request: Request):
    payload = await request.json()
    lead_id = payload.get("lead_id")
    status = payload.get("status", "new")
    notes = payload.get("notes", "")

    if not lead_id:
        raise HTTPException(status_code=400, detail="Missing lead_id")

    crm = load_crm_status()
    crm[lead_id] = {
        "status": status,
        "notes": notes,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    save_crm_status(crm)
    return {"status": "ok", "lead_id": lead_id}


# File Download Endpoints
@app.get("/download/rag-excel")
async def download_rag_excel():
    f = resolve_file("leads_rag_target", is_csv=False)
    if not f or not f.exists():
        raise HTTPException(status_code=404, detail="Excel file not found")
    return FileResponse(
        path=str(f),
        filename="leads_rag_target.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/download/rag-csv")
async def download_rag_csv():
    f = resolve_file("leads_rag_target", is_csv=True)
    if not f or not f.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    return FileResponse(path=str(f), filename="leads_rag_target.csv", media_type="text/csv")


@app.get("/download/kz-excel")
async def download_kz_excel():
    f = resolve_file("kz_companies", is_csv=False)
    if not f or not f.exists():
        raise HTTPException(status_code=404, detail="Excel file not found")
    return FileResponse(
        path=str(f),
        filename="b2b_companies_kazakhstan.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.get("/download/kz-csv")
async def download_kz_csv():
    f = resolve_file("kz_companies", is_csv=True)
    if not f or not f.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    return FileResponse(path=str(f), filename="b2b_companies_kazakhstan.csv", media_type="text/csv")


# ==============================================================================
# CLI Viewer Mode (Rich)
# ==============================================================================

def run_cli_viewer(db: str = "rag", min_score: int = 8, search: str = "", limit: int = 15):
    """Displays formatted interactive tables right inside the terminal."""
    console.print(
        Panel.fit(
            "[bold cyan]🎯 RAG B2B Lead Hunter — Терминальный просмотрщик базы[/bold cyan]\n"
            f"[dim]База данных: [bold white]{db.upper()}[/bold white] | Мин. Score: [bold yellow]{min_score}[/bold yellow][/dim]",
            border_style="cyan",
        )
    )

    if db == "rag":
        leads = load_rag_leads()
        if min_score:
            leads = [l for l in leads if l["rag_score"] >= min_score]
        if search:
            q = search.lower()
            leads = [
                l
                for l in leads
                if q in l["company"].lower() or q in l["title"].lower() or q in l["category"].lower()
            ]

        leads = sorted(leads, key=lambda x: x["rag_score"], reverse=True)

        table = Table(
            title=f"🔥 Отобрано {len(leads)} целевых лидов (показано первые {min(limit, len(leads))})",
            border_style="cyan",
        )
        table.add_column("№", justify="center", style="dim", width=4)
        table.add_column("⭐ Score", justify="center", style="bold green", width=9)
        table.add_column("Компания", style="bold white", width=22)
        table.add_column("Вакансия / Боль", width=34)
        table.add_column("Контакт", style="cyan", width=20)
        table.add_column("Источник", style="dim", width=16)

        for i, l in enumerate(leads[:limit], start=1):
            score_style = "bold gold1" if l["rag_score"] == 10 else "bold green"
            table.add_row(
                str(i),
                f"[{score_style}]⭐ {l['rag_score']}/10[/{score_style}]",
                l["company"][:22],
                f"[white]{l['title'][:32]}[/white]\n[dim]{l['category'][:32]}[/dim]",
                l["contact"][:20] if l["contact"] else "[dim]В вакансии[/dim]",
                l["source"][:16],
            )
        console.print(table)

    else:
        companies = load_kz_companies()
        if search:
            q = search.lower()
            companies = [
                c
                for c in companies
                if q in c["company"].lower() or q in c["niche"].lower() or q in c["city"].lower()
            ]

        table = Table(
            title=f"🏢 База B2B компаний Казахстана ({len(companies)} компаний, показано {min(limit, len(companies))})",
            border_style="green",
        )
        table.add_column("№", justify="center", style="dim", width=4)
        table.add_column("Компания", style="bold white", width=26)
        table.add_column("Ниша / Сфера", style="cyan", width=26)
        table.add_column("Город", style="yellow", width=12)
        table.add_column("Телефон / WA", style="green", width=22)
        table.add_column("Сайт", style="dim", width=18)

        for i, c in enumerate(companies[:limit], start=1):
            wa = f"WA: {c['whatsapp']}" if c["whatsapp"] else c["phone"]
            table.add_row(
                str(i),
                c["company"][:26],
                c["niche"][:26],
                c["city"][:12],
                wa[:22],
                c["website"][:18] if c["website"] else "-",
            )
        console.print(table)

    console.print("\n[dim]💡 Для запуска полноценного веб-интерфейса выполните:[/dim] [bold cyan]python viewer.py[/bold cyan]")


# ==============================================================================
# Main Runner
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(description="RAG Lead Hunter Viewer")
    parser.add_argument("--cli", action="store_true", help="View in terminal mode (Rich table)")
    parser.add_argument("--db", choices=["rag", "kz"], default="rag", help="Database to view in CLI")
    parser.add_argument("--min-score", type=int, default=8, help="Min score filter for CLI (1-10)")
    parser.add_argument("--search", type=str, default="", help="Search query for CLI")
    parser.add_argument("--limit", type=int, default=15, help="Number of rows for CLI")
    parser.add_argument("--port", type=int, default=None, help="Port for web dashboard")
    parser.add_argument("--no-browser", action="store_true", help="Do not auto-open browser")

    args = parser.parse_args()

    if args.cli:
        run_cli_viewer(db=args.db, min_score=args.min_score, search=args.search, limit=args.limit)
        return

    # Web Dashboard Mode
    port = args.port or find_available_port(8080)
    url = f"http://localhost:{port}"

    rag_count = len(load_rag_leads())
    kz_count = len(load_kz_companies())

    console.print(
        Panel.fit(
            f"[bold cyan]🎯 RAG B2B LEAD HUNTER & CRM EXPLORER[/bold cyan]\n\n"
            f"📊 [bold green]Загружено данных:[/bold green]\n"
            f"  • RAG Лиды (Спрос на AI/Базы знаний): [bold white]{rag_count}[/bold white]\n"
            f"  • База компаний Казахстана (6 ниш):   [bold white]{kz_count}[/bold white]\n\n"
            f"🌐 [bold yellow]Интерактивный дашборд доступен по адресу:[/bold yellow]\n"
            f"   [link={url}][bold underline cyan]{url}[/bold underline cyan][/link]\n\n"
            f"[dim]Нажмите Ctrl+C для завершения работы сервера.[/dim]",
            border_style="cyan",
            title="⚡ Сервер запущен",
        )
    )

    if not args.no_browser:
        def open_browser():
            time.sleep(0.8)
            webbrowser.open(url)

        threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
