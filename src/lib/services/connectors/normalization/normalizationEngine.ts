// src/lib/services/connectors/normalization/normalizationEngine.ts
/**
 * Chunk 5: Comprehensive Normalization Engine
 *
 * Implements strict, deterministic normalization for:
 * 1. Job Titles (standard roles, seniority, specializations)
 * 2. Locations (Indian cities/states, global metros, remote/hybrid flags)
 * 3. Experience Levels (fresher, entry, mid, senior, with min/max years)
 * 4. Employment Types (full_time, internship, part_time, contract)
 * 5. Dates (consistent UTC ISO-8601 formatting)
 */

export interface NormalizedTitle {
  rawTitle: string;
  canonicalTitle: string;
  seniority: "fresher" | "entry" | "mid" | "senior" | "lead" | "executive";
  domain: string;
  specialization?: string;
}

export interface NormalizedLocation {
  rawLocation: string;
  city?: string;
  state?: string;
  country: string;
  workMode: "remote" | "hybrid" | "onsite" | "unspecified";
  isRemote: boolean;
  formattedLocation: string;
}

export interface NormalizedExperience {
  rawText?: string;
  level: "fresher" | "entry" | "mid" | "senior";
  minYears: number;
  maxYears?: number;
  isFresherFriendly: boolean;
}

export type NormalizedEmploymentType =
  | "job"
  | "internship"
  | "fellowship"
  | "research"
  | "contract"
  | "part_time";

// Indian City & State Mapping Table
const INDIAN_CITIES_MAP: Record<string, { city: string; state: string }> = {
  bengaluru: { city: "Bengaluru", state: "Karnataka" },
  bangalore: { city: "Bengaluru", state: "Karnataka" },
  blr: { city: "Bengaluru", state: "Karnataka" },
  hyderabad: { city: "Hyderabad", state: "Telangana" },
  hyd: { city: "Hyderabad", state: "Telangana" },
  pune: { city: "Pune", state: "Maharashtra" },
  gurugram: { city: "Gurugram", state: "Haryana" },
  gurgaon: { city: "Gurugram", state: "Haryana" },
  noida: { city: "Noida", state: "Uttar Pradesh" },
  mumbai: { city: "Mumbai", state: "Maharashtra" },
  bombay: { city: "Mumbai", state: "Maharashtra" },
  chennai: { city: "Chennai", state: "Tamil Nadu" },
  madras: { city: "Chennai", state: "Tamil Nadu" },
  delhi: { city: "New Delhi", state: "Delhi" },
  "new delhi": { city: "New Delhi", state: "Delhi" },
  ncr: { city: "New Delhi", state: "Delhi" },
  kolkata: { city: "Kolkata", state: "West Bengal" },
  calcutta: { city: "Kolkata", state: "West Bengal" },
  ahmedabad: { city: "Ahmedabad", state: "Gujarat" },
  kochi: { city: "Kochi", state: "Kerala" },
  cochin: { city: "Kochi", state: "Kerala" },
  thiruvananthapuram: { city: "Thiruvananthapuram", state: "Kerala" },
  trivandrum: { city: "Thiruvananthapuram", state: "Kerala" },
  chandigarh: { city: "Chandigarh", state: "Punjab/Haryana" },
  jaipur: { city: "Jaipur", state: "Rajasthan" },
  indore: { city: "Indore", state: "Madhya Pradesh" },
  bhubaneswar: { city: "Bhubaneswar", state: "Odisha" },
  coimbatore: { city: "Coimbatore", state: "Tamil Nadu" },
};

// Global Metro Mapping Table
const GLOBAL_CITIES_MAP: Record<string, { city: string; state?: string; country: string }> = {
  "san francisco": { city: "San Francisco", state: "California", country: "United States" },
  sf: { city: "San Francisco", state: "California", country: "United States" },
  "new york": { city: "New York", state: "New York", country: "United States" },
  nyc: { city: "New York", state: "New York", country: "United States" },
  austin: { city: "Austin", state: "Texas", country: "United States" },
  seattle: { city: "Seattle", state: "Washington", country: "United States" },
  london: { city: "London", country: "United Kingdom" },
  toronto: { city: "Toronto", state: "Ontario", country: "Canada" },
  berlin: { city: "Berlin", country: "Germany" },
  singapore: { city: "Singapore", country: "Singapore" },
  dublin: { city: "Dublin", country: "Ireland" },
  sydney: { city: "Sydney", country: "Australia" },
};

/**
 * 1. Title Normalization
 */
