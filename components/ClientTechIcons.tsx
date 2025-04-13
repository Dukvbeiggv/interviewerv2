'use client';

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ClientTechIconsProps {
  techIcons: Array<{
    tech: string;
    url: string;
  }>;
}

// This is a Client Component - it can't be async
export default function ClientTechIcons({ techIcons }: ClientTechIconsProps) {
  return (
    <div className="flex flex-row">
      {techIcons.slice(0, 3).map(({ tech, url }, index) => (
        <div
          key={tech}
          className={cn(
            "relative group bg-dark-300 rounded-full p-2 flex flex-center",
            index >= 1 && "-ml-3"
          )}
        >
          <span className="tech-tooltip">{tech}</span>

          <Image
            src={url}
            alt={tech}
            width={100}
            height={100}
            className="size-5"
          />
        </div>
      ))}
    </div>
  );
} 