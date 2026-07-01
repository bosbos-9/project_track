from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from urllib.parse import urljoin
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import re
import time
import os
import requests


BASE_URL = "https://tenders.etimad.sa"
LIST_URL = "https://tenders.etimad.sa/Tender/AllTendersForVisitor"

SUPABASE_FUNCTION_URL = os.getenv(
    "SUPABASE_FUNCTION_URL",
)

SUPABASE_SECRET_KEY = os.getenv(
    "SUPABASE_SECRET_KEY",
    ""
)
BASE_DIR = Path(__file__).resolve().parent


WORKER_COUNT = 24



OUTPUT_DIR = BASE_DIR / "output"

SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"

FAILED_DIR = OUTPUT_DIR / "failed"

OUTPUT_DIR.mkdir(exist_ok=True)
SCREENSHOT_DIR.mkdir(exist_ok=True)
FAILED_DIR.mkdir(exist_ok=True)


# =========================
# Helpers
# =========================

def clean_text(value):
    if not value:
        return None

    value = str(value)
    value = value.replace("\xa0", " ")
    value = value.replace("﷼", "SAR")
    value = re.sub(r"\s+", " ", value)
    return value.strip()

def remove_activity_time(value):
    if not value:
        return value

    value = re.sub(
        r"\s+\d+\s+يوم\s+\d+\s+ساعة.*$",
        "",
        value
    )

    return value.strip()


def safe_filename(value):
    value = str(value)
    value = re.sub(r"[^\w\-]+", "_", value)
    return value[:80]


def safe_goto(page, url, timeout=60000):
    """
    Etimad keeps background requests running, so do not use networkidle.
    Keep a short fixed wait because details/tabs render after domcontentloaded.
    """
    page.goto(url, wait_until="domcontentloaded", timeout=timeout)
    page.wait_for_timeout(3000)


def block_unnecessary_requests(route):
    """
    Speed boost: block images, fonts, media, and analytics.
    """
    resource_type = route.request.resource_type
    url = route.request.url.lower()

    if resource_type in ["image", "media", "font"]:
        return route.abort()

    blocked_keywords = [
        "google-analytics",
        "googletagmanager",
        "youtube",
        "twitter",
        "linkedin",
        "giphy",
        "adrum",
        "muneer",
    ]

    if any(keyword in url for keyword in blocked_keywords):
        return route.abort()

    return route.continue_()


def save_debug_files(page, reference_number, reason="failed"):
    safe_ref = safe_filename(reference_number)

    screenshot_path = FAILED_DIR / f"{reason}_{safe_ref}.png"
    html_path = FAILED_DIR / f"{reason}_{safe_ref}.html"

    try:
        page.screenshot(path=str(screenshot_path), full_page=True)
    except Exception:
        pass

    try:
        html_path.write_text(page.content(), encoding="utf-8")
    except Exception:
        pass

    print(f"Saved debug files for {reference_number}")


def wait_for_details_page(page, reference_number):
    """
    Do not wait for table. Wait for text markers that exist in details page.
    """
    possible_markers = [
        "اسم المنافسة",
        "رقم المنافسة",
        "الرقم المرجعي",
        "تفاصيل المنافسة",
    ]

    for marker in possible_markers:
        try:
            page.get_by_text(marker).first.wait_for(timeout=10000)
            return True
        except Exception:
            continue

    save_debug_files(page, reference_number, "details_not_loaded")
    return False


def extract_value_after_label_from_text(text, label):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    for i, line in enumerate(lines):
        if clean_text(line) == label and i + 1 < len(lines):
            return clean_text(lines[i + 1])

    return None


def extract_between(text, start_label, end_labels=None):
    if not text:
        return None

    end_labels = end_labels or []
    normalized = clean_text(text) or ""

    start_idx = normalized.find(start_label)

    if start_idx == -1:
        return None

    value = normalized[start_idx + len(start_label):].strip()

    end_positions = []
    for label in end_labels:
        pos = value.find(label)
        if pos != -1:
            end_positions.append(pos)

    if end_positions:
        value = value[:min(end_positions)].strip()

    return value or None


