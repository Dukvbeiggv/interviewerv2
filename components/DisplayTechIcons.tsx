import Image from "next/image";

import { cn, getTechLogos } from "@/lib/utils";
import ClientTechIcons from "./ClientTechIcons";

// This is a Server Component - it can be async
const DisplayTechIcons = async ({ techStack }: TechIconProps) => {
  // Pre-fetch the tech logos on the server
  const techIcons = await getTechLogos(techStack);

  // Pass the pre-fetched data to a client component
  return <ClientTechIcons techIcons={techIcons} />;
};

export default DisplayTechIcons;
