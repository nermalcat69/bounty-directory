"use client";

import { createFreelanceListingAction } from "@/actions/create-freelance-listing";
import { CompanySelect } from "@/components/company/company-select";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  company_id: z.string({
    required_error: "Please select a company.",
  }),
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  description: z
    .string()
    .min(10, {
      message: "Description must be at least 10 characters.",
    })
    .max(500, {
      message: "Description must be less than 500 characters.",
    }),
  workplace: z.enum(["On site", "Remote", "Hybrid"]),
  projectType: z.enum([
    "Web Development",
    "Mobile App", 
    "Desktop App",
    "API Development",
    "Database Design",
    "UI/UX Design",
    "DevOps",
    "Data Analysis",
    "Machine Learning",
    "Other"
  ]),
  budgetRange: z.enum([
    "Under $500",
    "$500-$1000", 
    "$1000-$2500",
    "$2500-$5000",
    "$5000-$10000",
    "$10000+"
  ]),
  duration: z.string().optional(),
  skills: z.string().optional(),
  urgency: z.enum(["Low", "Medium", "High", "Urgent"]),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export function FreelanceForm() {
  const { execute, isExecuting } = useAction(createFreelanceListingAction);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_id: "",
      title: "",
      description: "",
      workplace: "Remote",
      projectType: "Web Development",
      budgetRange: "$1000-$2500",
      duration: "",
      skills: "",
      urgency: "Medium",
      contactEmail: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    execute({
      company_id: values.company_id,
      title: values.title,
      description: values.description,
      workplace: values.workplace,
      projectType: values.projectType,
      budgetRange: values.budgetRange,
      duration: values.duration ?? null,
      skills: values.skills ?? null,
      urgency: values.urgency,
      contactEmail: values.contactEmail,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6 pb-6">
          <FormField
            control={form.control}
            name="company_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <CompanySelect
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Build a modern e-commerce website"
                    {...field}
                    className="placeholder:text-[#878787] border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-border">
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Web Development">Web Development</SelectItem>
                      <SelectItem value="Mobile App">Mobile App</SelectItem>
                      <SelectItem value="Desktop App">Desktop App</SelectItem>
                      <SelectItem value="API Development">API Development</SelectItem>
                      <SelectItem value="Database Design">Database Design</SelectItem>
                      <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Data Analysis">Data Analysis</SelectItem>
                      <SelectItem value="Machine Learning">Machine Learning</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Range</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-border">
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Under $500">Under $500</SelectItem>
                      <SelectItem value="$500-$1000">$500-$1000</SelectItem>
                      <SelectItem value="$1000-$2500">$1000-$2500</SelectItem>
                      <SelectItem value="$2500-$5000">$2500-$5000</SelectItem>
                      <SelectItem value="$5000-$10000">$5000-$10000</SelectItem>
                      <SelectItem value="$10000+">$10000+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="workplace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workplace Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-border">
                        <SelectValue placeholder="Select workplace type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="On site">On site</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="border-border">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Duration</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="2-3 weeks"
                      {...field}
                      className="placeholder:text-[#878787] border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="your@email.com"
                      {...field}
                      type="email"
                      className="placeholder:text-[#878787] border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Required Skills (comma-separated)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="React, TypeScript, Node.js, PostgreSQL"
                    {...field}
                    className="placeholder:text-[#878787] border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your project requirements, goals, and any specific details..."
                    {...field}
                    className="placeholder:text-[#878787] border-border min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fixed $19 pricing section */}
          <div className="p-4 border rounded-lg border-primary bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Freelance Project Listing</div>
                <div className="text-sm text-[#878787] mt-1">
                  Get your project listed and connect with skilled freelancers.
                </div>
              </div>
              <div className="text-xl font-semibold">$19 one-time</div>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isExecuting}>
          {isExecuting ? "Posting..." : "Post Project ($19)"}
        </Button>
      </form>
    </Form>
  );
}