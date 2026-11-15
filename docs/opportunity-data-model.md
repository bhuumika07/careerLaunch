# Opportunity Data Model

This document describes the database schema for the Opportunity Engine.

```mermaid
erDiagram
    Source {
        String id PK "UUID"
        String name
        String baseUrl
        SourceCategory category
        CollectionMethod collectionMethod
        Json config
        ComplianceStatus complianceStatus
        String? complianceNotes
        String? termsUrl
        DateTime? robotsCheckedAt
        Int collectionFrequency
        Int reliabilityScore
        SourceStatus status
        DateTime? lastSuccessAt
        DateTime? lastFailureAt
    }
    RawListing {
        String id PK
        String sourceId FK
        String sourceUrl UQ
        String? externalId
        String? rawHtml
        Json? rawJson
        String? rawText
        String contentHash
        DateTime fetchedAt
        Int httpStatus
        ProcessingStatus processingStatus
    }
    Opportunity {
        String id PK
        String title
        SourceCategory category
        String organizationName
        String? description
        String? responsibilities
        String[] requiredSkills
        String[] preferredSkills
        Json? skillsExplicitOrInferred
        Json eligibility
        String? locationCountry
        String? locationState
        String? locationCity
        WorkMode workMode
        Json? compensation
        DateTime? applicationDeadline
        DateTime? postedAt
        String sourceId FK
        String sourceUrl
        String? originalText
        String? applicationUrl
        VerificationStatus verificationStatus
        LifecycleStatus lifecycleStatus
        DateTime firstSeenAt
        DateTime? lastCheckedAt
        DateTime? lastChangedAt
        String[] missingFields
        Float? extractionConfidence
        String? canonicalOpportunityId
    }
    OpportunitySource {
        String opportunityId FK PK
        String sourceId FK PK
        String sourceUrl PK
        DateTime seenAt
    }
    OpportunityChange {
        String id PK
        String opportunityId FK
        String field
        String? oldValue
        String? newValue
        DateTime detectedAt
    }
    CollectionRun {
        String id PK
        String sourceId FK
        DateTime startedAt
        DateTime? endedAt
        SourceStatus status
        Int listingsFound
        Int newCount
        Int updatedCount
        Int failedCount
        String? errorSummary
    }
    Skill {
        String id PK
        String canonicalName
        String type
        String? category
    }
    SkillAlias {
        String id PK
        String skillId FK
        String alias
    }
    Source ||--o{ RawListing : "has"
    Source ||--o{ CollectionRun : "runs"
    Source ||--o{ OpportunitySource : "links"
    RawListing ||--o{ OpportunitySource : "links"
    Opportunity ||--o{ OpportunitySource : "has"
    Opportunity ||--o{ OpportunityChange : "changes"
    Skill ||--o{ SkillAlias : "aliases"
```

*All enums are defined in `prisma/schema.prisma`. The full schema file lives alongside this diagram.*