def chunk_list(items, chunk_count):
    chunks = [[] for _ in range(chunk_count)]

    for index, item in enumerate(items):
        chunks[index % chunk_count].append(item)

    return chunks


# =========================
# Supabase send
# =========================

def build_unfiltered_payload(result):
    clean_details = result.get("clean_details") or {}

    return {
        "reference_number": result.get("reference_number"),
        "title": result.get("title"),
        "details_url": result.get("details_url"),
        "success": result.get("success"),

        **clean_details,

        "error": result.get("error"),
        "raw_json": result,
    }


def unfiltered_send(result):
    """
    Sends one scraped opportunity to Supabase Edge Function.
    """
    opportunity = build_unfiltered_payload(result)

    if not opportunity.get("reference_number"):
        print("Skipped send: missing reference_number")
        return False

    if not SUPABASE_SECRET_KEY:
        print("Skipped Supabase send: SUPABASE_SECRET_KEY is missing")
        return False

    try:
        response = requests.post(
            SUPABASE_FUNCTION_URL,
            headers={
                "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
                "apikey": SUPABASE_SECRET_KEY,
                "Content-Type": "application/json",
            },
            json={
                "opportunity": opportunity
            },
            timeout=30,
        )

        if response.status_code >= 400:
            print("Supabase insert failed")
            print("Status:", response.status_code)
            print("Response:", response.text)
            return False

        print(f"Inserted/updated in Supabase: {opportunity['reference_number']}")
        return True

    except Exception as e:
        print(f"Failed sending to Supabase for {opportunity['reference_number']}: {e}")
        return False


# =========================
# Extraction functions
# =========================

def extract_page_text_key_values(page):
    text = page.locator("body").inner_text()
    data = {}

    labels = [
        "اسم المنافسة",
        "رقم المنافسة",
        "الرقم المرجعي",
        "الغرض من المنافسة",
        "قيمة وثائق المنافسة",
        "حالة المنافسة",
        "مدة العقد",
        "هل التأمين من متطلبات المنافسة",
        "نوع المنافسة",
        "الجهة الحكوميه",
        "الجهة الحكومية",
        "الوقت المتبقى",
        "الوقت المتبقي",
        "طريقة تقديم العروض",
        "مطلوب ضمان الإبتدائي",
        "مطلوب ضمان الإبتدائى",
        "عنوان الضمان الإبتدائي",
        "عنوان الضمان الإبتدائى",
        "الضمان النهائي",
        "آخر موعد لإستلام الإستفسارات",
        "آخر موعد لاستلام الإستفسارات",
        "آخر موعد لتقديم العروض",
        "تاريخ ووقت فتح العروض",
        "النشاط الأساسي",
        "النشاط الفرعي",
        "مكان التنفيذ",
        "داخل المملكة",
        "مناطق التنفيذ",
        "اسم المورد",
        "قيمة الترسية",
    ]

    for label in labels:
        value = extract_value_after_label_from_text(text, label)
        if value:
            data[label] = value

    return data


def extract_tables_as_key_value(page):
    data = {}

    rows = page.locator("tr")
    row_count = rows.count()

    for i in range(row_count):
        row = rows.nth(i)
        cells = row.locator("th, td")
        cell_count = cells.count()

        texts = []

        for j in range(cell_count):
            try:
                text = clean_text(cells.nth(j).inner_text())
                if text:
                    texts.append(text)
            except Exception:
                continue

        if len(texts) < 2:
            continue

        if len(texts) == 2:
            data[texts[0]] = texts[1]

        elif len(texts) == 4:
            data[texts[1]] = texts[0]
            data[texts[3]] = texts[2]

        else:
            for k in range(0, len(texts) - 1, 2):
                key = texts[k]
                value = texts[k + 1]
                if key and value:
                    data[key] = value

    return data


