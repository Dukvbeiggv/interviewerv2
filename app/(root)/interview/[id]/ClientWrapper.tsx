'use client';

import { useEffect } from 'react';
import Image from "next/image";
import Agent from "@/components/Agent";
import { getRandomInterviewCover } from "@/lib/utils";
import ClientTechIcons from "@/components/ClientTechIcons";

// Client wrapper component to handle errors
export default function ClientWrapper({ 
  user, 
  interview, 
  id, 
  feedback,
  techIcons
}: { 
  user: any; 
  interview: any; 
  id: string;
  feedback: any;
  techIcons: Array<{ tech: string; url: string }>;
}) {
  useEffect(() => {
    // Log when the interview page loads
    console.log("Interview page loaded", { 
      interviewId: id,
      userId: user?.id,
      hasUser: !!user,
      hasInterview: !!interview,
      hasFeedback: !!feedback,
      questions: interview?.questions?.length
    });

    // Add unhandled error listeners
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error in interview page:", event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection in interview page:", event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [id, user, interview, feedback]);

  if (!user || !interview) {
    console.error("Missing required data", { hasUser: !!user, hasInterview: !!interview });
    return <div>Error: Missing required data. Check console for details.</div>;
  }

  return (
    <>
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex flex-row gap-4 items-center max-sm:flex-col">
          <div className="flex flex-row gap-4 items-center">
            <Image
              src={getRandomInterviewCover()}
              alt="cover-image"
              width={40}
              height={40}
              className="rounded-full object-cover size-[40px]"
            />
            <h3 className="capitalize">{interview.role} Interview</h3>
          </div>

          <ClientTechIcons techIcons={techIcons} />
        </div>

        <p className="bg-dark-200 px-4 py-2 rounded-lg h-fit">
          {interview.type}
        </p>
      </div>

      <Agent
        userName={user?.name!}
        userId={user?.id}
        interviewId={id}
        type="interview"
        questions={interview.questions}
        feedbackId={feedback?.id}
      />
    </>
  );
} 