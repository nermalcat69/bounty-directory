import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Plus, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export type FreelanceProject = {
  id: string;
  title: string;
  description: string;
  company: {
    name: string;
    slug: string;
    image: string;
  };
  workplace: string;
  projectType: string;
  budgetRange: string;
  urgency: string;
  contactEmail: string;
};

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

export function FreelanceFeatured({
  data,
  hidePagination,
}: {
  data?: FreelanceProject[] | null;
  hidePagination?: boolean;
}) {
  return (
    <Carousel
      opts={{
        align: "start",
      }}
      className="w-full relative"
    >
      {!hidePagination && (
        <div className="absolute -top-16 right-0 gap-2 hidden md:flex">
          <Link href="/freelance/new">
            <Button
              variant="outline"
              className="rounded-full h-8 flex items-center gap-2 border-border"
            >
              Post freelance project
              <Plus className="size-4" />
            </Button>
          </Link>
          <CarouselPrevious />
          <CarouselNext />
        </div>
      )}
      <CarouselContent>
        {data?.map((project) => (
          <CarouselItem key={project.id} className="md:basis-1/2 lg:basis-1/4">
            <Card className="bg-transparent">
              <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-3">
                  <Link href={`/c/${project.company.slug}`}>
                    <Avatar className="size-12 rounded-none">
                      {project.company.image ? (
                        <AvatarImage
                          src={project.company.image}
                          alt={project.company.name}
                        />
                      ) : (
                        <AvatarFallback className="bg-[#1c1c1c] rounded-none">
                          {project.company.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#878787] font-mono line-clamp-1">
                      <Link href={`/c/${project.company.slug}`}>
                        <span className="line-clamp-1">{project.company.name}</span>
                      </Link>
                      {project.workplace && (
                        <>
                          <span>•</span>
                          <span className="line-clamp-1">{project.workplace}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-md line-clamp-1 flex items-center gap-2">
                      <span className="text-sm">
                        {projectTypeIcons[project.projectType as keyof typeof projectTypeIcons] || "📋"}
                      </span>
                      {project.title}
                    </h3>
                  </div>
                </div>

                {/* Enhanced fields */}
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs font-mono bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    {project.budgetRange}
                  </Badge>
                  
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-mono ${urgencyColors[project.urgency as keyof typeof urgencyColors]}`}
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {project.urgency}
                  </Badge>
                </div>

                <p className="text-[#878787] text-sm line-clamp-2">
                  {project.description}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-fit bg-[#1c1c1c] text-[#878787] hover:bg-[#2c2c2c] rounded-full font-mono text-xs"
                  asChild
                >
                  <a
                    href={`mailto:${project.contactEmail}?subject=Interested in: ${project.title}&body=Hi, I'm interested in your freelance project "${project.title}". I'd love to discuss the details with you.`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contact
                  </a>
                </Button>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}