def extract_activity_details_section(page):
    """
    Extracts nested data from:
    <div id="ActivityDetials">
    """
    data = {}

    section = page.locator("#ActivityDetials")

    if section.count() == 0:
        return data

    items = section.locator("li.list-group-item")
    item_count = items.count()

    for i in range(item_count):
        item = items.nth(i)

        try:
            title = clean_text(item.locator(".etd-item-title").first.inner_text())
        except Exception:
            continue

        try:
            info = item.locator(".etd-item-info").first
        except Exception:
            continue

        main_value = None

        try:
            spans = info.locator(":scope > span")
            if spans.count() > 0:
                main_value = clean_text(spans.first.inner_text())
        except Exception:
            pass

        list_values = []

        try:
            li_values = info.locator("ol li, ul li")

            for j in range(li_values.count()):
                value = clean_text(li_values.nth(j).inner_text())

                if value:
                    list_values.append(value)
        except Exception:
            pass

        cleaned_list_values = []

        for value in list_values:
            if value not in cleaned_list_values:
                cleaned_list_values.append(value)

        if title == "مجال التصنيف":
            data["contractor_classification_field"] = main_value

        elif title == "مكان التنفيذ":
            data["execution_location"] = main_value

            if cleaned_list_values:
                data["execution_regions_raw"] = cleaned_list_values
                data["execution_region"] = cleaned_list_values[0]

                if len(cleaned_list_values) > 1:
                    data["execution_city"] = cleaned_list_values[-1]

        elif title == "التفاصيل":
            data["execution_details"] = main_value
        elif title == "نشاط المنافسة":
            cleaned_activities = []

            for value in cleaned_list_values:
                value = remove_activity_time(value)

                if not value:
                    continue

                if value not in cleaned_activities:
                    cleaned_activities.append(value)

            data["competition_activities"] = cleaned_activities

            if cleaned_activities:
                data["main_activity"] = cleaned_activities[0]

        elif title == "تشمل المنافسة على بنود توريد":
            data["includes_supply_items"] = main_value

        elif title == "أعمال  الإنشاء":
            data["construction_works"] = cleaned_list_values

        elif title == "أعمال الصيانة والتشغيل":
            data["maintenance_and_operation_works"] = cleaned_list_values

        else:
            data[title] = main_value or cleaned_list_values

    return data


def extract_all_visible_key_values(page):
    text_data = {}
    table_data = {}
    activity_data = {}

    try:
        text_data = extract_page_text_key_values(page)
    except Exception as e:
        print(f"Text extraction failed: {e}")

    try:
        table_data = extract_tables_as_key_value(page)
    except Exception as e:
        print(f"Table extraction failed: {e}")

    try:
        activity_data = extract_activity_details_section(page)
    except Exception as e:
        print(f"Activity details extraction failed: {e}")

    merged = {}
    merged.update(table_data)
    merged.update(text_data)
    merged.update(activity_data)

    return merged


def expand_all_show_more(page):
    selectors = [
        "text=عرض المزيد",
        "button:has-text('عرض المزيد')",
        "a:has-text('عرض المزيد')",
    ]

    for selector in selectors:
        try:
            buttons = page.locator(selector)
            count = buttons.count()

            for i in range(count):
                try:
                    btn = buttons.nth(i)

                    if btn.is_visible():
                        btn.click(force=True)
                        page.wait_for_timeout(500)
                except Exception:
                    pass
        except Exception:
            pass


