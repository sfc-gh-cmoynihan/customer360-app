# Customer 360 Demo Script

## Pre-Demo Setup
- Ensure `ADHOC_WH` is running: `ALTER WAREHOUSE ADHOC_WH RESUME`
- Open the SPCS app URL (check with `SHOW ENDPOINTS IN SERVICE CUSTOMER_360.PUBLIC.CUSTOMER_360_SERVICE`)
- Have a Snowsight worksheet open as backup

---

## Architecture Overview (for presenter reference)

```
┌─────────────────────────────────────────────────────────────┐
│                 SNOWFLAKE (IE_DEMO10)                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ SALESFORCE   │  │    SAP      │  │     WEB DATA        ││
│  │ 6.5M contacts│  │ 1,197 KNA1 │  │ Forms, Chat, Events ││
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│
│         │                 │                     │           │
│         ▼                 ▼                     ▼           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │         CUSTOMER_MASTER (6.5M+ unified records)         ││
│  │    JAROWINKLER fuzzy matching → MATCH_CLUSTERS          ││
│  └───────────────────────┬─────────────────────────────────┘│
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │       CUSTOMER_MASTER_GOLDEN_TABLE (best record)        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         SPCS: Customer 360 React App                  │  │
│  │    Next.js 16 + React 19 + Snowflake SDK             │  │
│  │    (Runs on C360_COMPUTE_POOL - CPU_X64_XS)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Supporting Tables:                                         │
│  • CUSTOMER_CALLS (sentiment, transcripts)                  │
│  • CUSTOMER_CONTRACTS (value, PDF docs)                     │
│  • WEB_ACTIVITY (page views, forms, campaigns)             │
│  • CUSTOMER_DEPENDENTS (family members)                     │
│  • CONTRACT_SEARCH_SERVICE (Cortex Search)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Demo Flow (8-10 minutes)

### 1. Opening / Context Setting (1 minute)

> "What we're looking at is a production-ready Customer 360 application deployed on Snowpark Container Services. It unifies customer identity across three source systems:
>
> - **Salesforce CRM** — 6.5 million contacts
> - **SAP Customer Master (KNA1)** — 1,197 business accounts  
> - **Web interactions** — form submissions, live chat sessions, and website activity
>
> The application uses fuzzy matching to resolve duplicates, even when names are misspelled or data is incomplete, and presents a single golden record for each customer."

---

### 2. Search — Multi-Source Identity Resolution (2 minutes)

**Action:** Type "Colm Moynihan" in the Customer Name field → Click **Search**

> "I'll search for myself. The system finds my golden record with **61 versions** — that's 61 separate records across Salesforce, SAP, and web forms that the system identified as the same person."

**Click the row to select the customer** (auto-loads in all other tabs)

**Key talking points:**
- Word-splitting: "Colm Moynihan" matches "Colm W Moynihan", "C Moynihan", etc.
- RECORD_COUNT = 61 (54 Salesforce + 3 SAP + 2 Web + 2 misspelled variants)
- Golden record selection prioritises: PPSN > Email > Phone > City > Name length

**Action:** Clear name, type "8234567A" in PPSN field → Search

> "PPSN/SSN lookup is instant. Even if only 1 of 61 records has the PPSN, the golden record picks it up."

---

### 3. Second Example — Dan Jones / Email+Phone Linking (2 minutes)

**Action:** Clear search. Type "dan.jones@snowflake.com" in the Email field → Press Enter

> "Now let me show how identity linking works with a different customer. I'll search by email for Dan Jones."

**Result:** Shows Dan Jones — MCR-00009050, 9 records, PPSN 7654321G

**Action:** Click the row to select Dan, then click **All Versions** tab

> "Dan has 9 records across all three source systems — linked together because they share the same email address OR the same mobile number. Look at the linking logic:"

**Key things to highlight:**
- **3 Salesforce records**: "Dan Jones", "Daniel Jones", "Dan Jones" — different SF Account IDs, all linked by `dan.jones@snowflake.com`
- **2 SAP records**: "Dan Jones" (KNA1-009050) and "Daniel Jones" (KNA1-009051) — linked by mobile `0871234567` AND email
- **3 WEB records**: Form submission, live chat ("D Jones"), and a form with ONLY a mobile number (no email) — still linked via `+353871234567`
- One record (WEB-FORM-DJ-002) has NO email — it was linked purely by mobile phone number matching

> "Notice this web form — the visitor gave only a mobile number, no email. The system still matched them to Dan's cluster because the phone number `+353871234567` appeared in his SAP and Salesforce records. That's the power of multi-attribute fuzzy matching."

**Action:** Click **Calls** tab

> "Dan has 5 calls with mixed sentiment. Click the Negative segment in the pie chart..."

**Action:** Click the red (Negative) slice in the pie chart

> "...and it takes us straight to the call detail. This was a Snowpipe outage where Dan needed urgent help before a client demo. The AI summary captured the key issue and resolution."

**Action:** Click **Contracts** tab

> "Dan has a full contract history — from his initial €22K enterprise license in 2023, through renewals with expanding scope, up to a pending €120K Business Critical 3-year deal. You can see the customer journey reflected in increasing contract values."

---

### 4. All Versions — Source System Breakdown (1.5 minutes)

**Action:** Go back to Colm (search "Colm Moynihan" by name), click **All Versions** tab

> "Here we see every version from every source system. Notice the SOURCE_SYSTEM column — Salesforce, SAP, and WEB."

**Key things to highlight:**
- **SAP records**: Show KNA1 fields (KUNNR, BAHNE=email, TELF1=phone)
- **Salesforce records**: Various name spellings, some with email only, some with phone only
- **WEB records**: "WEB-FORM-00001" (full form submission) vs "WEB-CHAT-00001" (minimal live chat data — just "C Moynihan" with email)
- The match engine linked a minimal live chat record ("C Moynihan") to the full customer profile using email matching

> "The web data is particularly interesting. A live chat visitor only typed 'C Moynihan' and gave their email — the system still resolved them to the same person because the email matched."

---

### 4. Call Center Intelligence (1.5 minutes)

**Action:** Click **Calls** tab

> "We've enriched the customer profile with call center data. Each call has AI-generated sentiment scoring."

**Key talking points:**
- Show the sentiment pie chart (Positive/Neutral/Negative breakdown)
- Click a call row to expand the transcript
- Point out: "This sentiment was generated using Cortex AI functions, no external ML infrastructure needed"

**Action:** Click **Recordings** tab

> "We also have the actual recordings stored on a Snowflake stage. Click any recording to get a Cortex-generated summary."

---

### 5. Contracts & AI Search (1.5 minutes)

**Action:** Click **Contracts** tab

> "Contract data pulled from SAP — showing contract value, status, and dates. The bar chart gives a quick visual of total contract value over time."

**Action:** Click **AI Search** tab → Type "data processing agreement"

> "This uses Cortex Search — a vector-based semantic search service — to find relevant contracts by meaning, not just keyword. It searches across all contract document text."

---

### 6. Web Activity & Digital Journey (1 minute)

> "Let me show you the web data. In Snowflake we have the full digital journey:"

**Action:** Open a worksheet and run:

```sql
SELECT ACTIVITY_TYPE, PAGE_URL, CHANNEL, DEVICE_TYPE, CAMPAIGN_SOURCE, 
       SESSION_DURATION_SECONDS, PAGES_VIEWED, ACTIVITY_DATE
