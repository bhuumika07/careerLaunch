// src/lib/services/career-roles/roleRoadmapService.ts
/**
 * Role-Specific Learning Roadmap Service (Phase 5 - Chunk 5.4)
 *
 * Rules:
 * 1. Generates structured, sequenced learning milestones and curriculum mapped directly
 *    to canonical CareerRole required and related competencies.
 * 2. Dynamically evaluates student's confirmed skills:
 *    - Automatically marks milestones completed when student has verified the covered competencies.
 *    - Unlocks subsequent milestones as students progress.
 * 3. Tracks student milestones and persists updates per user.
 * 4. Strictly student-scoped; zero mock data or hallucinated metrics.
 */

import {
  roleCatalogueService,
  RoleCatalogueService,
  normalizeTitleToRole,
  type CareerRoleEntity,
} from "./roleCatalogueService.ts";
import {
  extendedProfileService,
  ExtendedProfileService,
  type StudentSkillDto,
  type CareerInterestDto,
} from "../student/extendedProfileService.ts";
import * as fs from "node:fs";
import * as path from "node:path";

export interface RoadmapResource {
  title: string;
  url: string;
  type: "guide" | "interactive" | "docs" | "exercise";
}

export interface RoadmapProject {
  id: string;
  title: string;
  description: string;
  deliverables: string;
  estimatedHours: number;
  technologies: string[];
}

export interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  order: number;
  skillsCovered: string[];
  objectives: string[];
  resources: RoadmapResource[];
  project: RoadmapProject;
  assessmentQuizId?: string;
  status: "pending" | "ongoing" | "completed";
  completedAt?: string;
  autoCompleted?: boolean;
}

