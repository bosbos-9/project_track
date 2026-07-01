
\restrict NPyfSCNGCbOQQkSOyCU3yKdLgse5vFTNoWTMPMzQN4mVwkdTXBOBWj488zwvuwr


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_forsah_assessments" (
    "opportunity_id" "text" NOT NULL,
    "decision" "text",
    "fit_score" integer,
    "confidence" integer,
    "best_service_area" "text",
    "reason_ar" "text",
    "recommended_action" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_forsah_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_opportunity_assessments" (
    "reference_number" "text" NOT NULL,
    "decision" "text" NOT NULL,
    "fit_score" integer NOT NULL,
    "confidence" integer NOT NULL,
    "best_service_area" "text",
    "matched_service_areas" "jsonb" DEFAULT '[]'::"jsonb",
    "reason_ar" "text",
    "recommended_action" "text",
    "raw_ai_response" "jsonb",
    "assessed_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "model" "text",
    "source" "text"
);


ALTER TABLE "public"."ai_opportunity_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."etimad_opportunities" (
    "reference_number" "text" NOT NULL,
    "title" "text",
    "details_url" "text",
    "success" boolean DEFAULT true,
    "competition_name" "text",
    "tender_number" "text",
    "purpose" "text",
    "document_price" "text",
    "status" "text",
    "contract_duration" "text",
    "insurance_required" "text",
    "competition_type" "text",
    "government_entity" "text",
    "time_remaining" "text",
    "submission_method" "text",
    "initial_guarantee" "text",
    "initial_guarantee_address" "text",
    "final_guarantee" "text",
    "inquiry_deadline" "text",
    "offer_deadline" "text",
    "opening_date" "text",
    "contractor_classification_field" "text",
    "main_activity" "text",
    "competition_activities" "jsonb",
    "includes_supply_items" "text",
    "execution_location" "text",
    "execution_region" "text",
    "execution_city" "text",
    "execution_regions_raw" "jsonb",
    "execution_details" "text",
    "construction_works" "jsonb",
    "maintenance_and_operation_works" "jsonb",
    "awarded_supplier" "text",
    "award_value" "text",
    "error" "text",
    "raw_json" "jsonb",
    "first_seen_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_assessed" boolean DEFAULT false NOT NULL,
    "assessed_at" timestamp with time zone
);


ALTER TABLE "public"."etimad_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ai_ready_etimad_opportunities" AS
 SELECT "reference_number",
    "title",
    COALESCE("competition_name", "title") AS "competition_name",
    "government_entity",
    "regexp_replace"(COALESCE("main_activity", ''::"text"), '\s*\d+\s*يوم\s*\d+\s*ساعة.*$'::"text", ''::"text") AS "main_activity",
    "competition_type",
    COALESCE("purpose", ("raw_json" ->> 'card_text'::"text"), ''::"text") AS "ai_context"
   FROM "public"."etimad_opportunities" "o"
  WHERE ("is_assessed" = false)
  ORDER BY "last_seen_at" DESC;


ALTER VIEW "public"."ai_ready_etimad_opportunities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forsah_opportunities" (
    "id" "text" NOT NULL,
    "title" "text",
    "status" "text",
    "publish_date" "date",
    "due_date" timestamp without time zone,
    "days_to_go" integer,
    "city" "text",
    "raw_json" "jsonb",
    "first_seen_at" timestamp without time zone DEFAULT "now"(),
    "last_seen_at" timestamp without time zone DEFAULT "now"(),
    "is_assessed" boolean DEFAULT false
);


ALTER TABLE "public"."forsah_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."all_opportunities" AS
 SELECT "etimad_opportunities"."reference_number",
    "etimad_opportunities"."title",
    "etimad_opportunities"."government_entity",
    "etimad_opportunities"."main_activity",
    "etimad_opportunities"."purpose",
    "etimad_opportunities"."opening_date",
    'etimad'::"text" AS "source"
   FROM "public"."etimad_opportunities"
UNION ALL
 SELECT "forsah_opportunities"."id" AS "reference_number",
    "forsah_opportunities"."title",
    NULL::"text" AS "government_entity",
    NULL::"text" AS "main_activity",
    "forsah_opportunities"."title" AS "purpose",
    ("forsah_opportunities"."publish_date")::"text" AS "opening_date",
    'forsah'::"text" AS "source"
   FROM "public"."forsah_opportunities"
  WHERE ("forsah_opportunities"."status" = ANY (ARRAY['متاحة'::"text", 'معلقة'::"text"]));