export function normalizeTitle(rawTitle: string): NormalizedTitle {
  const clean = rawTitle.trim();
  const lower = clean.toLowerCase();

  // Determine Seniority
  let seniority: NormalizedTitle["seniority"] = "mid";
  if (/\bintern(?:ship)?\b|\bco-op\b|\bstudent\b|\bapprentice\b/i.test(lower)) {
    seniority = "fresher";
  } else if (/\bsenior\b|\bsr\.?\b/i.test(lower)) {
    seniority = "senior";
  } else if (/\blead\b|\bprincipal\b|\bstaff\b|\bhead\b|\bmanager\b/i.test(lower)) {
    seniority = "lead";
  } else if (/\bdirector\b|\bvp\b|\bexecutive\b|\bchief\b/i.test(lower)) {
    seniority = "executive";
  } else if (
    /\bjunior\b|\bjr\.?\b|\bassociate\b|\bgraduate\b|\bnew grad\b|\bfresher\b|\bentry\b/i.test(lower) ||
    /\b(?:sde|swe|engineer|developer)\s*(?:1|i)\b/i.test(lower)
  ) {
    seniority = "entry";
  }

  // Determine Domain
  let domain = "Engineering";
  if (/\bdesign(?:er)?\b|\bui\b|\bux\b|\bproduct design\b/i.test(lower)) {
    domain = "Design";
  } else if (/\bdata\b|\banalyst\b|\banalytics\b|\bbi\b/i.test(lower)) {
    domain = "Data";
  } else if (/\bmachine learning\b|\bml\b|\bai\b|\bdeep learning\b/i.test(lower)) {
    domain = "Artificial Intelligence";
  } else if (/\bproduct manager\b|\bpm\b/i.test(lower)) {
    domain = "Product Management";
  } else if (/\bsecurity\b|\bcyber\b|\bsecops\b/i.test(lower)) {
    domain = "Security";
  } else if (/\bdevops\b|\bsre\b|\binfrastructure\b|\bcloud\b/i.test(lower)) {
    domain = "DevOps & Cloud";
  }

  // Determine Canonical Title
  let canonicalTitle = clean;
  if (/software\s*dev(?:elopment)?\s*eng(?:ineer)?|sde\s*[1-3i]+|swe\b/i.test(lower)) {
    canonicalTitle = "Software Engineer";
  } else if (/frontend\s*(?:software)?\s*eng(?:ineer)?/i.test(lower)) {
    canonicalTitle = "Frontend Engineer";
  } else if (/backend\s*(?:software)?\s*eng(?:ineer)?/i.test(lower)) {
    canonicalTitle = "Backend Engineer";
  } else if (/full\s*stack\s*(?:software)?\s*eng(?:ineer)?/i.test(lower)) {
    canonicalTitle = "Fullstack Engineer";
  } else if (/data\s*eng(?:ineer)?/i.test(lower)) {
    canonicalTitle = "Data Engineer";
  } else if (/machine\s*learning\s*eng(?:ineer)?|ml\s*eng(?:ineer)?/i.test(lower)) {
    canonicalTitle = "Machine Learning Engineer";
  } else if (seniority === "fresher" && /intern/i.test(lower)) {
    if (/data/i.test(lower)) canonicalTitle = "Data Engineer Intern";
    else if (/design/i.test(lower)) canonicalTitle = "Product Design Intern";
    else canonicalTitle = "Software Engineer Intern";
  }

  return {
    rawTitle: clean,
    canonicalTitle,
    seniority,
    domain,
  };
}

/**
 * 2. Location Normalization
 */
export function normalizeLocation(rawLocation: string | null | undefined, description: string = ""): NormalizedLocation {
  const raw = (rawLocation || "Remote").trim();
  const combined = `${raw} ${description}`.toLowerCase();

  // 1. Work Mode detection
  let workMode: NormalizedLocation["workMode"] = "onsite";
  if (combined.includes("hybrid")) {
    workMode = "hybrid";
  } else if (
    combined.includes("remote") ||
    /work from home|\bwfh\b|\banywhere\b/i.test(combined) ||
    raw.toLowerCase() === "remote"
  ) {
    workMode = "remote";
  }

  const isRemote = workMode === "remote";

  // 2. City & Region resolution
  let detectedCity: string | undefined;
  let detectedState: string | undefined;
  let detectedCountry = "Global";

  // Check Indian Cities
  for (const [key, val] of Object.entries(INDIAN_CITIES_MAP)) {
    const pattern = new RegExp(`\\b${key}\\b`, "i");
    if (pattern.test(raw) || pattern.test(combined)) {
      detectedCity = val.city;
      detectedState = val.state;
      detectedCountry = "India";
      break;
    }
  }

  // If not Indian city, check Global Cities
  if (!detectedCity) {
    for (const [key, val] of Object.entries(GLOBAL_CITIES_MAP)) {
      const pattern = new RegExp(`\\b${key}\\b`, "i");
      if (pattern.test(raw)) {
        detectedCity = val.city;
        detectedState = val.state;
        detectedCountry = val.country;
        break;
      }
    }
  }

  // Country fallback if explicit in raw string
  if (detectedCountry === "Global") {
    if (/\bindia\b/i.test(raw)) detectedCountry = "India";
    else if (/\bunited states\b|\busa?\b/i.test(raw)) detectedCountry = "United States";
    else if (/\buk\b|\bunited kingdom\b/i.test(raw)) detectedCountry = "United Kingdom";
  }

  // Format clean human-readable location string
  let formattedLocation = detectedCity || "";
  if (detectedCity && detectedState) {
    formattedLocation = `${detectedCity}, ${detectedState}`;
  }
  if (detectedCountry && detectedCountry !== "Global") {
    formattedLocation = formattedLocation ? `${formattedLocation}, ${detectedCountry}` : detectedCountry;
  }
  if (!formattedLocation) {
    formattedLocation = isRemote ? "Remote" : raw;
  }
  if (isRemote && !formattedLocation.toLowerCase().includes("remote")) {
    formattedLocation = `${formattedLocation} (Remote)`;
  }

  return {
    rawLocation: raw,
    city: detectedCity,
    state: detectedState,
    country: detectedCountry,
    workMode,
    isRemote,
    formattedLocation,
  };
}