export interface RoadmapRecord {
  id: string;
  userId: string;
  careerRoleId: string;
  careerRoleTitle: string;
  domain: string;
  currentModuleIndex: number;
  progressPercentage: number;
  milestonesCompleted: number;
  totalMilestones: number;
  modules: RoadmapModule[];
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapAdjustmentNotice {
  moduleId: string;
  moduleTitle: string;
  reason: string;
  newStatus: "completed" | "ongoing";
}

export interface AvailableRoadmapRoleDto {
  id: string;
  title: string;
  domain: string;
  isTargeted: boolean;
}

export interface UserRoadmapResponse {
  roadmap: RoadmapRecord | null;
  adjustments: RoadmapAdjustmentNotice[];
  availableRoles: AvailableRoadmapRoleDto[];
}

// -------------------------------------------------------------
// Canonical Curriculum Templates Mapped to Observed Roles
// -------------------------------------------------------------
export const ROLE_ROADMAP_TEMPLATES: Record<
  string,
  {
    roleId: string;
    modules: Omit<RoadmapModule, "status" | "completedAt">[];
  }
> = {
  role_backend_eng: {
    roleId: "role_backend_eng",
    modules: [
      {
        id: "be_mod_1",
        title: "Server Runtimes & RESTful Services",
        description: "Master modern backend execution runtimes, asynchronous I/O architectures, and clean HTTP API contract design.",
        order: 1,
        skillsCovered: ["Node.js", "Python", "REST APIs"],
        objectives: [
          "Implement high-throughput REST APIs with strict schema validation",
          "Handle asynchronous concurrency, error middleware, and streaming responses",
          "Structure modular service layers separating routing, business logic, and data access",
        ],
        resources: [
          { title: "Production Node.js Architecture Guide", url: "https://nodejs.org/docs", type: "docs" },
          { title: "Building Resilient Python APIs", url: "https://fastapi.tiangolo.com", type: "guide" },
        ],
        project: {
          id: "be_proj_1",
          title: "Production REST API Service with Ingestion Webhooks",
          description: "Develop a secure, modular server exposing authenticated endpoints, background queuing, and automated health checks.",
          deliverables: "Git repository with TypeScript / Python API, OpenAPI contract, unit tests, and Dockerfile.",
          estimatedHours: 15,
          technologies: ["Node.js", "Python", "REST APIs"],
        },
      },
      {
        id: "be_mod_2",
        title: "Relational Persistence & Database Modeling",
        description: "Design relational database schemas, write indexed query optimizations, and manage atomic transactions.",
        order: 2,
        skillsCovered: ["SQL", "PostgreSQL"],
        objectives: [
          "Design normalized relational schemas with foreign key integrity and constraints",
          "Profile slow queries using EXPLAIN ANALYZE and composite B-tree indexes",
          "Execute ACID transactions with appropriate isolation levels under concurrency",
        ],
        resources: [
          { title: "PostgreSQL Production Manual", url: "https://www.postgresql.org/docs", type: "docs" },
          { title: "SQL Indexing and Query Tuning", url: "https://use-the-index-luke.com", type: "guide" },
        ],
        project: {
          id: "be_proj_2",
          title: "Multi-Tenant PostgreSQL Data Access Layer",
          description: "Implement a robust database integration with connection pooling, migrations, and performance indexing.",
          deliverables: "SQL migration scripts, database seeders, and benchmark test suite demonstrating query execution plans.",
          estimatedHours: 20,
          technologies: ["SQL", "PostgreSQL"],
        },
      },
      {
        id: "be_mod_3",
        title: "In-Memory Caching & Distributed Job Queues",
        description: "Incorporate Redis caching topologies, cache invalidation protocols, and reliable asynchronous job workers.",
        order: 3,
        skillsCovered: ["Redis"],
        objectives: [
          "Deploy cache-aside and write-through cache patterns with TTL policies",
          "Implement atomic rate limiters and distributed locks via Redis",
          "Process asynchronous background tasks using persistent queues (BullMQ)",
        ],
        resources: [
          { title: "Redis Architecture & Patterns", url: "https://redis.io/docs", type: "docs" },
        ],
        project: {
          id: "be_proj_3",
          title: "Fault-Tolerant Distributed Queue & Caching Layer",
          description: "Build a queue processing pipeline handling retry backoffs, deduplication, and cache invalidation.",
          deliverables: "Worker process implementation, rate limiter middleware, and concurrency stress tests.",
          estimatedHours: 18,
          technologies: ["Redis", "Node.js"],
        },
      },
      {
        id: "be_mod_4",
        title: "Containerization, Cloud Deployment & Resiliency",
        description: "Package services into minimal OCI containers, orchestrate multi-container networks, and setup observability.",
        order: 4,
        skillsCovered: ["Docker", "Go"],
        objectives: [
          "Build multi-stage Docker images optimized for security and fast layer caching",
          "Configure health checks, graceful shutdown signals, and structured JSON logging",
          "Setup CI/CD deployment pipelines testing and building deployable containers",
        ],
        resources: [
          { title: "Docker Best Practices for Production", url: "https://docs.docker.com", type: "docs" },
        ],
        project: {
          id: "be_proj_4",
          title: "Containerized Microservices Cluster with CI/CD",
          description: "Deploy a multi-tier backend application with docker-compose, structured telemetry, and automated tests.",
          deliverables: "Dockerfiles, docker-compose.yml, GitHub Actions workflow, and Prometheus metrics endpoint.",
          estimatedHours: 22,
          technologies: ["Docker", "Go"],
        },
      },
    ],
  },

  role_fullstack_eng: {
    roleId: "role_fullstack_eng",
    modules: [
      {
        id: "fs_mod_1",
        title: "Interactive Client Interfaces & TypeScript",
        description: "Build type-safe, accessible, and reactive component systems using modern React and TypeScript.",
        order: 1,
        skillsCovered: ["TypeScript", "React"],
        objectives: [
          "Master TypeScript generics, discriminated unions, and strict typing",
          "Design composable component hierarchies with robust local state",
          "Implement keyboard accessibility and responsive UX styling",
        ],
        resources: [
          { title: "React Official Documentation", url: "https://react.dev", type: "docs" },
        ],
        project: {
          id: "fs_proj_1",
          title: "Full-Featured Interactive Web Application UI",
          description: "Create an accessible web app interface with real-time feedback, optimistic updates, and clean modular components.",
          deliverables: "Production React application with TypeScript, Tailwind CSS, and unit tests.",
          estimatedHours: 16,
          technologies: ["TypeScript", "React"],
        },
      },
      {
        id: "fs_mod_2",
        title: "Fullstack Server Architecture & Next.js",
        description: "Connect client experiences with server-side rendered routes, API endpoints, and unified state.",
        order: 2,
        skillsCovered: ["Next.js", "Node.js"],
        objectives: [
          "Leverage Server Components, streaming SSR, and Server Actions",
          "Implement session authentication, cookie security, and route protection",
          "Optimize client-server payload boundaries and asset delivery",
        ],
        resources: [
          { title: "Next.js App Router Documentation", url: "https://nextjs.org/docs", type: "docs" },
        ],
        project: {
          id: "fs_proj_2",
          title: "SSR Web Application with End-to-End Type Safety",
          description: "Build a complete Next.js fullstack application with server-rendered dynamic data and authenticated mutations.",
          deliverables: "Next.js project repository with database integration, middleware security, and end-to-end tests.",
          estimatedHours: 20,
          technologies: ["Next.js", "Node.js", "TypeScript"],
        },
      },
      {
        id: "fs_mod_3",
        title: "Relational Persistence & API Integrations",
        description: "Integrate relational databases with ORMs, write migrations, and expose clean GraphQL/REST interfaces.",
        order: 3,
        skillsCovered: ["SQL", "PostgreSQL", "GraphQL"],
        objectives: [
          "Define schema models, relational associations, and transactional workflows",
          "Construct GraphQL / RESTful API queries and mutations",
          "Implement connection pooling, indexing, and data sanitization",
        ],
        resources: [
          { title: "PostgreSQL & ORM Architecture", url: "https://www.postgresql.org/docs", type: "docs" },
        ],
        project: {
          id: "fs_proj_3",
          title: "Database-Driven Collaboration Platform",
          description: "Implement database models, relationship queries, and full GraphQL / REST endpoints.",
          deliverables: "Database schema migrations, seeder scripts, API resolver logic, and query tests.",
          estimatedHours: 18,
          technologies: ["PostgreSQL", "SQL", "GraphQL"],
        },
      },
      {
        id: "fs_mod_4",
        title: "Engineering Collaboration, Testing & Version Control",
        description: "Master Git branching models, automated pull request workflows, and comprehensive test suites.",
        order: 4,
        skillsCovered: ["Git"],
        objectives: [
          "Follow trunk-based development with clean semantic commit histories",
          "Write unit, integration, and end-to-end browser tests",
          "Configure CI automated testing pipelines on every push",
        ],
        resources: [
          { title: "Git Collaborative Workflows", url: "https://git-scm.com/doc", type: "docs" },
        ],
        project: {
          id: "fs_proj_4",
          title: "Continuous Integration & Automated Test Suite",
          description: "Build a full test battery (unit, API, E2E) automated via CI workflows.",
          deliverables: "GitHub Actions workflow YAML, automated test execution reports, and code coverage badges.",
          estimatedHours: 14,
          technologies: ["Git"],
        },
      },
    ],
  },

  role_software_eng: {
    roleId: "role_software_eng",
    modules: [
      {
        id: "swe_mod_1",
        title: "Data Structures & Computational Complexity",
        description: "Master foundational algorithmic complexity, linear and tree data structures, and asymptotic optimization.",
        order: 1,
        skillsCovered: ["Data Structures", "Algorithms"],
        objectives: [
          "Implement trees, graphs, heaps, hash maps, and trie structures from scratch",
          "Analyze time and space complexity using Big-O notation",
          "Solve algorithmic graph traversal and dynamic programming problems",
        ],
        resources: [
          { title: "Algorithms & Complexity Notes", url: "https://en.wikipedia.org/wiki/Analysis_of_algorithms", type: "docs" },
        ],
        project: {
          id: "swe_proj_1",
          title: "High-Performance Data Structure Library",
          description: "Implement a verified data structures library with benchmark test suites proving time complexity.",
          deliverables: "Source code repository with complete unit tests and memory allocation benchmarks.",
          estimatedHours: 18,
          technologies: ["Data Structures", "Algorithms"],
        },
      },
      {
        id: "swe_mod_2",
        title: "Production Systems Programming & Languages",
        description: "Develop robust enterprise systems applying clean object-oriented and functional software architecture.",
        order: 2,
        skillsCovered: ["TypeScript", "Python", "Java", "C++"],
        objectives: [
          "Apply design patterns (Factory, Observer, Strategy, Repository) effectively",
          "Enforce memory safety, thread safety, and resource cleanups",
          "Write modular, testable, and maintainable enterprise software packages",
        ],
        resources: [
          { title: "Software Architecture Patterns", url: "https://refactoring.guru", type: "guide" },
        ],
        project: {
          id: "swe_proj_2",
          title: "Extensible Modular Event Processing Engine",
          description: "Design an extensible system architecture processing streaming events with clean interfaces.",
          deliverables: "Modular library package, interface contracts, and comprehensive unit test suite.",
          estimatedHours: 20,
          technologies: ["TypeScript", "Python"],
        },
      },
      {
        id: "swe_mod_3",
        title: "Code Review, Testing & Git Collaboration",
        description: "Master modern software development lifecycle, code review etiquette, and version control discipline.",
        order: 3,
        skillsCovered: ["Git"],
        objectives: [
          "Manage complex branch rebasing, merge resolutions, and interactive cherry-picks",
          "Conduct thorough code reviews focusing on security, edge cases, and maintainability",
          "Configure automated linting, type-checking, and CI quality gates",
        ],
        resources: [
          { title: "Google Engineering Practices: Code Review", url: "https://google.github.io/eng-practices/", type: "guide" },
        ],
        project: {
          id: "swe_proj_3",
          title: "Multi-Contributor Open Source Feature Pull Request",
          description: "Contribute an end-to-end feature or bug fix with thorough tests and clean Git history.",
          deliverables: "Git branch with atomic commits, comprehensive test coverage, and documentation.",
          estimatedHours: 12,
          technologies: ["Git"],
        },
      },
    ],
  },

  role_ai_ml_eng: {
    roleId: "role_ai_ml_eng",
    modules: [
      {
        id: "aiml_mod_1",
        title: "Mathematical Foundations & Machine Learning",
        description: "Implement supervised and unsupervised machine learning algorithms, model evaluation, and feature engineering.",
        order: 1,
        skillsCovered: ["Python", "Machine Learning"],
        objectives: [
          "Prepare datasets with feature normalization, encoding, and missing value strategies",
          "Train and evaluate linear models, gradient boosted trees, and ensemble classifiers",
          "Prevent overfitting using cross-validation, regularization, and ROC/PR metric curves",
        ],
        resources: [
          { title: "Scikit-Learn Machine Learning Guide", url: "https://scikit-learn.org", type: "docs" },
        ],
        project: {
          id: "aiml_proj_1",
          title: "End-to-End Predictive Modeling Pipeline",
          description: "Train, evaluate, and tune a machine learning model on a real-world tabular dataset.",
          deliverables: "Jupyter notebook / Python script with EDA, feature pipeline, and model validation metrics.",
          estimatedHours: 18,
          technologies: ["Python", "Machine Learning"],
        },
      },
      {
        id: "aiml_mod_2",
        title: "Deep Learning Architectures & PyTorch",
        description: "Design neural networks, convolutional feature extractors, and transformer architectures using PyTorch.",
        order: 2,
        skillsCovered: ["PyTorch", "TensorFlow", "Deep Learning"],
        objectives: [
          "Construct modular neural networks with custom layers and loss functions in PyTorch",
          "Implement training loops with gradient clipping, learning rate schedules, and mixed precision",
          "Fine-tune pre-trained models on specialized domain tasks",
        ],
        resources: [
          { title: "PyTorch Official Tutorials", url: "https://pytorch.org/tutorials", type: "docs" },
        ],
        project: {
          id: "aiml_proj_2",
          title: "Deep Neural Network Classifier / Embeddings Model",
          description: "Train a custom neural architecture with PyTorch featuring checkpointing, TensorBoard logging, and evaluation.",
          deliverables: "Training scripts, model checkpoint files, and evaluation report on held-out test split.",
          estimatedHours: 24,
          technologies: ["PyTorch", "Deep Learning"],
        },
      },
      {
        id: "aiml_mod_3",
        title: "Analytical Data Pipelines & Feature Extraction",
        description: "Extract, transform, and serve analytical training features using relational queries and high-performance tables.",
        order: 3,
        skillsCovered: ["SQL"],
        objectives: [
          "Write analytical SQL queries with window functions, aggregations, and CTEs",
          "Build feature pipelines extracting time-series aggregations for inference",
          "Ensure deterministic feature generation between training and inference environments",
        ],
        resources: [
          { title: "SQL for Machine Learning Engineers", url: "https://mode.com/sql-tutorial", type: "guide" },
        ],
        project: {
          id: "aiml_proj_3",
          title: "Feature Store & Data Extraction Pipeline",
          description: "Build an automated SQL pipeline extracting and validating model input features.",
          deliverables: "SQL transformation queries, data quality validation checks, and feature extraction benchmarks.",
          estimatedHours: 14,
          technologies: ["SQL", "Python"],
        },
      },
    ],
  },
};

function readDbStore(): any {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    }
  } catch (err) {
    console.error("[roleRoadmapService] Failed reading db.json", err);
  }
  return {};
}

