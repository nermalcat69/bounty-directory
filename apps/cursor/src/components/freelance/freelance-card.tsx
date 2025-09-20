import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FreelanceEditButton } from "./freelance-edit-button";
import { Clock, DollarSign, Briefcase, AlertCircle } from "lucide-react";

export interface FreelanceCardProps {
  id: string;
  title: string;
  description: string;
  projectType: string;
  budgetRange: string;
  duration?: string;
  skills?: string;
  urgency: string;
  contactEmail: string;
  workplace: string;
  created_at: string;
  owner_id: string;
  company: {
    name: string;
    image: string;
    slug: string;
  };
}

const urgencyColors = {
  Low: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  High: "bg-orange-100 text-orange-800 border-orange-200",
  Urgent: "bg-red-100 text-red-800 border-red-200",
};

const projectTypeIcons = {
  "Web Development": "💻",
  "Mobile App": "📱",
  "Desktop App": "🖥️",
  "API Development": "🔌",
  "Database Design": "🗄️",
  "UI/UX Design": "🎨",
  "DevOps": "⚙️",
  "Data Analysis": "📊",
  "Machine Learning": "🤖",
  "Other": "📋",
};

export function FreelanceCard({
  data: {
    id,
    title,
    company,
    description,
    projectType,
    budgetRange,
    duration,
    skills,
    urgency,
    contactEmail,
    workplace,
    owner_id,
  },
}: {
  data: FreelanceCardProps;
}) {
  const skillsArray = skills ? skills.split(',').map(s => s.trim()).slice(0, 3) : [];
  
  return (
    <Card className="p-0 border-none bg-transparent">
      <CardHeader className="p-0 space-y-3">
        <div className="flex items-center gap-2 relative">
          <Link href={`/c/${company.slug}`}>
            <Avatar className="size-4 rounded-none">
              {company.image ? (
                <AvatarImage src={company.image} alt={company.name} />
              ) : (
                <AvatarFallback className="bg-accent text-[9px]">
                  {company.name.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
          <div className="flex flex-row space-x-1 ">
            <CardTitle className="text-xs text-[#878787] font-mono">
              <Link href={`/c/${company.slug}`}>{company.name}</Link>
            </CardTitle>

            {workplace && (
              <>
                <span className="text-xs text-[#878787] font-mono">•</span>
                <span className="line-clamp-1 text-xs text-[#878787] font-mono">
                  {workplace}
                </span>
              </>
            )}

            {duration && (
              <>
                <span className="text-xs text-[#878787] font-mono">•</span>
                <span className="line-clamp-1 text-xs text-[#878787] font-mono">
                  {duration}
                </span>
              </>
            )}
          </div>

          <div className="absolute right-0 flex gap-2">
            <FreelanceEditButton ownerId={owner_id} id={id} />

            <Button
              variant="secondary"
              size="sm"
              className="w-fit bg-[#1c1c1c] text-[#878787] hover:bg-[#2c2c2c] rounded-full font-mono text-xs"
              asChild
            >
              <a
                href={`mailto:${contactEmail}?subject=Interested in: ${title}&body=Hi, I'm interested in your freelance project "${title}". I'd love to discuss the details with you.`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-row justify-between">
          <CardTitle className="text-md font-normal flex items-center gap-2">
            <span className="text-lg">
              {projectTypeIcons[projectType as keyof typeof projectTypeIcons] || "📋"}
            </span>
            <span>{title}</span>
          </CardTitle>
        </div>

        {/* Enhanced fields section */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge 
            variant="outline" 
            className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200"
          >
            <DollarSign className="w-3 h-3 mr-1" />
            {budgetRange}
          </Badge>
          
          <Badge 
            variant="outline" 
            className={`text-xs font-mono ${urgencyColors[urgency as keyof typeof urgencyColors]}`}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            {urgency}
          </Badge>

          <Badge 
            variant="outline" 
            className="text-xs font-mono bg-purple-50 text-purple-700 border-purple-200"
          >
            <Briefcase className="w-3 h-3 mr-1" />
            {projectType}
          </Badge>
        </div>

        {/* Skills section */}
        {skillsArray.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skillsArray.map((skill, index) => (
              <Badge 
                key={index}
                variant="secondary" 
                className="text-xs font-mono bg-gray-100 text-gray-700 border-gray-200"
              >
                {skill}
              </Badge>
            ))}
            {skills && skills.split(',').length > 3 && (
              <Badge 
                variant="secondary" 
                className="text-xs font-mono bg-gray-100 text-gray-700 border-gray-200"
              >
                +{skills.split(',').length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 mt-2 pr-24">
        <p className="text-sm line-clamp-3 text-[#878787]">{description}</p>
      </CardContent>
    </Card>
  );
}