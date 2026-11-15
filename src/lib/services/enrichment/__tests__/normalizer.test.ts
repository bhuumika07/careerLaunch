// src/lib/services/enrichment/__tests__/normalizer.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeDescription,
  computeContentHash,
  processDescription,
  decodeHtmlEntities,
} from "../normalizer.ts";

describe("Module 3.1: Description Normalization Engine", () => {
  describe("Basic Normalization & Whitespace Handling", () => {
    it("handles null, undefined, and empty string gracefully", () => {
      assert.equal(normalizeDescription(null), "");
      assert.equal(normalizeDescription(undefined), "");
      assert.equal(normalizeDescription(""), "");

      const res = processDescription(null);
      assert.equal(res.normalizedText, "");
      assert.equal(res.charCount, 0);
      assert.equal(res.wordCount, 0);
      assert.equal(typeof res.contentHash, "string");
      assert.equal(res.contentHash.length, 64);
    });

    it("trims whitespace-only input to empty string", () => {
      const whitespaceInput = "   \t\n\r\n   \u00A0  ";
      assert.equal(normalizeDescription(whitespaceInput), "");
      const res = processDescription(whitespaceInput);
      assert.equal(res.normalizedText, "");
      assert.equal(res.charCount, 0);
      assert.equal(res.wordCount, 0);
    });

    it("normalizes clean plain text without altering characters", () => {
      const plainText = "Software Engineering Intern\nBangalore, India\nRequirements: Python, SQL";
      const normalized = normalizeDescription(plainText);
      assert.equal(normalized, plainText);
      assert.equal(processDescription(plainText).wordCount, 8);
    });

    it("collapses runs of horizontal spaces and excessive line breaks", () => {
      const messyInput = "Role:   Backend     Developer\n\n\n\n\nLocation:    Remote\n\n\nStipend: $2000";
      const expected = "Role: Backend Developer\n\nLocation: Remote\n\nStipend: $2000";
      assert.equal(normalizeDescription(messyInput), expected);
    });
  });

  describe("HTML Stripping & Structural Preservation", () => {
    it("removes script, style, noscript, nav, and comment blocks completely", () => {
      const htmlInput = `
        <!-- Comment to be removed -->
        <script>console.log("malicious code");</script>
        <style>body { color: red; }</style>
        <nav><a href="/home">Home</a></nav>
        <h1>Job Description</h1>
        <p>We are hiring an AI Researcher.</p>
        <footer>Privacy Policy & Terms</footer>
      `;

      const normalized = normalizeDescription(htmlInput);

      assert.doesNotMatch(normalized, /console\.log/);
      assert.doesNotMatch(normalized, /color: red/);
      assert.doesNotMatch(normalized, /Home/);
      assert.doesNotMatch(normalized, /Privacy Policy/);
      assert.match(normalized, /Job Description/);
      assert.match(normalized, /We are hiring an AI Researcher\./);
    });

    it("preserves headings and converts list elements to bullet points", () => {
      const htmlList = `
        <h2>Requirements</h2>
        <ul>
          <li>Proficiency in Go or Rust</li>
          <li>Knowledge of Docker &amp; Kubernetes</li>
          <li>3+ years of experience</li>
        </ul>
      `;

      const normalized = normalizeDescription(htmlList);

      assert.match(normalized, /Requirements/);
      assert.match(normalized, /• Proficiency in Go or Rust/);
      assert.match(normalized, /• Knowledge of Docker & Kubernetes/);
      assert.match(normalized, /• 3\+ years of experience/);
    });

    it("correctly decodes named and numeric HTML entities", () => {
      const input = "Stipend: &euro;3,000 &plusmn; &amp; &pound;2,500 &#8377;50,000 &quot;Quote&quot; &#x27;Apos&#x27;";
      const normalized = normalizeDescription(input);
      assert.match(normalized, /€3,000/);
      assert.match(normalized, /&/);
      assert.match(normalized, /£2,500/);
      assert.match(normalized, /₹50,000/);
      assert.match(normalized, /"Quote"/);
      assert.match(normalized, /'Apos'/);
    });
  });

  describe("Unicode & Multilingual Robustness", () => {
    it("preserves international text and applies Unicode NFC normalization", () => {
      const japanese = "ソフトウェアエンジニアインターン (Software Engineer Intern)";
      const hindi = "सॉफ्टवेयर इंजीनियरिंग इंटर्नशिप - बेंगलुरु";
      const accented = "Développeur Full Stack chez Société Générale (café / résumé)";

      assert.equal(normalizeDescription(japanese), japanese);
      assert.equal(normalizeDescription(hindi), hindi);
      assert.equal(normalizeDescription(accented), accented);

      // NFC normalization test: decomposed vs composed characters
      const decomposed = "e\u0301"; // 'e' + combining acute accent
      const composed = "é"; // single composed character
      assert.equal(normalizeDescription(decomposed), composed);
      assert.equal(computeContentHash(normalizeDescription(decomposed)), computeContentHash(normalizeDescription(composed)));
    });
  });

  describe("Markup Invariance vs Material Content Differentiation", () => {
    it("produces identical content_hash for same semantic content with different HTML markup", () => {
      const versionA = `
        <div class="job-container">
          <h1>Frontend Developer Intern</h1>
          <p>Location: <strong>Remote</strong></p>
          <div class="reqs">
            <h3>Requirements:</h3>
            <ul>
              <li>React 18</li>
              <li>TypeScript</li>
            </ul>
          </div>
        </div>
      `;

      const versionB = `
        <section>
          <h2>Frontend Developer Intern</h2>
          <p>Location: <b>Remote</b></p>
          <p>Requirements:</p>
          <li>React 18</li>
          <li>TypeScript</li>
        </section>
      `;

      const normA = normalizeDescription(versionA);
      const normB = normalizeDescription(versionB);

      const hashA = computeContentHash(normA);
      const hashB = computeContentHash(normB);

      // Both versions communicate the identical role, location, and requirements
      assert.equal(normA, normB);
      assert.equal(hashA, hashB);
    });

    it("produces different content_hash when content is materially modified", () => {
      const originalText = `
        Backend Engineer Intern
        Location: Bangalore, India
        Requirements:
        • Python
        • PostgreSQL
        Stipend: ₹40,000/month
      `;

      const changedSalary = `
        Backend Engineer Intern
        Location: Bangalore, India
        Requirements:
        • Python
        • PostgreSQL
        Stipend: ₹60,000/month
      `;

      const changedSkill = `
        Backend Engineer Intern
        Location: Bangalore, India
        Requirements:
        • Python
        • MongoDB
        Stipend: ₹40,000/month
      `;

      const hashOriginal = computeContentHash(normalizeDescription(originalText));
      const hashSalary = computeContentHash(normalizeDescription(changedSalary));
      const hashSkill = computeContentHash(normalizeDescription(changedSkill));

      assert.notEqual(hashOriginal, hashSalary);
      assert.notEqual(hashOriginal, hashSkill);
      assert.notEqual(hashSalary, hashSkill);
    });
  });
});
