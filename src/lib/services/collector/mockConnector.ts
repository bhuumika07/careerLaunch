import { Connector } from "./connector";

export interface MockRawOpportunity {
  id: string;
  url: string;
  title: string;
  org: string;
  category: string;
  description: string;
  skills: string[];
  eligibility: {
    degrees: string[];
    minCgpa?: number;
    graduationYears: string[];
    experienceLevel: string;
  };
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  deadline: string;
  stipendSalary?: string;
}

export class MockConnector implements Connector {
  private sampleListings: MockRawOpportunity[] = [
    {
      id: "mock_opp_1",
      url: "https://mock-gov-portal.org/internships/ai-engineer",
      title: "AI Systems Engineering Intern",
      org: "National AI Center",
      category: "internships",
      description: "Looking for candidates familiar with React.js, JavaScript, REST APIs, Git, and Python. Applicants should have experience building web applications.",
      skills: ["React", "JavaScript", "REST APIs", "Git", "Python"],
      eligibility: {
        degrees: ["B.Tech", "B.E.", "B.S."],
        minCgpa: 7.5,
        graduationYears: ["2025", "2026", "2027"],
        experienceLevel: "Entry-level",
      },
      location: "Bengaluru, India",
      workMode: "hybrid",
      deadline: "2026-12-31T23:59:59.000Z",
      stipendSalary: "₹45,000 / month",
    },
    {
      id: "mock_opp_2",
      url: "https://mock-research-council.org/grants/quantum-2026",
      title: "Quantum Computing Graduate Researcher",
      org: "Advanced Scientific Research Council",
      category: "research",
      description: "Conduct fundamental research on distributed quantum state simulation. Familiarity with Qiskit, Linear Algebra, and Python required.",
      skills: ["Quantum Computing", "Python", "Mathematics", "Linux"],
      eligibility: {
        degrees: ["M.Tech", "M.S.", "PhD"],
        graduationYears: ["2024", "2025", "2026"],
        experienceLevel: "Entry-level",
      },
      location: "New Delhi, India",
      workMode: "onsite",
      deadline: "2027-01-15T23:59:59.000Z",
      stipendSalary: "₹70,000 / month fellowship",
    },
  ];

  async discover(): Promise<string[]> {
    return this.sampleListings.map((l) => l.id);
  }

  async fetch(listingId: string): Promise<{ rawHtml?: string; rawJson?: any; rawText?: string; sourceUrl: string }> {
    const listing = this.sampleListings.find((l) => l.id === listingId);
    if (!listing) {
      throw new Error(`Listing ${listingId} not found in mock source`);
    }
    return {
      rawJson: listing,
      rawText: `${listing.title}\n${listing.org}\n${listing.description}`,
      sourceUrl: listing.url,
    };
  }
}