FROM CUSTOMER_360.PUBLIC.WEB_ACTIVITY
WHERE MASTER_CUSTOMER_ID = 'MCR-00009001'
ORDER BY ACTIVITY_DATE;
```

> "We can see Colm came in via Google organic search, browsed pricing, submitted a Contact Sales form, then came back via email campaign to read docs, and later downloaded a whitepaper from a LinkedIn paid ad. The entire customer journey across web, CRM, ERP, and call center — unified in one place."

---

### 7. Technical Deep-Dive (optional, 2 minutes)

> "Under the hood, the matching pipeline works in three stages:"

1. **Data Unification** — Salesforce, SAP KNA1, and web form data normalised into a common schema (FULL_NAME, EMAIL, PHONE, etc.)

2. **Fuzzy Matching** — Cross-system comparison using Snowflake's JAROWINKLER_SIMILARITY:
   - Name similarity (30% weight)
   - Email similarity (30% weight)  
   - Phone similarity (20% weight)
   - Address similarity (20% weight)
   - Threshold: ≥60% weighted score clusters records together

3. **Golden Record** — Best record per cluster selected by data completeness (PPSN > email > phone > city > name length > confidence)

> "The golden table is pre-materialised — queries across 6.5 million records return in under 1 second. The app itself runs as a containerised Next.js service on SPCS with zero external dependencies."

---

### 8. Wrap-up (30 seconds)

> "So what you've seen is a complete Customer 360 solution — three source systems, fuzzy identity resolution, AI-powered call analytics, semantic contract search, and web journey tracking — all running entirely within Snowflake. No external ETL tools, no separate ML infrastructure, no third-party hosting."

---

## Backup Queries (if app has issues)

```sql
-- Verify 3 source systems
SELECT SOURCE_SYSTEM, COUNT(*) as RECORDS 
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER 
GROUP BY SOURCE_SYSTEM ORDER BY RECORDS DESC;

-- Search by name (Colm)
SELECT MASTER_CUSTOMER_ID, FULL_NAME, EMAIL, PHONE, CITY, PPSN_SSN, RECORD_COUNT
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
WHERE UPPER(FULL_NAME) LIKE '%COLM%' AND UPPER(FULL_NAME) LIKE '%MOYNIHAN%';

-- Search by email (Dan Jones)
SELECT MASTER_CUSTOMER_ID, FULL_NAME, EMAIL, PHONE, CITY, PPSN_SSN, RECORD_COUNT
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
WHERE UPPER(EMAIL) LIKE '%DAN.JONES@SNOWFLAKE%';

