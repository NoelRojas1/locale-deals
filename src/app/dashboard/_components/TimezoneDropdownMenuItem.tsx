import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { createURL } from "@/lib/utils";
import Link from "next/link";

export default function TimezoneDropdownMenuItem({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const userLocalTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <DropdownMenuItem asChild>
      <Link
        href={createURL("/dashboard/analytics", searchParams, {
          timezone: userLocalTimeZone,
        })}
      >
        {userLocalTimeZone}
      </Link>
    </DropdownMenuItem>
  );
}
