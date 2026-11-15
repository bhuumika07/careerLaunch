# Phase 3: AI Opportunity Enrichment — Extraction Contract & Specification
**Version:** 1.0.0  
**Status:** DRAFT (Under Review)  
**Author:** CareerLaunch Engineering Team  
**Scope:** Specification for automated, factual extraction of structured data from raw unstructured job listings.

---

## 1. Executive Summary & Core Invariants

Phase 3 converts raw, unstructured job and internship descriptions collected in Phase 1 into rich, structured, and filterable records so students can search by degree, skill, work mode, and eligibility.

### Non-Negotiable Extraction Invariants
1. **Strict Factual Grounding (Zero Hallucination):** The model organizes and extracts information that explicitly exists in the text. Missing information is strictly represented as `null` or empty arrays. The model must never fabricate salaries, eligibility criteria, or deadlines.
2. **Raw Text is the Immutable Source of Truth:** `Opportunity.description` is immutable and never overwritten. Extracted data lives in an additive child table (`opportunity_enrichments`).
3. **Explicit Provenance:** Every significant extracted entity must link to a verbatim source-text snippet from the normalized text.
4. **Three-Tier Skill Separation:** Skills must be strictly partitioned into:
   - `required_skills`: Stated as mandatory requirements.
   - `preferred_skills`: Stated as bonus, nice-to-have, or preferred.
   - `inferred_skills`: Suggested by the domain/tools mentioned, but not explicitly stated.
5. **Deterministic Reprocessing & Idempotency:** Input text is hashed using SHA-256 (`content_hash`). Repeated extraction on identical content under the same prompt and schema versions produces an idempotent result.

---

## 2. Input Specification (AI Prompt & Context)

### 2.1 Input Payload Schema

The enrichment worker sends a standardized JSON object to the extraction engine:

```json
{
  "opportunity_id": "opp_c9a18b2c",
  "source_name": "greenhouse",
  "source_url": "https://boards.greenhouse.io/acme/jobs/123456",
  "raw_title": "Software Engineering Intern - Summer 2027",
  "raw_company": "Acme Corp",
  "posted_at": "2026-11-10T09:30:00.000Z",
  "application_deadline_hint": null,
  "normalized_description": "We are seeking a Software Engineering Intern for Summer 2027..."
}
```

### 2.2 System & User Prompt Template

- **Prompt Identifier:** `PROMPT_VERSION = "2026-11-v1.0.0"`
- **Schema Identifier:** `SCHEMA_VERSION = "1.0.0"`

#### System Prompt Template:
```text
You are a high-precision, factual data extraction engine for student career opportunities.
Your sole job is to extract structured information from the provided job listing into valid, strict JSON matching the schema.

STRICT INVARIANTS:
1. ONLY extract information that is explicitly stated in the source text.
2. If a field is not explicitly mentioned, return null (or an empty array for list fields). DO NOT invent, assume, or infer missing facts.
3. Keep skills strictly separated:
   - "required_skills": Only skills explicitly stated as required, mandatory, or minimum requirements.
   - "preferred_skills": Only skills stated as nice-to-have, bonus, plus, or preferred.
   - "inferred_skills": Skills not explicitly stated, but strongly implied by the role.
4. For every significant extracted value, provide a "provenance" object containing the verbatim substring ("source_snippet") where the information appears.
5. If the listing contains contradictions (e.g. title says "Intern" but text demands "5+ years of experience"), extract what is written, record the contradiction in "unsupported_claims", and flag "needs_manual_review": true.
6. Return raw, valid JSON only. Do not wrap in markdown or add conversational filler.
```

#### User Prompt Template:
```text
Extract structured data from the following job listing.

[METADATA]
Opportunity ID: {{opportunity_id}}
Raw Title: {{raw_title}}
Raw Company: {{raw_company}}
Posted Date: {{posted_at}}
Source URL: {{source_url}}

[NORMALIZED DESCRIPTION]
{{normalized_description}}
```

---