def click_tab_if_exists(page, tab_name):
    """
    Robust tab click for Etimad.
    Handles tabs with icons, nested text, and active default tab.
    """

    # Basic tab is often already open
    if tab_name == "المعلومات الأساسية":
        try:
            if page.get_by_text("اسم المنافسة").count() > 0:
                return True
        except Exception:
            pass

    selectors = [
        f"a:has-text('{tab_name}')",
        f"button:has-text('{tab_name}')",
        f"li:has-text('{tab_name}')",
        f"div:has-text('{tab_name}')",
        f"text={tab_name}",
    ]

    for selector in selectors:
        try:
            locator = page.locator(selector)

            if locator.count() > 0:
                locator.first.click(force=True)
                page.wait_for_timeout(2500)
                return True

        except Exception:
            continue

    return False


def click_and_extract_tabs(page):
    all_tabs_data = {}

    tabs = [
        "المعلومات الأساسية",
        "العناوين والمواعيد المتعلقة بالمنافسة",
        "مجال التصنيف وموقع التنفيذ والتقديم",
        "إعلان نتائج الترسية",
        "آليات المحتوى المحلي",
    ]

    all_tabs_data["current_visible"] = extract_all_visible_key_values(page)

    for tab_name in tabs:
        try:
            clicked = click_tab_if_exists(page, tab_name)

            if clicked:
                print(f"Clicked tab: {tab_name}")
                expand_all_show_more(page)
                page.wait_for_timeout(500)
                all_tabs_data[tab_name] = extract_all_visible_key_values(page)
            else:
                print(f"Tab not found or not clickable: {tab_name}")

        except Exception as e:
            print(f"Could not extract tab {tab_name}: {e}")

    return all_tabs_data


def flatten_tabbed_data(tabbed_data):
    flat = {}

    for _, data in tabbed_data.items():
        if not isinstance(data, dict):
            continue

        for key, value in data.items():
            if key and value:
                flat[key] = value

    return flat


def normalize_details(tabbed_data, card_text=None):
    flat = flatten_tabbed_data(tabbed_data)

    main_activity = (
        flat.get("main_activity")
        or flat.get("النشاط الأساسي")
        or (
            ", ".join(flat.get("نشاط المنافسة"))
            if isinstance(flat.get("نشاط المنافسة"), list)
            else flat.get("نشاط المنافسة")
        )
    )

    if not main_activity:
        main_activity = extract_between(
            card_text,
            "النشاط الأساسي",
            [
                "النشاط الفرعي",
                "الرقم المرجعي",
                "آخر موعد",
                "قيمة وثائق المنافسة",
            ],
        )

    opening_date = (
        flat.get("تاريخ ووقت فتح العروض")
        or flat.get("opening_date")
    )

    if not opening_date:
        opening_date = extract_between(
            card_text,
            "تاريخ ووقت فتح العروض",
            ["قيمة وثائق المنافسة"],
        )

    purpose = flat.get("الغرض من المنافسة")

    if purpose and "عرض المزيد" in purpose:
        purpose = None

    return {
        "competition_name": flat.get("اسم المنافسة"),
        "tender_number": flat.get("رقم المنافسة"),
        "reference_number": flat.get("الرقم المرجعي"),
        "purpose": purpose,
        "document_price": flat.get("قيمة وثائق المنافسة"),
        "status": flat.get("حالة المنافسة"),
        "contract_duration": flat.get("مدة العقد"),
        "insurance_required": flat.get("هل التأمين من متطلبات المنافسة"),
        "competition_type": flat.get("نوع المنافسة"),
        "government_entity": flat.get("الجهة الحكوميه") or flat.get("الجهة الحكومية"),
        "time_remaining": flat.get("الوقت المتبقى") or flat.get("الوقت المتبقي"),
        "submission_method": flat.get("طريقة تقديم العروض"),
        "initial_guarantee": flat.get("مطلوب ضمان الإبتدائي") or flat.get("مطلوب ضمان الإبتدائى"),
        "initial_guarantee_address": flat.get("عنوان الضمان الإبتدائي") or flat.get("عنوان الضمان الإبتدائى"),
        "final_guarantee": flat.get("الضمان النهائي"),

        "inquiry_deadline": flat.get("آخر موعد لإستلام الإستفسارات") or flat.get("آخر موعد لاستلام الإستفسارات"),
        "offer_deadline": flat.get("آخر موعد لتقديم العروض"),
        "opening_date": opening_date,

        "contractor_classification_field": flat.get("contractor_classification_field"),
        "main_activity": main_activity,
        "competition_activities": flat.get("competition_activities"),
        "includes_supply_items": flat.get("includes_supply_items"),

        "execution_location": flat.get("execution_location") or flat.get("مكان التنفيذ"),
        "execution_region": flat.get("execution_region") or flat.get("داخل المملكة"),
        "execution_city": flat.get("execution_city"),
        "execution_regions_raw": flat.get("execution_regions_raw"),

        "execution_details": flat.get("execution_details"),
        "construction_works": flat.get("construction_works"),
        "maintenance_and_operation_works": flat.get("maintenance_and_operation_works"),

        "awarded_supplier": flat.get("اسم المورد"),
        "award_value": flat.get("قيمة الترسية"),
    }