function writeDbStore(data: any): void {
  try {
    const dbPath = path.resolve(process.cwd(), "src/data/db.json");
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[roleRoadmapService] Failed writing db.json", err);
  }
}

export class RoleRoadmapService {
  private catalogueSvc: RoleCatalogueService;
  private extProfService: ExtendedProfileService;
  private customDbStore?: any;

  constructor(
    catalogueServiceInstance?: RoleCatalogueService,
    extProfileServiceInstance?: ExtendedProfileService,
    customDbStore?: any
  ) {
    this.catalogueSvc = catalogueServiceInstance || roleCatalogueService;
    this.extProfService = extProfileServiceInstance || extendedProfileService;
    this.customDbStore = customDbStore;
  }

  private getStore(): any {
    if (this.customDbStore) return this.customDbStore;
    return readDbStore();
  }

  private saveStore(data: any): void {
    if (this.customDbStore) return;
    writeDbStore(data);
  }

  /**
   * Generates or retrieves the roadmap for a student, calibrated to their target career role.
   */
  async getUserRoadmap(
    userId: string,
    targetRoleIdOrTitle?: string | null
  ): Promise<UserRoadmapResponse> {
    if (!userId) {
      throw new Error("Student userId is required to retrieve roadmap.");
    }

    const catalogue = await this.catalogueSvc.getCatalogue();
    let interests: CareerInterestDto[] = [];
    let studentSkills: StudentSkillDto[] = [];

    try {
      interests = await this.extProfService.getCareerInterests(userId);
    } catch {
      interests = [];
    }

    try {
      studentSkills = await this.extProfService.getStudentSkills(userId);
    } catch {
      studentSkills = [];
    }

    // STRICT INVARIANT: Only confirmed/verified skills count toward automated milestone completion
    const confirmedSkills = studentSkills.filter(
      (s) => s.confirmed === true || s.reviewStatus === "CONFIRMED"
    );
    const confirmedSkillNames = new Set(
      confirmedSkills.map((s) => s.name.toLowerCase().trim())
    );

    // Resolve target role
    let targetRole: CareerRoleEntity | undefined;

    if (targetRoleIdOrTitle && targetRoleIdOrTitle.trim()) {
      targetRole = catalogue.find(
        (r) =>
          r.id === targetRoleIdOrTitle ||
          r.canonicalName.toLowerCase() === targetRoleIdOrTitle.toLowerCase()
      );
      if (!targetRole) {
        const norm = normalizeTitleToRole(targetRoleIdOrTitle, catalogue);
        if (norm.roleId) {
          targetRole = catalogue.find((r) => r.id === norm.roleId);
        }
      }
    }

    // Fallback: Use student's top target role
    // INVARIANT: Never invent arbitrary default roles when the student has not selected or targeted any.
    if (!targetRole && interests.length > 0) {
      const topInterest = interests[0];
      const norm = normalizeTitleToRole(topInterest.targetRole, catalogue);
      if (norm.roleId) {
        targetRole = catalogue.find((r) => r.id === norm.roleId);
      } else {
        targetRole = catalogue.find(
          (r) => r.canonicalName.toLowerCase() === topInterest.targetRole.toLowerCase()
        );
      }
    }

    if (!targetRole) {
      const availableRoles: AvailableRoadmapRoleDto[] = catalogue
        .filter((r) => r.isActive && (ROLE_ROADMAP_TEMPLATES[r.id] || r.id === "role_backend_eng"))
        .map((r) => ({
          id: r.id,
          title: r.canonicalName,
          domain: r.domain,
          isTargeted: interests.some((ci) => {
            const norm = normalizeTitleToRole(ci.targetRole, catalogue);
            return norm.roleId === r.id || ci.targetRole.toLowerCase() === r.canonicalName.toLowerCase();
          }),
        }));

      return {
        roadmap: null,
        adjustments: [],
        availableRoles,
      };
    }

    const roleId = targetRole.id;
    const template = ROLE_ROADMAP_TEMPLATES[roleId] || ROLE_ROADMAP_TEMPLATES.role_backend_eng;

    // Load or initialize user roadmap record from local dbStore
    const db = this.getStore();
    db.roadmaps = db.roadmaps || [];

    let existingRecord = db.roadmaps.find(
      (r: any) => r.userId === userId && r.careerRoleId === roleId
    );

    const nowIso = new Date().toISOString();

    if (!existingRecord) {
      // Build fresh modules list from template
      const initialModules: RoadmapModule[] = template.modules.map((m, idx) => ({
        ...m,
        status: idx === 0 ? "ongoing" : "pending",
      }));

      existingRecord = {
        id: `rdmp_${userId}_${roleId}`,
        userId,
        careerRoleId: roleId,
        careerRoleTitle: targetRole.canonicalName,
        domain: targetRole.domain,
        currentModuleIndex: 0,
        progressPercentage: 0,
        milestonesCompleted: 0,
        totalMilestones: initialModules.length,
        modules: initialModules,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.roadmaps.push(existingRecord);
      this.saveStore(db);
    }

    // Dynamic adjustment based on student's verified skills
    const adjustments: RoadmapAdjustmentNotice[] = [];
    let modified = false;

    // Helper to check if a skill is confirmed
    const isSkillConfirmed = (skillName: string): boolean => {
      const lower = skillName.toLowerCase().trim();
      const baseLower = lower.replace(/\.js$/, "");
      return Array.from(confirmedSkillNames).some(
        (cs) => cs === lower || cs.replace(/\.js$/, "") === baseLower
      );
    };

    existingRecord.modules.forEach((mod: RoadmapModule) => {
      // Check if all covered skills are confirmed in student profile
      const allSkillsConfirmed =
        mod.skillsCovered.length > 0 &&
        mod.skillsCovered.every((skill) => isSkillConfirmed(skill));

      if (allSkillsConfirmed && mod.status !== "completed") {
        mod.status = "completed";
        mod.completedAt = mod.completedAt || nowIso;
        mod.autoCompleted = true;
        adjustments.push({
          moduleId: mod.id,
          moduleTitle: mod.title,
          reason: `All covered competencies (${mod.skillsCovered.join(", ")}) confirmed in student profile.`,
          newStatus: "completed",
        });
        modified = true;
      }
    });

    // Ensure the first non-completed module is marked "ongoing" instead of "pending"
    let ongoingFound = false;
    existingRecord.modules.forEach((mod: RoadmapModule) => {
      if (mod.status === "completed") return;
      if (!ongoingFound) {
        if (mod.status === "pending") {
          mod.status = "ongoing";
          modified = true;
        }
        ongoingFound = true;
      }
    });

    // Recompute milestone stats
    const completedCount = existingRecord.modules.filter(
      (m: RoadmapModule) => m.status === "completed"
    ).length;
    existingRecord.milestonesCompleted = completedCount;
    existingRecord.totalMilestones = existingRecord.modules.length;
    existingRecord.progressPercentage =
      existingRecord.totalMilestones > 0
        ? Math.round((completedCount / existingRecord.totalMilestones) * 100)
        : 0;
    existingRecord.currentModuleIndex = existingRecord.modules.findIndex(
      (m: RoadmapModule) => m.status !== "completed"
    );
    if (existingRecord.currentModuleIndex === -1) {
      existingRecord.currentModuleIndex = existingRecord.modules.length - 1;
    }

    if (modified) {
      existingRecord.updatedAt = nowIso;
      this.saveStore(db);
    }

    // Build available target roles list for selector
    const availableRoles: AvailableRoadmapRoleDto[] = catalogue
      .filter((r) => r.isActive && (ROLE_ROADMAP_TEMPLATES[r.id] || r.id === "role_backend_eng"))
      .map((r) => ({
        id: r.id,
        title: r.canonicalName,
        domain: r.domain,
        isTargeted: interests.some((ci) => {
          const norm = normalizeTitleToRole(ci.targetRole, catalogue);
          return norm.roleId === r.id || ci.targetRole.toLowerCase() === r.canonicalName.toLowerCase();
        }),
      }));

    return {
      roadmap: existingRecord,
      adjustments,
      availableRoles,
    };
  }

  /**
   * Updates a module's progress status (pending | ongoing | completed).
   */
  async updateModuleStatus(
    userId: string,
    moduleId: string,
    status: "pending" | "ongoing" | "completed"
  ): Promise<{ roadmap: RoadmapRecord; completedProject?: RoadmapProject | null }> {
    if (!userId || !moduleId) {
      throw new Error("userId and moduleId are required.");
    }

    const db = this.getStore();
    db.roadmaps = db.roadmaps || [];

    const roadmap = db.roadmaps.find((r: any) =>
      r.userId === userId && r.modules.some((m: any) => m.id === moduleId)
    );

    if (!roadmap) {
      throw new Error(`Roadmap containing module '${moduleId}' not found for user.`);
    }

    const mod = roadmap.modules.find((m: any) => m.id === moduleId);
    if (!mod) {
      throw new Error(`Module '${moduleId}' not found in roadmap.`);
    }

    mod.status = status;
    const nowIso = new Date().toISOString();

    let completedProject: RoadmapProject | null = null;
    if (status === "completed") {
      mod.completedAt = mod.completedAt || nowIso;
      completedProject = mod.project;
    }

    const completedCount = roadmap.modules.filter((m: any) => m.status === "completed").length;
    roadmap.milestonesCompleted = completedCount;
    roadmap.progressPercentage = Math.round((completedCount / roadmap.modules.length) * 100);
    roadmap.updatedAt = nowIso;

    this.saveStore(db);

    return {
      roadmap,
      completedProject,
    };
  }
}

export const roleRoadmapService = new RoleRoadmapService();
