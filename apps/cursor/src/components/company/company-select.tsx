"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { AddCompanyButton } from "./add-company-button";
import { getUserCompaniesAction } from "@/actions/get-user-companies";
import { useAction } from "next-safe-action/hooks";

type Company = {
  id: string;
  name: string;
};

export function CompanySelect({
  onChange,
  value,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const { data: session } = useSession();
  const { execute: fetchCompanies } = useAction(getUserCompaniesAction, {
    onSuccess: (result) => {
      if (result.data) {
        setCompanies(result.data);
      }
    },
    onError: () => {
      setCompanies([]);
    },
  });
  const [{ reload }, setQueryStates] = useQueryStates({
    reload: parseAsBoolean.withDefault(false),
    addCompany: parseAsBoolean.withDefault(false),
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchCompanies();
    } else {
      setCompanies([]);
    }

    if (reload) {
      setQueryStates({ reload: false, addCompany: false });
    }
  }, [reload, session?.user?.id]);

  return (
    <div className="flex items-center gap-4">
      <Select
        key={selectedCompany?.id}
        value={selectedCompany?.id}
        onValueChange={(value) => {
          const company = companies.find((c) => c.id === value);
          setSelectedCompany(company || null);
          onChange(company?.id ?? "");
        }}
      >
        <SelectTrigger
          className="w-full border-border"
          disabled={companies.length === 0}
        >
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        {companies.length > 0 && (
          <SelectContent className="max-h-[200px] overflow-y-auto">
            <SelectGroup>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        )}
      </Select>

      <AddCompanyButton redirect={false} />
    </div>
  );
}