# =========================
# Scraping functions
# =========================

def extract_opportunities_from_current_list_page(page):
    page.wait_for_selector(".tender-card", timeout=45000)

    cards = page.locator(".tender-card")
    count = cards.count()

    opportunities = []

    for i in range(count):
        try:
            card = cards.nth(i)

            ref = clean_text(card.get_attribute("data-ref"))

            title_link = card.locator("h3 a").first
            title = clean_text(title_link.inner_text())
            href = title_link.get_attribute("href")
            details_url = urljoin(BASE_URL, href)

            card_text = clean_text(card.inner_text())

            opportunities.append({
                "reference_number": ref,
                "title": title,
                "details_url": details_url,
                "card_text": card_text,
            })

        except Exception as e:
            print(f"Failed extracting card {i}: {e}")

    return opportunities


def scrape_list_page(page):
    print("Opening list page...")
    safe_goto(page, LIST_URL)

    try:
        opportunities = extract_opportunities_from_current_list_page(page)
    except PlaywrightTimeoutError:
        save_debug_files(page, "list_page", "list_no_cards")
        raise

    print(f"Found {len(opportunities)} opportunities")
    return opportunities


def scrape_details_page(page, opportunity, worker_id=None):
    ref = opportunity.get("reference_number")
    title = opportunity.get("title")

    prefix = f"[Worker {worker_id}] " if worker_id else ""

    print(f"{prefix}Opening: {ref} - {title}")

    try:
        safe_goto(page, opportunity["details_url"])
    except Exception as e:
        print(f"{prefix}Failed to open details page for {ref}: {e}")
        save_debug_files(page, ref, "goto_failed")

        return {
            **opportunity,
            "success": False,
            "error": f"goto_failed: {e}",
        }

    loaded = wait_for_details_page(page, ref)

    if not loaded:
        body_text = None

        try:
            body_text = page.locator("body").inner_text()
        except Exception:
            pass

        return {
            **opportunity,
            "success": False,
            "error": "details_page_not_loaded",
            "details_text": body_text,
        }

    page.wait_for_timeout(1000)

    try:
        expand_all_show_more(page)
    except Exception as e:
        print(f"{prefix}Could not expand show more: {e}")

    try:
        tabbed_data = click_and_extract_tabs(page)

        clean_details = normalize_details(
            tabbed_data,
            opportunity.get("card_text"),
        )

        try:
            details_text = page.locator("body").inner_text()
        except Exception:
            details_text = None

        return {
            **opportunity,
            "success": True,
            "clean_details": clean_details,
            "raw_tabs": tabbed_data,
            "details_text": details_text,
        }

    except Exception as e:
        print(f"{prefix}Failed extracting details for {ref}: {e}")
        save_debug_files(page, ref, "extract_failed")

        return {
            **opportunity,
            "success": False,
            "error": f"extract_failed: {e}",
        }