ALTER VIEW "public"."all_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."available_forsah_opportunities" AS
 SELECT "id",
    "title",
    "status",
    "publish_date",
    "due_date",
    "days_to_go",
    "city",
    "last_seen_at"
   FROM "public"."forsah_opportunities"
  WHERE ("status" = 'متاحة'::"text")
  ORDER BY "publish_date" DESC;


ALTER VIEW "public"."available_forsah_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."forsah_for_ai" AS
 SELECT "id" AS "reference_number",
    "title",
    "title" AS "purpose",
    NULL::"text" AS "government_entity",
    NULL::"text" AS "main_activity",
    "publish_date" AS "opening_date",
    "status",
    false AS "is_assessed",
    "raw_json"
   FROM "public"."forsah_opportunities"
  WHERE ("status" = ANY (ARRAY['متاحة'::"text", 'معلقة'::"text"]));


ALTER VIEW "public"."forsah_for_ai" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."matched_opportunities" AS
 SELECT "o"."reference_number",
    "o"."title",
    "o"."government_entity",
    "o"."main_activity",
    "o"."opening_date",
    "o"."details_url",
    "a"."decision",
    "a"."fit_score",
    "a"."confidence",
    "a"."best_service_area",
    "a"."reason_ar",
    "a"."recommended_action",
    "a"."source",
    "o"."last_seen_at"
   FROM ("public"."etimad_opportunities" "o"
     JOIN "public"."ai_opportunity_assessments" "a" ON (("o"."reference_number" = "a"."reference_number")))
  WHERE ("a"."decision" = ANY (ARRAY['MATCHED'::"text", 'REVIEW'::"text", 'REJECTED'::"text"]))
UNION ALL
 SELECT "f"."id" AS "reference_number",
    "f"."title",
    NULL::"text" AS "government_entity",
    NULL::"text" AS "main_activity",
    (CURRENT_DATE)::"text" AS "opening_date",
    NULL::"text" AS "details_url",
    "a"."decision",
    "a"."fit_score",
    "a"."confidence",
    "a"."best_service_area",
    "a"."reason_ar",
    "a"."recommended_action",
    "a"."source",
    "f"."last_seen_at"
   FROM ("public"."forsah_opportunities" "f"
     JOIN "public"."ai_opportunity_assessments" "a" ON (("f"."id" = "a"."reference_number")))
  WHERE ("a"."decision" = ANY (ARRAY['MATCHED'::"text", 'REVIEW'::"text", 'REJECTED'::"text"]))
  ORDER BY 8 DESC, 14 DESC;


ALTER VIEW "public"."matched_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."unassessed_etimad_opportunities" AS
 SELECT "o"."reference_number",
    "o"."title",
    "o"."competition_name",
    "o"."purpose",
    "o"."government_entity",
    "o"."main_activity",
    "o"."competition_type",
    "o"."contract_duration",
    "o"."submission_method",
    "o"."document_price",
    "o"."opening_date",
    "o"."status",
    "o"."success",
    "o"."error",
    "o"."last_seen_at",
    COALESCE(NULLIF("o"."purpose", ''::"text"), ("o"."raw_json" ->> 'card_text'::"text"), "o"."title") AS "ai_context"
   FROM "public"."etimad_opportunities" "o"
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."ai_opportunity_assessments" "a"
          WHERE ("a"."reference_number" = "o"."reference_number"))))
UNION ALL
 SELECT "f"."id" AS "reference_number",
    "f"."title",
    NULL::"text" AS "competition_name",
    "f"."title" AS "purpose",
    NULL::"text" AS "government_entity",
    NULL::"text" AS "main_activity",
    NULL::"text" AS "competition_type",
    NULL::"text" AS "contract_duration",
    NULL::"text" AS "submission_method",
    NULL::"text" AS "document_price",
    ("f"."publish_date")::"text" AS "opening_date",
    "f"."status",
    true AS "success",
    NULL::"text" AS "error",
    "f"."last_seen_at",
    "f"."title" AS "ai_context"
   FROM "public"."forsah_opportunities" "f"
  WHERE (("f"."status" = ANY (ARRAY['متاحة'::"text", 'معلقة'::"text"])) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."ai_opportunity_assessments" "a"
          WHERE ("a"."reference_number" = "f"."id")))));


