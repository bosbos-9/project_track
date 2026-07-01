import requests
from datetime import datetime, timezone
from supabase import create_client
import json
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


API_URL = "https://forsah-api.910ths.sa/api/v1/opportunities"

STATUS_MAP = {
    "open": "متاحة",
    "pending": "معلقة",
    "closed": "مغلقة",
    "cancelled": "ملغاة",
    "awarded": "مرسية",
    "completed": "منتهية",
}

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

run_started = datetime.now(timezone.utc).isoformat()

page = 1
processed = 0
MAX_PAGES = 3

while page <= MAX_PAGES:

    response = requests.get(
        API_URL,
        params={
            "perPage": 100,
            "page": page
        },
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    opportunities = data.get("result", [])

    if not opportunities:
        break

    batch = []

    for opp in opportunities:

        city = None

        locations = opp.get("deliveryLocations") or []

        if locations:
            city = (
                locations[0]
                .get("city", {})
                .get("name", {})
                .get("ar")
            )
        
        status = STATUS_MAP.get(
            opp.get("statusKey"),
            opp.get("statusKey")
        )

        batch.append({
            "id": opp.get("id"),
            "title": opp.get("title"),
            "status": status,
            "publish_date": opp.get("publishDate"),
            "due_date": opp.get("dueDate"),
            "days_to_go": opp.get("daysToGo"),
            "city": city,
            "raw_json": opp,
            "last_seen_at": run_started
        })

    supabase.table("forsah_opportunities").upsert(
        batch,
        on_conflict="id"
    ).execute()

    processed += len(batch)

    print(f"Page {page}: {len(batch)} rows")

    page += 1

print(f"Processed {processed} opportunities")

print("Finished")