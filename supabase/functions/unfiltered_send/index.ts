// supabase/functions/unfiltered_send/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type EtimadOpportunity = {
  reference_number: string;
  title?: string | null;
  details_url?: string | null;
  success?: boolean | null;

  competition_name?: string | null;
  tender_number?: string | null;
  purpose?: string | null;
  document_price?: string | null;
  status?: string | null;
  contract_duration?: string | null;
  insurance_required?: string | null;
  competition_type?: string | null;
  government_entity?: string | null;
  time_remaining?: string | null;
  submission_method?: string | null;
  initial_guarantee?: string | null;
  initial_guarantee_address?: string | null;
  final_guarantee?: string | null;

  inquiry_deadline?: string | null;
  offer_deadline?: string | null;
  opening_date?: string | null;

  contractor_classification_field?: string | null;
  main_activity?: string | null;
  competition_activities?: string[] | null;

  includes_supply_items?: string | null;
  execution_location?: string | null;
  execution_region?: string | null;
  execution_city?: string | null;
  execution_regions_raw?: string[] | null;
  execution_details?: string | null;

  construction_works?: string[] | null;
  maintenance_and_operation_works?: string[] | null;

  awarded_supplier?: string | null;
  award_value?: string | null;

  error?: string | null;
  raw_json?: unknown;
};

type ReqPayload = {
  opportunity?: EtimadOpportunity;
  opportunities?: EtimadOpportunity[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeOpportunity(item: EtimadOpportunity) {
  return {
    reference_number: item.reference_number,

    title: item.title ?? null,
    details_url: item.details_url ?? null,
    success: item.success ?? true,

    competition_name: item.competition_name ?? item.title ?? null,
    tender_number: item.tender_number ?? null,
    purpose: item.purpose ?? null,
    document_price: item.document_price ?? null,
    status: item.status ?? null,
    contract_duration: item.contract_duration ?? null,
    insurance_required: item.insurance_required ?? null,
    competition_type: item.competition_type ?? null,
    government_entity: item.government_entity ?? null,
    time_remaining: item.time_remaining ?? null,
    submission_method: item.submission_method ?? null,
    initial_guarantee: item.initial_guarantee ?? null,
    initial_guarantee_address: item.initial_guarantee_address ?? null,
    final_guarantee: item.final_guarantee ?? null,

    inquiry_deadline: item.inquiry_deadline ?? null,
    offer_deadline: item.offer_deadline ?? null,
    opening_date: item.opening_date ?? null,

    contractor_classification_field:
      item.contractor_classification_field ?? null,
    main_activity: item.main_activity ?? null,
    competition_activities: item.competition_activities ?? [],

    includes_supply_items: item.includes_supply_items ?? null,
    execution_location: item.execution_location ?? null,
    execution_region: item.execution_region ?? null,
    execution_city: item.execution_city ?? null,
    execution_regions_raw: item.execution_regions_raw ?? [],
    execution_details: item.execution_details ?? null,

    construction_works: item.construction_works ?? [],
    maintenance_and_operation_works:
      item.maintenance_and_operation_works ?? [],

    awarded_supplier: item.awarded_supplier ?? null,
    award_value: item.award_value ?? null,

    error: item.error ?? null,
    raw_json: item.raw_json ?? item,

    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase env vars");
      return jsonResponse(
        {
          error: "Server config error",
          details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let payload: ReqPayload;

    try {
      payload = await req.json();
    } catch (err) {
      return jsonResponse(
        {
          error: "Invalid JSON body",
          details: String(err),
        },
        400,
      );
    }

    const items = payload.opportunities ??
      (payload.opportunity ? [payload.opportunity] : []);

    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse(
        {
          error:
            "Body must contain { opportunity: {...} } or { opportunities: [...] }",
        },
        400,
      );
    }

    const missingReference = items.find((item) => !item.reference_number);

    if (missingReference) {
      return jsonResponse(
        {
          error: "Every opportunity must include reference_number",
          bad_item: missingReference,
        },
        400,
      );
    }

    const rows = items.map(normalizeOpportunity);

    console.log("Upserting rows:", rows.length);

    const { data, error } = await supabase
      .from("etimad_opportunities")
      .upsert(rows, {
        onConflict: "reference_number",
      })
      .select("reference_number, title, updated_at");

    if (error) {
      console.error("Supabase DB error:", error);

      return jsonResponse(
        {
          error: "Database upsert failed",
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        500,
      );
    }

    return jsonResponse({
      message: "Inserted/updated successfully",
      count: data?.length ?? 0,
      data,
    });
  } catch (err) {
    console.error("Unhandled function error:", err);

    return jsonResponse(
      {
        error: "Unhandled function error",
        details: String(err),
      },
      500,
    );
  }
});