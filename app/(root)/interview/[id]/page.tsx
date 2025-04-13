import { redirect } from "next/navigation";

import ClientWrapper from "./ClientWrapper";
import { getTechLogos } from "@/lib/utils";

import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";

// This is a Server Component - it can be async
const InterviewDetails = async ({ params }: RouteParams) => {
  const { id } = await params;

  const user = await getCurrentUser();

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user?.id!,
  });

  // Pre-fetch tech logos in the server component
  const techIcons = interview.techstack ? await getTechLogos(interview.techstack) : [];

  // Return the client wrapper component with all data fetched from the server
  return (
    <ClientWrapper 
      user={user} 
      interview={interview} 
      id={id} 
      feedback={feedback}
      techIcons={techIcons}
    />
  );
};

export default InterviewDetails;
