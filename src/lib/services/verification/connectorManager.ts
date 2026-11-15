// src/lib/services/verification/connectorManager.ts
import type { OpportunityAvailabilityChecker } from "./checker.ts";
import { GreenhouseAvailabilityChecker } from "./greenhouseChecker.ts";
import type { SourceConfig, SourceListingInfo, VerificationResult } from "./types.ts";

export interface SourceValidationResult {
  isEligible: boolean;
  reason?: string;
}

/**
 * Connector Manager
 *
 * Coordinates availability checkers for external job boards.
 * Ensures only authorized and compliant sources are polled.
 */
export class ConnectorManager {
  private checkers = new Map<string, OpportunityAvailabilityChecker>();

  constructor() {
    // Register default built-in checkers
    this.registerChecker("greenhouse", new GreenhouseAvailabilityChecker());
  }

  /**
   * Registers or overrides a checker for a provider key.
   */
  registerChecker(provider: string, checker: OpportunityAvailabilityChecker): void {
    this.checkers.set(provider.toLowerCase(), checker);
  }

  /**
   * Resolves provider name from source config.
   */
  resolveProvider(sourceConfig: SourceConfig): string {
    if (sourceConfig.config?.provider) {
      return String(sourceConfig.config.provider).toLowerCase();
    }
    const nameLower = (sourceConfig.name || "").toLowerCase();
    if (nameLower.includes("greenhouse")) {
      return "greenhouse";
    }
    if (nameLower.includes("lever")) {
      return "lever";
    }
    if (nameLower.includes("ashby")) {
      return "ashby";
    }
    const urlLower = (sourceConfig.baseUrl || "").toLowerCase();
    if (urlLower.includes("greenhouse.io")) {
      return "greenhouse";
    }
    if (urlLower.includes("lever.co")) {
      return "lever";
    }
    if (urlLower.includes("ashbyhq.com")) {
      return "ashby";
    }

    return "unknown";
  }

  /**
   * Validates whether a source is approved and eligible for automated verification.
   */
  validateSourceEligibility(sourceConfig: SourceConfig): SourceValidationResult {
    const config = sourceConfig.config || {};
    const status = config.status || (sourceConfig as any).status;
    const compliance = config.complianceStatus || (sourceConfig as any).complianceStatus;

    if (status === "disabled" || status === "paused") {
      return {
        isEligible: false,
        reason: `Source "${sourceConfig.name}" is ${status}`,
      };
    }

    if (compliance === "blocked" || compliance === "restricted") {
      return {
        isEligible: false,
        reason: `Source "${sourceConfig.name}" has compliance status "${compliance}"`,
      };
    }

    const provider = this.resolveProvider(sourceConfig);
    if (!this.checkers.has(provider)) {
      return {
        isEligible: false,
        reason: `No checker registered for provider "${provider}" on source "${sourceConfig.name}"`,
      };
    }

    return { isEligible: true };
  }

  /**
   * Executes availability check using the resolved checker.
   */
  async checkAvailability(
    listing: SourceListingInfo,
    sourceConfig: SourceConfig
  ): Promise<VerificationResult> {
    const provider = this.resolveProvider(sourceConfig);
    const checker = this.checkers.get(provider);

    if (!checker) {
      return {
        outcome: "UNKNOWN",
        checkedAt: new Date(),
        reason: `No availability checker found for provider "${provider}"`,
      };
    }

    return await checker.checkAvailability(listing, sourceConfig);
  }
}
