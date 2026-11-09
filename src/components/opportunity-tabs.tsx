"use client";

import * as React from "react";
import { motion } from "motion/react";
import { MapPin, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";

interface OpportunityItem {
  id: string;
  title: string;
  role: string;
  description: string;
  location: string;
  category: string;
  timing: string;
}

const OPPORTUNITY_DATA: Record<string, OpportunityItem[]> = {
  jobs: [
    {
      id: "job-1",
      title: "Sample Job Listing",
      role: "Junior Full-Stack Developer",
      description:
        "Exciting entry-level position at a fast-growing tech firm. Collaborate with engineering squads to build modern cloud applications.",
      location: "Remote / Bengaluru",
      category: "Full-Time",
      timing: "Posted 2 days ago",
    },
    {
      id: "job-2",
      title: "Sample Job Listing",
      role: "Associate Data Analyst",
      description:
        "Leverage SQL, Python, and BI dashboards to interpret cross-functional product data. Help drive evidence-based business solutions.",
      location: "Hybrid / Pune",
      category: "Full-Time",
      timing: "Posted 3 days ago",
    },
    {
      id: "job-3",
      title: "Sample Job Listing",
      role: "Cloud Systems Engineer",
      description:
        "Manage microservices architecture, CI/CD deployment pipelines, and cloud security monitoring. Ideal for proactive problem solvers.",
      location: "On-site / Hyderabad",
      category: "Full-Time",
      timing: "Posted 5 days ago",
    },
  ],
  internships: [
    {
      id: "intern-1",
      title: "Sample Internship Listing",
      role: "Frontend Engineering Intern",
      description:
        "3-month paid summer internship focusing on Next.js and Tailwind design systems. Mentorship from senior engineering staff included.",
      location: "Remote",
      category: "Internship (3 Mos)",
      timing: "Starts Next Month",
    },
    {
      id: "intern-2",
      title: "Sample Internship Listing",
      role: "UI/UX Product Design Intern",
      description:
        "Design wireframes, user journeys, and prototypes for high-traffic student applications. Strong portfolio in Figma preferred.",
      location: "Hybrid / Mumbai",
      category: "Internship (6 Mos)",
      timing: "Applications Open",
    },
    {
      id: "intern-3",
      title: "Sample Internship Listing",
      role: "AI & NLP Research Intern",
      description:
        "Assist in fine-tuning transformer models and curating domain-specific benchmarks. Gain hands-on exposure to cutting-edge AI systems.",
      location: "Remote",
      category: "Internship (4 Mos)",
      timing: "Immediate Start",
    },
  ],
  research: [
    {
      id: "res-1",
      title: "Sample Research Listing",
      role: "Undergraduate Research Fellow",
      description:
        "Investigate decentralized consensus mechanisms and fault-tolerant protocols. Opportunities to publish in peer-reviewed conferences.",
      location: "Campus Lab / Delhi",
      category: "Academic Research",
      timing: "Spring Semester",
    },
    {
      id: "res-2",
      title: "Sample Research Listing",
      role: "Climate Data Science Grantee",
      description:
        "Analyze high-resolution satellite imagery using geospatial machine learning. Funded by national environmental sustainability grants.",
      location: "Hybrid",
      category: "Sponsored Grant",
      timing: "Rolling Review",
    },
    {
      id: "res-3",
      title: "Sample Research Listing",
      role: "Computational Biology Project",
      description:
        "Assist faculty researchers with protein folding simulation algorithms and statistical modeling pipelines.",
      location: "On-site Lab",
      category: "Departmental",
      timing: "Annual Fellowship",
    },
  ],
  fdps: [
    {
      id: "fdp-1",
      title: "Sample FDP Listing",
      role: "AI Curriculum Integration Faculty Dev",
      description:
        "Intensive 1-week faculty development program on teaching generative AI concepts and ethical considerations in modern higher education.",
      location: "Online (Live Cohort)",
      category: "Accredited FDP",
      timing: "5 Days • 40 Hours",
    },
    {
      id: "fdp-2",
      title: "Sample FDP Listing",
      role: "Outcome-Based Education & NBA Alignment",
      description:
        "Hands-on workshop series for academic leaders to structure Bloom taxonomy metrics and course outcome assessment frameworks.",
      location: "Hybrid",
      category: "Faculty Training",
      timing: "Weekend Cohort",
    },
    {
      id: "fdp-3",
      title: "Sample FDP Listing",
      role: "Industry 4.0 & Applied Robotics Mentorship",
      description:
        "Faculty upskilling program bridging modern smart manufacturing pipelines with undergraduate engineering laboratory projects.",
      location: "On-site / Chennai",
      category: "Industrial Immersion",
      timing: "Registrations Open",
    },
  ],
  workshops: [
    {
      id: "ws-1",
      title: "Sample Workshop Listing",
      role: "Mastering System Design for Technical Interviews",
      description:
        "Interactive 2-day bootcamp covering scalable architecture, caching strategies, and load balancing patterns with live diagrams.",
      location: "Virtual Hands-on",
      category: "2-Day Intensive",
      timing: "Saturday & Sunday",
    },
    {
      id: "ws-2",
      title: "Sample Workshop Listing",
      role: "Resume Optimization & ATS Mastery",
      description:
        "Practical session where talent acquisition leaders audit student resumes in real-time and provide tailored feedback for high-tier roles.",
      location: "Live Interactive",
      category: "Career Readiness",
      timing: "This Friday 6 PM",
    },
    {
      id: "ws-3",
      title: "Sample Workshop Listing",
      role: "Cloud Native Deployment with Kubernetes",
      description:
        "Step-by-step laboratory configuring containers, ingress controllers, and auto-scalers on production cloud clusters.",
      location: "Hands-on Lab",
      category: "Technical Workshop",
      timing: "Next Weekend",
    },
  ],
};

const TAB_CONFIG = [
  { value: "jobs", label: "Jobs" },
  { value: "internships", label: "Internships" },
  { value: "research", label: "Research" },
  { value: "fdps", label: "FDPs" },
  { value: "workshops", label: "Workshops" },
];

export function OpportunityTabs() {
  const [activeTab, setActiveTab] = React.useState("jobs");

  return (
    <section id="opportunities" className="w-full py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mb-10">
          <Badge className="bg-sand/15 text-sand border-sand/30 mb-3 px-3 py-1">
            <Sparkles className="size-3 mr-1" /> Verified Opportunities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-cream tracking-tight">
            Explore Curated Opportunities
          </h2>
          <p className="text-cream/65 text-sm sm:text-base max-w-2xl mt-3 leading-relaxed">
            Browse live listings tailored for your profile. All previews below
            represent active category templates on the platform.
          </p>
        </div>

        <Tabs
          defaultValue="jobs"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex flex-col items-center"
        >
          {/* Tabs Navigation Pill Bar */}
          <TabsList className="h-auto bg-white/[0.05] border border-cream/10 p-1.5 rounded-full flex flex-wrap justify-center gap-1.5 max-w-full">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full px-5 py-2 text-sm text-cream/70 hover:text-cream data-[state=active]:bg-sand data-[state=active]:text-ink data-[state=active]:font-semibold transition-all cursor-pointer"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          {TAB_CONFIG.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="w-full mt-8 focus-visible:outline-none"
            >
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {OPPORTUNITY_DATA[tab.value]?.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between p-6 bg-white/[0.06] backdrop-blur-xl border border-cream/[0.12] rounded-[20px] transition-all duration-300 hover:border-sand/40 hover:bg-white/[0.08]"
                  >
                    <div>
                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <Badge
                          variant="outline"
                          className="bg-sand/15 text-sand border-sand/30 font-medium text-xs px-2.5 py-0.5 rounded-full"
                        >
                          Sample listing
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-cream/10 text-cream/80 border-cream/20 font-medium text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <MapPin className="size-3" />
                          {item.location}
                        </Badge>
                      </div>

                      {/* Title: 'Sample [type] Listing' */}
                      <h3 className="font-heading font-bold text-cream text-lg tracking-tight">
                        {item.title}
                      </h3>
                      <p className="text-sand text-xs font-medium mt-1">
                        {item.role} • {item.category}
                      </p>

                      {/* Two lines of placeholder description */}
                      <p className="text-cream/65 text-sm leading-relaxed mt-3 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Footer & Apply Button */}
                    <div className="mt-6 pt-4 border-t border-cream/10 flex items-center justify-between gap-3">
                      <span className="text-xs text-cream/45">
                        {item.timing}
                      </span>
                      <PillButton
                        variant="secondary"
                        size="sm"
                        href="/register"
                      >
                        Apply Now
                      </PillButton>
                    </div>
                  </div>
                ))}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

export default OpportunityTabs;