/**
 * 3. Experience Level Normalization
 */
export function normalizeExperience(title: string, description: string = ""): NormalizedExperience {
  const combined = `${title} ${description}`.toLowerCase();

  // Pattern checks
  if (/\bintern(?:ship)?\b|\bco-op\b|\bstudent\b|\bcollege grad\b/i.test(title)) {
    return {
      rawText: "Intern / Student",
      level: "fresher",
      minYears: 0,
      maxYears: 1,
      isFresherFriendly: true,
    };
  }

  // Check explicit year patterns like "0-1 years", "0 - 2 years", "fresher"
  const zeroYearsMatch = combined.match(/\b(0\s*-\s*[12]|0)\s*(?:years?|yrs?)\b|\bfresher\b/i);
  if (zeroYearsMatch) {
    return {
      rawText: zeroYearsMatch[0],
      level: "fresher",
      minYears: 0,
      maxYears: 1,
      isFresherFriendly: true,
    };
  }

  // Check entry range "1-3 years"
  const entryMatch = combined.match(/\b([12]\s*-\s*[34]|1|2)\s*(?:years?|yrs?)\b|\bentry\s*level\b|\bjunior\b/i);
  if (entryMatch) {
    return {
      rawText: entryMatch[0],
      level: "entry",
      minYears: 1,
      maxYears: 3,
      isFresherFriendly: false,
    };
  }

  // Check senior range "5+ years", "senior", "lead"
  const seniorMatch = combined.match(/\b([5-9]|\d{2})\+?\s*(?:years?|yrs?)\b|\bsenior\b|\blead\b|\bstaff\b/i);
  if (seniorMatch) {
    return {
      rawText: seniorMatch[0],
      level: "senior",
      minYears: 5,
      maxYears: undefined,
      isFresherFriendly: false,
    };
  }

  // Default to mid-level
  return {
    rawText: "Mid-level",
    level: "mid",
    minYears: 3,
    maxYears: 5,
    isFresherFriendly: false,
  };
}

/**
 * 4. Employment Type Normalization
 */
export function normalizeEmploymentType(rawType: string | null | undefined, title: string = ""): NormalizedEmploymentType {
  const combined = `${rawType || ""} ${title}`.toLowerCase();

  if (/\bintern(?:ship)?\b|\bco-op\b|\bapprentice\b|\bstudent\b/i.test(combined)) {
    return "internship";
  }
  if (/\bfellowship\b|\bjrf\b|\bsrf\b|\bpostdoc\b/i.test(combined)) {
    return "fellowship";
  }
  if (/\bresearch\b|\bscientist\b/i.test(combined)) {
    return "research";
  }
  if (/\bcontract(?:or|ing)?\b|\btemporary\b|\bfreelance\b/i.test(combined)) {
    return "contract";
  }
  if (/\bpart[\s-]time\b/i.test(combined)) {
    return "part_time";
  }

  return "job";
}

/**
 * 5. Date Normalization
 */
export function normalizeDate(rawDate: string | number | Date | null | undefined): string | null {
  if (!rawDate) return null;

  try {
    let d: Date;
    if (typeof rawDate === "number") {
      // Unix timestamp (handle seconds vs milliseconds)
      d = rawDate < 10_000_000_000 ? new Date(rawDate * 1000) : new Date(rawDate);
    } else {
      d = new Date(rawDate);
    }

    if (isNaN(d.getTime())) {
      return null;
    }
    return d.toISOString();
  } catch {
    return null;
  }
}