def scrape_worker(opportunities_chunk, worker_id):
    worker_results = []

    print(f"Worker {worker_id} started with {len(opportunities_chunk)} opportunities")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True
        )

        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            locale="ar-SA",
            timezone_id="Asia/Riyadh",
        )

        context.route("**/*", block_unnecessary_requests)

        page = context.new_page()
        page.set_default_timeout(45000)
        page.set_default_navigation_timeout(60000)

        try:
            for index, opportunity in enumerate(opportunities_chunk, start=1):
                ref = opportunity.get("reference_number")

                print(f"[Worker {worker_id}] [{index}/{len(opportunities_chunk)}] {ref}")

                try:
                    result = scrape_details_page(page, opportunity, worker_id=worker_id)
                    worker_results.append(result)

                    unfiltered_send(result)

                except Exception as e:
                    print(f"[Worker {worker_id}] Failed {ref}: {e}")

                    failed_result = {
                        **opportunity,
                        "success": False,
                        "error": str(e),
                    }

                    worker_results.append(failed_result)

        finally:
            browser.close()

    print(f"Worker {worker_id} finished")
    return worker_results


def scrape_current_page_in_parallel(opportunities):
    results = []

    chunks = chunk_list(opportunities, WORKER_COUNT)

    with ThreadPoolExecutor(max_workers=WORKER_COUNT) as executor:
        futures = []

        for worker_id, chunk in enumerate(chunks, start=1):
            if chunk:
                futures.append(
                    executor.submit(scrape_worker, chunk, worker_id)
                )

        for future in as_completed(futures):
            try:
                worker_results = future.result()
                results.extend(worker_results)
            except Exception as e:
                print(f"A worker crashed: {e}")

    return results


def get_current_reference_numbers(page):
    refs = []

    try:
        cards = page.locator(".tender-card")
        count = cards.count()

        for i in range(count):
            ref = clean_text(cards.nth(i).get_attribute("data-ref"))
            if ref:
                refs.append(ref)
    except Exception:
        pass

    return refs


def find_next_button(page):
    """
    Finds the visible enabled next pagination control.
    """
    selectors = [
        'button[aria-label="Next"]',
        'a[aria-label="Next"]',
        'button[title="Next"]',
        'a[title="Next"]',
        'button:has-text("التالي")',
        'a:has-text("التالي")',
        '.pagination button:has-text("›")',
        '.pagination a:has-text("›")',
        '.pagination button:has-text("»")',
        '.pagination a:has-text("»")',
    ]

    for selector in selectors:
        try:
            locator = page.locator(selector)
            count = locator.count()

            for i in range(count):
                btn = locator.nth(i)

                try:
                    if not btn.is_visible():
                        continue

                    disabled = btn.get_attribute("disabled")
                    aria_disabled = btn.get_attribute("aria-disabled")
                    class_name = btn.get_attribute("class") or ""

                    if disabled is not None:
                        continue

                    if aria_disabled == "true":
                        continue

                    if "disabled" in class_name.lower():
                        continue

                    return btn

                except Exception:
                    continue

        except Exception:
            continue

    return None


def go_to_next_list_page(page, current_page):
    """
    Click next page and verify the tender reference numbers changed.
    If they do not change, stop scraping to avoid repeating the same page forever.
    """
    old_refs = get_current_reference_numbers(page)

    print(f"Current refs before next: {old_refs}")

    try:
        next_btn = find_next_button(page)
        try:
            print("Current URL:", page.url)
            print("Next button HTML:", next_btn.evaluate("e => e.outerHTML")[:500])
        except Exception:
            pass

        if next_btn is None:
            print("No visible enabled next button found")
            return False

        try:
            next_btn.scroll_into_view_if_needed()
        except Exception:
            pass

        href = None

        try:
            href = next_btn.get_attribute("href")
        except Exception:
            pass

        if href:
            page.goto(urljoin(BASE_URL, href), wait_until="domcontentloaded", timeout=60000)
        else:
            next_btn.click(force=True)

        changed = False
        new_refs = old_refs

        for _ in range(20):
            page.wait_for_timeout(1000)

            try:
                new_refs = get_current_reference_numbers(page)

                if new_refs and new_refs != old_refs:
                    changed = True
                    break
            except Exception:
                pass

        print(f"Refs after next attempt: {new_refs}")

        if not changed:
            print("Reached last page (next button no longer changes results)")
            return False


        print(f"New refs after next: {new_refs}")
        return True

    except Exception as e:
        print(f"Failed going to next page from page {current_page}: {e}")
        save_debug_files(page, f"list_page_{current_page}", "next_failed")
        return False

