# Supabase Setup

This project uses Supabase as the backend for data storage and Edge Functions.

The setup consists of two steps:

1. Import the database schema.
2. Deploy the Edge Function.

---

# Requirements

- Supabase Account
- Supabase CLI
- Docker Desktop (required by some Supabase CLI commands)

Install the CLI:

```bash
brew install supabase/tap/supabase
```

Login:

```bash
supabase login
```

Link your project:

```bash
supabase link --project-ref <PROJECT_REF>
```

---

# Database Setup

The complete database schema is included in:

```
database/setup.sql
```

This file contains:

- Tables
- Primary Keys
- Foreign Keys
- Constraints
- Indexes
- Views
- SQL Functions
- Triggers
- RLS Policies
- Grants

## Import

Open your Supabase Dashboard.

Navigate to:

```
SQL Editor
```

Create a new query.

Open:

```
database/setup.sql
```

Copy the entire file into the SQL Editor and click **Run**.

Once completed, the database is ready.

---

# Edge Function

The project includes the following Edge Function:

```
supabase/functions/
└── unfiltered_send/
```

## Deploy

Deploy the function using the Supabase CLI:

```bash
supabase functions deploy unfiltered_send
```

Verify the deployment:

```bash
supabase functions list
```

Expected output:

```
unfiltered_send
```

---

# Configure Edge Function Secrets

The Edge Function requires the following secrets.

Set them using the Supabase CLI:

```bash
supabase secrets set \
SUPABASE_URL=https://<PROJECT_REF>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

Verify the secrets:

```bash
supabase secrets list
```

---

# Function Endpoint

After deployment the endpoint will be:

```
https://<PROJECT_REF>.supabase.co/functions/v1/unfiltered_send
```

This URL should be placed in the project's `config.json`:

```json
{
  "SUPABASE_FUNCTION_URL": "https://<PROJECT_REF>.supabase.co/functions/v1/unfiltered_send"
}
```

---

# Verify Installation

After completing the setup, verify that:

- The database schema has been imported successfully.
- All tables and views exist.
- The `unfiltered_send` Edge Function is listed as **ACTIVE**.
- The required secrets have been configured.
- The function endpoint is reachable.

The Supabase backend is now ready for use with the scrapers and the n8n workflow.