ALTER VIEW "public"."unassessed_etimad_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."unassessed_forsah_opportunities" AS
 SELECT "id" AS "reference_number",
    "title",
    "title" AS "competition_name",
    "title" AS "purpose",
    NULL::"text" AS "government_entity",
    NULL::"text" AS "main_activity",
    NULL::"text" AS "competition_type",
    NULL::"text" AS "contract_duration",
    NULL::"text" AS "submission_method",
    NULL::"text" AS "document_price",
    (CURRENT_DATE)::"text" AS "opening_date",
    ((CURRENT_DATE + COALESCE("days_to_go", 0)))::"text" AS "offer_deadline",
    "status",
    true AS "success",
    NULL::"text" AS "error",
    "last_seen_at",
    "title" AS "ai_context"
   FROM "public"."forsah_opportunities" "f"
  WHERE (("status" = 'متاحة'::"text") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."ai_opportunity_assessments" "a"
          WHERE ("a"."reference_number" = "f"."id")))))
  ORDER BY "last_seen_at" DESC;


ALTER VIEW "public"."unassessed_forsah_opportunities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."unassessed_opportunities" AS
 SELECT "o"."reference_number",
    "o"."title",
    "o"."competition_name",
    "o"."purpose",
    "o"."government_entity",
    "o"."main_activity",
    "o"."competition_type",
    "o"."contract_duration",
    "o"."submission_method",
    "o"."document_price",
    "o"."opening_date",
    NULL::"text" AS "offer_deadline",
    "o"."status",
    "o"."success",
    "o"."error",
    "o"."last_seen_at",
    'etimad'::"text" AS "source",
    COALESCE(NULLIF("o"."purpose", ''::"text"), ("o"."raw_json" ->> 'card_text'::"text"), "o"."title") AS "ai_context"
   FROM "public"."etimad_opportunities" "o"
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."ai_opportunity_assessments" "a"
          WHERE ("a"."reference_number" = "o"."reference_number"))))
UNION ALL
 SELECT "f"."id" AS "reference_number",
    "f"."title",
    "f"."title" AS "competition_name",
    "f"."title" AS "purpose",
    NULL::"text" AS "government_entity",
    NULL::"text" AS "main_activity",
    NULL::"text" AS "competition_type",
    NULL::"text" AS "contract_duration",
    NULL::"text" AS "submission_method",
    NULL::"text" AS "document_price",
    (CURRENT_DATE)::"text" AS "opening_date",
    ((CURRENT_DATE + COALESCE("f"."days_to_go", 0)))::"text" AS "offer_deadline",
    "f"."status",
    true AS "success",
    NULL::"text" AS "error",
    "f"."last_seen_at",
    'forsah'::"text" AS "source",
    "f"."title" AS "ai_context"
   FROM "public"."forsah_opportunities" "f"
  WHERE (("f"."status" = 'متاحة'::"text") AND (NOT (EXISTS ( SELECT 1
           FROM "public"."ai_opportunity_assessments" "a"
          WHERE ("a"."reference_number" = "f"."id")))));


ALTER VIEW "public"."unassessed_opportunities" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_forsah_assessments"
    ADD CONSTRAINT "ai_forsah_assessments_pkey" PRIMARY KEY ("opportunity_id");



ALTER TABLE ONLY "public"."ai_opportunity_assessments"
    ADD CONSTRAINT "ai_opportunity_assessments_pkey" PRIMARY KEY ("reference_number");



ALTER TABLE ONLY "public"."etimad_opportunities"
    ADD CONSTRAINT "etimad_opportunities_pkey" PRIMARY KEY ("reference_number");



ALTER TABLE ONLY "public"."forsah_opportunities"
    ADD CONSTRAINT "forsah_opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."ai_forsah_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_opportunity_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."etimad_opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forsah_opportunities" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."ai_forsah_assessments" TO "anon";
GRANT ALL ON TABLE "public"."ai_forsah_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_forsah_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."ai_opportunity_assessments" TO "anon";
GRANT ALL ON TABLE "public"."ai_opportunity_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_opportunity_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."etimad_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."etimad_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."etimad_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."ai_ready_etimad_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."ai_ready_etimad_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_ready_etimad_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."forsah_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."forsah_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."forsah_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."all_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."all_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."all_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."available_forsah_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."available_forsah_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."available_forsah_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."forsah_for_ai" TO "anon";
GRANT ALL ON TABLE "public"."forsah_for_ai" TO "authenticated";
GRANT ALL ON TABLE "public"."forsah_for_ai" TO "service_role";



GRANT ALL ON TABLE "public"."matched_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."matched_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."matched_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."unassessed_etimad_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."unassessed_etimad_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."unassessed_etimad_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."unassessed_forsah_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."unassessed_forsah_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."unassessed_forsah_opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."unassessed_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."unassessed_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."unassessed_opportunities" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






\unrestrict NPyfSCNGCbOQQkSOyCU3yKdLgse5vFTNoWTMPMzQN4mVwkdTXBOBWj488zwvuwr

RESET ALL;