def scrape_etimad():
    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True
        )

        context = browser.new_context(
            viewport={"width": 1440, "height": 1000},
            locale="ar-SA",
            timezone_id="Asia/Riyadh",
        )

        context.route("**/*", block_unnecessary_requests)

        page = context.new_page()
        page.set_default_timeout(45000)
        page.set_default_navigation_timeout(60000)

        try:
            current_page = 1
            seen_refs = set()
            duplicate_pages = 0
            safe_goto(page, LIST_URL)

            try:
                page.wait_for_selector("#itemsPerPage", timeout=10000)
                page.select_option("#itemsPerPage", "24")
                page.wait_for_timeout(5000)
                print("Changed page size to 24")
            except Exception as e:
                print(f"Failed to change page size: {e}")

            while True:
                print(f"\n=== LIST PAGE {current_page} ===")

                try:
                    opportunities = extract_opportunities_from_current_list_page(page)

                    new_opportunities = []

                    for opp in opportunities:
                        ref = opp.get("reference_number")

                        if not ref:
                            continue

                        if ref in seen_refs:
                            continue

                        seen_refs.add(ref)
                        new_opportunities.append(opp)

                    if not new_opportunities:
                        duplicate_pages += 1

                        print(
                            f"Page {current_page} contains only previously seen tenders "
                            f"(duplicate page #{duplicate_pages})"
                        )

                        if duplicate_pages >= 3:
                            print("Stopping after 3 consecutive duplicate pages.")
                            break
                    else:
                        duplicate_pages = 0

                    opportunities = new_opportunities

                except Exception as e:
                    print(f"Failed extracting list page {current_page}: {e}")
                    save_debug_files(page, f"list_page_{current_page}", "extract_list_failed")
                    break

                print(f"Found {len(opportunities)} opportunities on page {current_page}")

                page_results = scrape_current_page_in_parallel(opportunities)
                all_results.extend(page_results)

                with open(OUTPUT_DIR / "etimad_full_details_partial.json", "w", encoding="utf-8") as f:
                    json.dump(all_results, f, ensure_ascii=False, indent=2)

                has_next = go_to_next_list_page(page, current_page)

                if not has_next:
                    break

                current_page += 1

        finally:
            browser.close()

    return all_results


# =========================
# Main
# =========================

def main():
    print(SUPABASE_SECRET_KEY)
    results = scrape_etimad()

    full_output_path = OUTPUT_DIR / "etimad_full_details.json"
    clean_output_path = OUTPUT_DIR / "etimad_clean_details.json"

    with open(full_output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    clean_results = []

    for item in results:
        clean_results.append({
            "reference_number": item.get("reference_number"),
            "title": item.get("title"),
            "details_url": item.get("details_url"),
            "success": item.get("success"),
            **(item.get("clean_details") or {}),
            "error": item.get("error"),
        })

    with open(clean_output_path, "w", encoding="utf-8") as f:
        json.dump(clean_results, f, ensure_ascii=False, indent=2)

    print("\nDone.")
    print(f"Saved full data to: {full_output_path}")
    print(f"Saved clean data to: {clean_output_path}")


if __name__ == "__main__":
    main()