## 3. Strict Output JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OpportunityEnrichmentOutput",
  "type": "object",
  "required": [
    "schema_version",
    "prompt_version",
    "basic",
    "opportunity_type",
    "skills",
    "qualifications",
    "experience",
    "location",
    "compensation",
    "timeline",
    "eligibility",
    "confidence",
    "quality"
  ],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "prompt_version": { "type": "string" },
    "basic": {
      "type": "object",
      "required": ["role_title", "company", "description_summary"],
      "properties": {
        "role_title": { "type": "string" },
        "company": { "type": "string" },
        "department": { "type": ["string", "null"] },
        "description_summary": {
          "type": "string",
          "description": "Factual 2-3 sentence summary of the core role responsibilities."
        }
      }
    },
    "opportunity_type": {
      "type": "object",
      "required": ["primary_type", "provenance"],
      "properties": {
        "primary_type": {
          "type": "string",
          "enum": ["internship", "full_time", "part_time", "contract", "unknown"]
        },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "skills": {
      "type": "object",
      "required": ["required_skills", "preferred_skills", "inferred_skills"],
      "properties": {
        "required_skills": {
          "type": "array",
          "items": { "$ref": "#/definitions/SkillItem" }
        },
        "preferred_skills": {
          "type": "array",
          "items": { "$ref": "#/definitions/SkillItem" }
        },
        "inferred_skills": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "rationale"],
            "properties": {
              "name": { "type": "string" },
              "rationale": { "type": "string" }
            }
          }
        }
      }
    },
    "qualifications": {
      "type": "object",
      "required": ["degree_levels", "branches", "graduation_years", "min_cgpa", "academic_requirements"],
      "properties": {
        "degree_levels": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["Bachelors", "Masters", "PhD", "Associate", "HighSchool", "Any", "Other"]
          }
        },
        "branches": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Fields of study e.g. Computer Science, Electrical Engineering."
        },
        "graduation_years": {
          "type": "array",
          "items": { "type": "integer" },
          "description": "Eligible passing-out batches e.g. [2026, 2027]."
        },
        "min_cgpa": {
          "type": ["number", "null"],
          "description": "Minimum GPA/CGPA on 10.0 or 4.0 scale if explicitly stated."
        },
        "academic_requirements": { "type": ["string", "null"] },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "experience": {
      "type": "object",
      "required": ["experience_level", "min_experience_months", "max_experience_months"],
      "properties": {
        "experience_level": {
          "type": "string",
          "enum": ["entry", "mid", "senior", "lead", "executive", "unknown"]
        },
        "min_experience_months": { "type": ["integer", "null"] },
        "max_experience_months": { "type": ["integer", "null"] },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "location": {
      "type": "object",
      "required": ["work_mode", "cities", "country", "is_worldwide"],
      "properties": {
        "work_mode": {
          "type": "string",
          "enum": ["remote", "hybrid", "onsite", "unknown"]
        },
        "cities": { "type": "array", "items": { "type": "string" } },
        "state_or_region": { "type": ["string", "null"] },
        "country": { "type": ["string", "null"] },
        "is_worldwide": { "type": "boolean" },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "compensation": {
      "type": "object",
      "required": ["is_paid", "currency", "min_amount", "max_amount", "interval", "text_verbatim"],
      "properties": {
        "is_paid": { "type": ["boolean", "null"] },
        "currency": { "type": ["string", "null"], "description": "ISO 4217 code (USD, INR, EUR, etc.)" },
        "min_amount": { "type": ["number", "null"] },
        "max_amount": { "type": ["number", "null"] },
        "interval": {
          "type": ["string", "null"],
          "enum": ["hourly", "monthly", "yearly", "stipend_total", null]
        },
        "text_verbatim": {
          "type": ["string", "null"],
          "description": "Verbatim compensation snippet from the source."
        },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "timeline": {
      "type": "object",
      "required": ["application_deadline", "start_date", "duration_text"],
      "properties": {
        "application_deadline": {
          "type": ["string", "null"],
          "description": "ISO-8601 formatted date (YYYY-MM-DD) if explicitly stated in text."
        },
        "start_date": { "type": ["string", "null"] },
        "duration_text": {
          "type": ["string", "null"],
          "description": "e.g. '10 weeks', '6 months'."
        },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "eligibility": {
      "type": "object",
      "required": ["work_authorization", "explicit_restrictions", "target_audience"],
      "properties": {
        "work_authorization": {
          "type": ["string", "null"],
          "description": "e.g. 'Must have US Citizen or Permanent Resident status', 'Requires STEM OPT'."
        },
        "explicit_restrictions": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Specific negative constraints (e.g. 'No visa sponsorship', 'Candidates enrolled in 2028 or later not eligible')."
        },
        "target_audience": { "type": ["string", "null"] },
        "provenance": { "$ref": "#/definitions/ProvenanceSnippet" }
      }
    },
    "confidence": {
      "type": "object",
      "required": ["overall_score", "field_scores"],
      "properties": {
        "overall_score": { "type": "number", "minimum": 0, "maximum": 1 },
        "field_scores": {
          "type": "object",
          "properties": {
            "opportunity_type": { "type": "number", "minimum": 0, "maximum": 1 },
            "qualifications": { "type": "number", "minimum": 0, "maximum": 1 },
            "skills": { "type": "number", "minimum": 0, "maximum": 1 },
            "location": { "type": "number", "minimum": 0, "maximum": 1 },
            "compensation": { "type": "number", "minimum": 0, "maximum": 1 },
            "timeline": { "type": "number", "minimum": 0, "maximum": 1 }
          }
        }
      }
    },
    "quality": {
      "type": "object",
      "required": ["missing_fields", "unsupported_claims", "extraction_errors", "needs_manual_review"],
      "properties": {
        "missing_fields": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Standard fields absent from the source description."
        },
        "unsupported_claims": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Claims in source text that contradict each other or fail grounding."
        },
        "extraction_errors": {
          "type": "array",
          "items": { "type": "string" }
        },
        "needs_manual_review": { "type": "boolean" },
        "review_reasons": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "definitions": {
    "ProvenanceSnippet": {
      "type": ["object", "null"],
      "properties": {
        "source_snippet": { "type": "string" },
        "char_start": { "type": ["integer", "null"] },
        "char_end": { "type": ["integer", "null"] }
      }
    },
    "SkillItem": {
      "type": "object",
      "required": ["name", "category"],
      "properties": {
        "name": { "type": "string" },
        "category": {
          "type": "string",
          "enum": ["programming_language", "framework", "database", "cloud_devops", "tool", "soft_skill", "domain_knowledge", "other"]
        },
        "source_snippet": { "type": ["string", "null"] }
      }
    }
  }
}
```

---

## 4. Provenance Tracking & Verification

Every critical field category (`opportunity_type`, `qualifications`, `experience`, `location`, `compensation`, `timeline`, `eligibility`) requires a `ProvenanceSnippet`.

### 4.1 Provenance Verification Rule
When an enrichment result is received, the system runs an automated string inclusion check:
```typescript
function verifyProvenance(normalizedText: string, snippet: string): boolean {
  if (!snippet || snippet.trim().length === 0) return true;
  // Case-insensitive substring match
  return normalizedText.toLowerCase().includes(snippet.trim().toLowerCase());
}
```
- If a `source_snippet` cannot be found verbatim in the `normalized_description`, the claim is classified as **UNSUPPORTED** and added to `quality.unsupported_claims`.
- If critical fields (e.g. `compensation` or `timeline.application_deadline`) contain an unverified snippet, `quality.needs_manual_review` is set to `true`.

---

## 5. Confidence, Quality & Manual Review Rules

### 5.1 Scoring Formula
The `overall_score` is computed as a weighted average:
- Opportunity Type: 20%
- Skills Extraction: 25%
- Qualifications & Experience: 20%
- Location & Work Mode: 15%
- Compensation: 10%
- Timeline / Deadline: 10%

### 5.2 Deterministic `needs_manual_review` Triggers
An opportunity must be flagged for human review (`needs_manual_review = true`) if ANY of the following conditions hold:
1. `confidence.overall_score < 0.65`
2. `quality.unsupported_claims.length > 0`
3. Contradictory metadata detected:
   - `basic.role_title` or `opportunity_type.primary_type` contains "intern" or "internship", but `experience.min_experience_months > 24`.
   - `location.work_mode === "remote"` but `location.cities` lists mandatory on-site requirements without hybrid clarification.
4. Parsing errors or unresolvable dates:
   - `timeline.application_deadline` was mentioned relatively (e.g., "apply within 10 days") but no reference anchor could be confirmed.
5. Incoherent compensation:
   - `min_amount > max_amount` or invalid ISO currency code.

---

## 6. Validation Rules & Malformed Output Handling

### 6.1 Strict Validation Lifecycle
1. **Schema Check:** The model output is validated against the JSON schema using a validator (e.g. `ajv` or `Zod`).
2. **Enum Normalization:** Any casing differences in enums are coerced (e.g. `"INTERNSHIP"` $\to$ `"internship"`). Unrecognized enums default to `"unknown"` with a warning added to `quality.extraction_errors`.
3. **Date Validation:**
   - Must be ISO-8601 `YYYY-MM-DD`.
   - Dates in the past (prior to `posted_at`) trigger a review warning.
4. **Null Handling:**
   - If salary is unstated $\to$ `is_paid = null`, `min_amount = null`, `max_amount = null`.
   - Never accept placeholders like `"N/A"`, `"Not specified"`, `"Competitive"`. String representations like `"Competitive"` are stored exclusively in `text_verbatim`.

### 6.2 Failure Recovery & Retries
- **Transient Failures (LLM rate limits, network timeouts, invalid JSON formatting):**
  - Retry with exponential backoff (e.g. 2s, 8s, 30s) up to 3 attempts.
  - If output was invalid JSON, the retry prompt appends the error trace: `"Previous response was malformed JSON: <parse_error>. Please output raw valid JSON only."`
- **Exhausted Retries / Persistent Failure:**
  - Persist an `opportunity_enrichments` row with `status = "failed"` and detailed `error_details`.
  - Mark `needs_manual_review = true`.
  - Ingestion and student active feed are NEVER blocked.

---

## 7. Storage Mapping (Proposal for Chunk 2)

Extracted data maps to an additive table `opportunity_enrichments`:

```sql
CREATE TABLE opportunity_enrichments (
    id VARCHAR(36) PRIMARY KEY,
    opportunity_id VARCHAR(36) NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    
    -- Processing status & telemetry
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | processing | succeeded | failed | needs_review
    extraction_model VARCHAR(50) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL,
    schema_version VARCHAR(20) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ,
    retry_count INT DEFAULT 0,
    error_details JSONB,

    -- Filterable structured columns for indexed querying
    role_title TEXT,
    company TEXT,
    opportunity_type VARCHAR(20),  -- internship | full_time | part_time | contract | unknown
    work_mode VARCHAR(20),         -- remote | hybrid | onsite | unknown
    country VARCHAR(100),
    cities TEXT[],                 -- indexed for location search
    degree_levels TEXT[],          -- ['Bachelors', 'Masters']
    branches TEXT[],               -- ['Computer Science', 'IT']
    graduation_years INT[],        -- [2026, 2027]
    min_cgpa NUMERIC(4,2),
    min_experience_months INT,
    experience_level VARCHAR(20),
    
    -- Fast filterable skill arrays
    required_skills TEXT[],        -- ['Python', 'SQL', 'Docker']
    preferred_skills TEXT[],       -- ['Kubernetes', 'GraphQL']
    inferred_skills TEXT[],        -- ['Distributed Systems']

    -- Compensation & Timeline
    is_paid BOOLEAN,
    currency VARCHAR(10),
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    compensation_interval VARCHAR(20),
    application_deadline TIMESTAMPTZ,

    -- Quality & Confidence
    overall_confidence NUMERIC(3,2),
    needs_manual_review BOOLEAN DEFAULT FALSE,
    missing_fields TEXT[],
    unsupported_claims TEXT[],
    review_reasons TEXT[],

    -- Full payload for complete provenance & rich frontend UI
    raw_extracted_payload JSONB NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_opportunity_enrichment_version UNIQUE (opportunity_id, content_hash, schema_version, prompt_version)
);

-- Targeted indexes for search & student filters
CREATE INDEX idx_enrichment_opp_type ON opportunity_enrichments (opportunity_type);
CREATE INDEX idx_enrichment_work_mode ON opportunity_enrichments (work_mode);
CREATE INDEX idx_enrichment_deadline ON opportunity_enrichments (application_deadline);
CREATE INDEX idx_enrichment_req_skills ON opportunity_enrichments USING GIN (required_skills);
CREATE INDEX idx_enrichment_branches ON opportunity_enrichments USING GIN (branches);
CREATE INDEX idx_enrichment_grad_years ON opportunity_enrichments USING GIN (graduation_years);
CREATE INDEX idx_enrichment_status ON opportunity_enrichments (status, needs_manual_review);
CREATE INDEX idx_enrichment_hash ON opportunity_enrichments (content_hash);
```

---

## 8. Versioning & Reprocessing Triggers

1. **Content Change Trigger:** When an opportunity's description is updated by Phase 1 collector, the computed `content_hash` changes $\to$ triggers new enrichment job.
2. **Schema Upgrade Trigger:** When `SCHEMA_VERSION` increments (e.g. from `1.0.0` to `1.1.0`), all records with the older schema version become eligible for backfill re-processing.
3. **Prompt Improvement Trigger:** When `PROMPT_VERSION` is updated to fix extraction accuracy, a selective or bulk reprocessing job can be scheduled without affecting existing unmodified records.

---

## 9. Worked Examples

### Example 1: Clean, Well-Formed Listing
**Input Description:**
```text
Acme Technologies is hiring a Backend Engineering Intern for Fall 2026.
Location: Bangalore, India (Hybrid: 2 days office, 3 days remote).
Stipend: ₹45,000 per month.
Requirements:
- Currently pursuing B.Tech/B.E. in Computer Science or Information Technology, graduating in 2027.
- Minimum CGPA of 7.5/10.0.
- Mandatory proficiency in Go or Java, and PostgreSQL.
- Experience with Docker is preferred.
- Must be available to start on August 1, 2026 for a 6-month duration.
- Deadline to submit applications is May 30, 2026.
```

**Extracted JSON Output:**
```json
{
  "schema_version": "1.0.0",
  "prompt_version": "2026-11-v1.0.0",
  "basic": {
    "role_title": "Backend Engineering Intern",
    "company": "Acme Technologies",
    "department": null,
    "description_summary": "Backend Engineering Intern position at Acme Technologies focusing on server-side development for Fall 2026."
  },
  "opportunity_type": {
    "primary_type": "internship",
    "provenance": { "source_snippet": "hiring a Backend Engineering Intern for Fall 2026", "char_start": 21, "char_end": 74 }
  },
  "skills": {
    "required_skills": [
      { "name": "Go", "category": "programming_language", "source_snippet": "Mandatory proficiency in Go" },
      { "name": "Java", "category": "programming_language", "source_snippet": "or Java" },
      { "name": "PostgreSQL", "category": "database", "source_snippet": "and PostgreSQL" }
    ],
    "preferred_skills": [
      { "name": "Docker", "category": "cloud_devops", "source_snippet": "Experience with Docker is preferred" }
    ],
    "inferred_skills": [
      { "name": "Backend Architecture", "rationale": "Inferred from backend intern responsibilities" }
    ]
  },
  "qualifications": {
    "degree_levels": ["Bachelors"],
    "branches": ["Computer Science", "Information Technology"],
    "graduation_years": [2027],
    "min_cgpa": 7.5,
    "academic_requirements": "B.Tech/B.E. in CS/IT with min CGPA 7.5",
    "provenance": { "source_snippet": "Currently pursuing B.Tech/B.E. in Computer Science or Information Technology, graduating in 2027. Minimum CGPA of 7.5/10.0.", "char_start": 160, "char_end": 286 }
  },
  "experience": {
    "experience_level": "entry",
    "min_experience_months": 0,
    "max_experience_months": null,
    "provenance": { "source_snippet": "Currently pursuing B.Tech/B.E.", "char_start": 160, "char_end": 190 }
  },
  "location": {
    "work_mode": "hybrid",
    "cities": ["Bangalore"],
    "state_or_region": null,
    "country": "India",
    "is_worldwide": false,
    "provenance": { "source_snippet": "Bangalore, India (Hybrid: 2 days office, 3 days remote)", "char_start": 85, "char_end": 140 }
  },
  "compensation": {
    "is_paid": true,
    "currency": "INR",
    "min_amount": 45000,
    "max_amount": 45000,
    "interval": "monthly",
    "text_verbatim": "₹45,000 per month",
    "provenance": { "source_snippet": "Stipend: ₹45,000 per month.", "char_start": 142, "char_end": 168 }
  },
  "timeline": {
    "application_deadline": "2026-05-30",
    "start_date": "2026-08-01",
    "duration_text": "6 months",
    "provenance": { "source_snippet": "Deadline to submit applications is May 30, 2026", "char_start": 444, "char_end": 491 }
  },
  "eligibility": {
    "work_authorization": null,
    "explicit_restrictions": [],
    "target_audience": "2027 graduates",
    "provenance": null
  },
  "confidence": {
    "overall_score": 0.98,
    "field_scores": {
      "opportunity_type": 1.0,
      "qualifications": 1.0,
      "skills": 0.98,
      "location": 1.0,
      "compensation": 1.0,
      "timeline": 1.0
    }
  },
  "quality": {
    "missing_fields": [],
    "unsupported_claims": [],
    "extraction_errors": [],
    "needs_manual_review": false,
    "review_reasons": []
  }
}
```

---

### Example 2: Vague Startup Posting
**Input Description:**
```text
Hey hackers! Stealth AI startup building autonomous agents looking for sharp minds to join us.
Need someone who lives and breathes Python and LLMs.
Flexible hours, competitive pay, work from anywhere on earth.
Reach out on Telegram or apply below!
```

**Extracted JSON Output:**
```json
{
  "schema_version": "1.0.0",
  "prompt_version": "2026-11-v1.0.0",
  "basic": {
    "role_title": "AI Engineer (Unspecified)",
    "company": "Stealth AI startup",
    "department": null,
    "description_summary": "Early-stage AI startup looking for developers to work on autonomous agents using Python and LLMs."
  },
  "opportunity_type": {
    "primary_type": "unknown",
    "provenance": null
  },
  "skills": {
    "required_skills": [
      { "name": "Python", "category": "programming_language", "source_snippet": "lives and breathes Python" },
      { "name": "Large Language Models", "category": "domain_knowledge", "source_snippet": "and LLMs" }
    ],
    "preferred_skills": [],
    "inferred_skills": [
      { "name": "AI Agents", "rationale": "Stated as building autonomous agents" },
      { "name": "Git", "rationale": "Standard development workflow expected" }
    ]
  },
  "qualifications": {
    "degree_levels": [],
    "branches": [],
    "graduation_years": [],
    "min_cgpa": null,
    "academic_requirements": null,
    "provenance": null
  },
  "experience": {
    "experience_level": "unknown",
    "min_experience_months": null,
    "max_experience_months": null,
    "provenance": null
  },
  "location": {
    "work_mode": "remote",
    "cities": [],
    "state_or_region": null,
    "country": null,
    "is_worldwide": true,
    "provenance": { "source_snippet": "work from anywhere on earth", "char_start": 160, "char_end": 187 }
  },
  "compensation": {
    "is_paid": true,
    "currency": null,
    "min_amount": null,
    "max_amount": null,
    "interval": null,
    "text_verbatim": "competitive pay",
    "provenance": { "source_snippet": "competitive pay", "char_start": 143, "char_end": 158 }
  },
  "timeline": {
    "application_deadline": null,
    "start_date": null,
    "duration_text": null,
    "provenance": null
  },
  "eligibility": {
    "work_authorization": null,
    "explicit_restrictions": [],
    "target_audience": null,
    "provenance": null
  },
  "confidence": {
    "overall_score": 0.58,
    "field_scores": {
      "opportunity_type": 0.3,
      "qualifications": 0.2,
      "skills": 0.85,
      "location": 0.9,
      "compensation": 0.5,
      "timeline": 0.2
    }
  },
  "quality": {
    "missing_fields": [
      "opportunity_type.primary_type",
      "qualifications.degree_levels",
      "qualifications.branches",
      "qualifications.graduation_years",
      "experience.min_experience_months",
      "compensation.min_amount",
      "timeline.application_deadline"
    ],
    "unsupported_claims": [],
    "extraction_errors": [],
    "needs_manual_review": true,
    "review_reasons": [
      "Low overall confidence (0.58 < 0.65 threshold)",
      "Opportunity type could not be determined",
      "Missing compensation numbers despite paid claim",
      "Missing qualifications and eligibility criteria"
    ]
  }
}
```

---

### Example 3: Contradictory & Ambiguous Listing
**Input Description:**
```text
Title: Summer Graduate Student Intern - Robotics
Location: Remote (US Only) - Must be able to commute daily to our Boston headquarters.
Compensation: $35/hr. Unpaid educational internship.
Requirements:
- 5+ years of full-time professional experience in production C++ and ROS.
- Must be a current college sophomore or junior enrolled in an accredited university.
- Must hold an active Top Secret clearance.
```

**Extracted JSON Output:**
```json
{
  "schema_version": "1.0.0",
  "prompt_version": "2026-11-v1.0.0",
  "basic": {
    "role_title": "Summer Graduate Student Intern - Robotics",
    "company": "Robotics Corp",
    "department": null,
    "description_summary": "Summer robotics intern position requiring C++ and ROS with conflicting location, compensation, and experience terms."
  },
  "opportunity_type": {
    "primary_type": "internship",
    "provenance": { "source_snippet": "Summer Graduate Student Intern - Robotics", "char_start": 7, "char_end": 48 }
  },
  "skills": {
    "required_skills": [
      { "name": "C++", "category": "programming_language", "source_snippet": "production C++" },
      { "name": "ROS", "category": "framework", "source_snippet": "and ROS" }
    ],
    "preferred_skills": [],
    "inferred_skills": [
      { "name": "Robotics Software Engineering", "rationale": "Derived from ROS and robotics context" }
    ]
  },
  "qualifications": {
    "degree_levels": ["Bachelors"],
    "branches": [],
    "graduation_years": [],
    "min_cgpa": null,
    "academic_requirements": "Current college sophomore or junior",
    "provenance": { "source_snippet": "Must be a current college sophomore or junior enrolled in an accredited university", "char_start": 218, "char_end": 301 }
  },
  "experience": {
    "experience_level": "senior",
    "min_experience_months": 60,
    "max_experience_months": null,
    "provenance": { "source_snippet": "5+ years of full-time professional experience", "char_start": 139, "char_end": 184 }
  },
  "location": {
    "work_mode": "unknown",
    "cities": ["Boston"],
    "state_or_region": "MA",
    "country": "US",
    "is_worldwide": false,
    "provenance": { "source_snippet": "Remote (US Only) - Must be able to commute daily to our Boston headquarters", "char_start": 59, "char_end": 133 }
  },
  "compensation": {
    "is_paid": null,
    "currency": "USD",
    "min_amount": 35.0,
    "max_amount": 35.0,
    "interval": "hourly",
    "text_verbatim": "$35/hr. Unpaid educational internship.",
    "provenance": { "source_snippet": "Compensation: $35/hr. Unpaid educational internship.", "char_start": 135, "char_end": 187 }
  },
  "timeline": {
    "application_deadline": null,
    "start_date": null,
    "duration_text": "Summer",
    "provenance": { "source_snippet": "Summer Graduate Student Intern", "char_start": 7, "char_end": 37 }
  },
  "eligibility": {
    "work_authorization": "US Only / Top Secret clearance",
    "explicit_restrictions": [
      "Must hold an active Top Secret clearance"
    ],
    "target_audience": "College sophomore or junior",
    "provenance": { "source_snippet": "Must hold an active Top Secret clearance.", "char_start": 303, "char_end": 344 }
  },
  "confidence": {
    "overall_score": 0.45,
    "field_scores": {
      "opportunity_type": 0.8,
      "qualifications": 0.5,
      "skills": 0.9,
      "location": 0.2,
      "compensation": 0.1,
      "timeline": 0.4
    }
  },
  "quality": {
    "missing_fields": [
      "timeline.application_deadline",
      "qualifications.graduation_years"
    ],
    "unsupported_claims": [
      "Contradictory location: Listed as 'Remote' but states 'Must be able to commute daily to Boston headquarters'",
      "Contradictory compensation: Listed as '$35/hr' but also claims 'Unpaid educational internship'",
      "Contradictory experience: Requires '5+ years full-time experience' for a college sophomore/junior student intern"
    ],
    "extraction_errors": [
      "Ambiguous work_mode coerced to 'unknown'",
      "Ambiguous is_paid coerced to null"
    ],
    "needs_manual_review": true,
    "review_reasons": [
      "Severe contradictions in location policy (Remote vs Daily commute)",
      "Severe contradictions in compensation ($35/hr vs Unpaid)",
      "Severe contradiction in seniority (5+ years experience vs sophomore/junior)",
      "Overall confidence (0.45) below critical review threshold (0.65)"
    ]
  }
}
```