-- PPSN search
SELECT MASTER_CUSTOMER_ID, FULL_NAME, EMAIL, PHONE, CITY, PPSN_SSN, RECORD_COUNT
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER_GOLDEN_TABLE
WHERE UPPER(PPSN_SSN) = '8234567A';

-- All versions showing all 3 source systems (Colm)
SELECT SOURCE_SYSTEM, SOURCE_ID, FULL_NAME, EMAIL, PHONE, CITY, MATCH_CONFIDENCE
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
WHERE MASTER_CUSTOMER_ID = 'MCR-00009001'
ORDER BY SOURCE_SYSTEM, FULL_NAME;

-- Dan Jones cluster - shows email+phone linking across systems
SELECT SOURCE_SYSTEM, SOURCE_ID, FULL_NAME, EMAIL, PHONE, MOBILE_PHONE
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
WHERE MASTER_CUSTOMER_ID = 'MCR-00009050'
ORDER BY SOURCE_SYSTEM, FULL_NAME;

-- Dan Jones contracts (shows journey from €22K to €120K)
SELECT CONTRACT_TITLE, CONTRACT_DATE, EXPIRY_DATE, CONTRACT_VALUE, STATUS
FROM CUSTOMER_360.PUBLIC.CUSTOMER_CONTRACTS
WHERE MASTER_CUSTOMER_ID = 'MCR-00009050'
ORDER BY CONTRACT_DATE;

-- Dan Jones web journey
SELECT ACTIVITY_TYPE, PAGE_URL, CHANNEL, CAMPAIGN_SOURCE,
       SESSION_DURATION_SECONDS, PAGES_VIEWED, ACTIVITY_DATE
FROM CUSTOMER_360.PUBLIC.WEB_ACTIVITY
WHERE MASTER_CUSTOMER_ID = 'MCR-00009050'
ORDER BY ACTIVITY_DATE;

-- Web activity journey (Colm)
SELECT ACTIVITY_TYPE, PAGE_URL, CHANNEL, CAMPAIGN_SOURCE, CAMPAIGN_MEDIUM,
       SESSION_DURATION_SECONDS, PAGES_VIEWED, ACTIVITY_DATE
FROM CUSTOMER_360.PUBLIC.WEB_ACTIVITY
WHERE MASTER_CUSTOMER_ID = 'MCR-00009001'
ORDER BY ACTIVITY_DATE;

-- Phone number linking demo (shows records matched by mobile only)
SELECT SOURCE_SYSTEM, FULL_NAME, EMAIL, MOBILE_PHONE
FROM CUSTOMER_360.PUBLIC.CUSTOMER_MASTER
WHERE MASTER_CUSTOMER_ID = 'MCR-00009050'
  AND (EMAIL IS NULL OR EMAIL = '')
ORDER BY SOURCE_SYSTEM;
```

---

## Key Data Points for Q&A

| Metric | Value |
|--------|-------|
| Total unified records | 6,520,240+ |
| Salesforce contacts | 6,519,018 |
| SAP customers (KNA1) | 1,199 |
| Web interactions | 28 |
| Cross-system matches found | 24,505+ |
| Golden records | ~6,496,731 |
| Match threshold | 60% weighted similarity |
| Query performance | <1 second on golden table |
| Deployment | SPCS (CPU_X64_XS, 1 node) |
| App framework | Next.js 16 + React 19 |

## Demo Customers

| Customer | ID | Records | Sources | Key Demo Point |
|----------|-----|---------|---------|----------------|
| Colm Moynihan | MCR-00009001 | 61 | SF+SAP+WEB | Fuzzy name matching, misspellings |
| Dan Jones | MCR-00009050 | 9 | SF+SAP+WEB | Email+phone linking, contract growth |
| Moynihan Colm (SF) | MCR-SF-0033r00003hMYRAAA4 | 1 | SF | Separate cluster, 6 calls, 4 contracts |

---

## FAQ

**Q: What web data sources feed into this?**
A: Website form submissions (contact-us, demo requests, whitepaper downloads), live chat transcripts, and tracked page views with UTM campaign attribution.

**Q: How does web data get matched to CRM records?**  
A: Email is the primary join key. When a web visitor submits a form or starts a live chat, the email they provide is matched against the existing customer master using the same fuzzy matching pipeline.

**Q: Where is this running?**
A: Entirely on Snowflake. The app is a Next.js container on Snowpark Container Services (SPCS). Data processing, fuzzy matching, AI sentiment, and semantic search all use native Snowflake capabilities.

**Q: What about real-time web tracking?**
A: Web events can be streamed via Snowpipe Streaming or Kafka connector. The current demo shows batch-loaded web data, but the architecture supports sub-second ingestion.

**Q: How does the AI work?**
A: Call sentiment uses Cortex AI functions (no external API calls). Contract search uses Cortex Search (vector embeddings + hybrid retrieval). Both are built-in Snowflake services — no GPU provisioning or model deployment needed.
