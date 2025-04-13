"use server";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import console from "console";

/**
 * Generates a fallback mock feedback when the API fails.
 * This is only used as a last resort if OpenRouter fails.
 */
function generateMockFeedback(transcript: string): any {
  console.log("FALLBACK: Generating mock feedback as OpenRouter failed");
  
  // Create a basic mock response that follows the expected schema
  return {
    totalScore: 70,
    categoryScores: [
      {
        name: "Communication Skills",
        score: 75,
        comment: "The candidate communicated their ideas clearly, though there is room for improvement in structuring responses."
      },
      {
        name: "Technical Knowledge",
        score: 70,
        comment: "The candidate demonstrated adequate technical knowledge for the role."
      },
      {
        name: "Problem Solving",
        score: 68,
        comment: "The candidate showed decent problem-solving abilities but could improve in analytical thinking."
      },
      {
        name: "Cultural Fit",
        score: 80,
        comment: "The candidate appears to align well with company values and team dynamics."
      },
      {
        name: "Confidence and Clarity",
        score: 65,
        comment: "The candidate could work on presenting ideas more confidently and clearly."
      }
    ],
    strengths: [
      "Good communication skills",
      "Technical knowledge in required areas",
      "Positive attitude throughout the interview"
    ],
    areasForImprovement: [
      "Could improve response structure",
      "Should provide more specific examples",
      "Could demonstrate deeper technical expertise"
    ],
    finalAssessment: "The candidate shows promise for the role but would benefit from additional preparation and experience. They demonstrated adequate technical knowledge and good communication skills, though there is room for improvement in confidence and problem-solving approaches."
  };
}

export async function createFeedback(params: CreateFeedbackParams) {
  // Initial log to verify function is called
  console.log("createFeedback START", { 
    interviewId: params?.interviewId,
    userId: params?.userId,
    transcriptLength: params?.transcript?.length,
    feedbackId: params?.feedbackId
  });

  // Parameter validation
  if (!params) {
    console.error("createFeedback ERROR: No params provided");
    return { success: false, error: "No parameters provided" };
  }

  const { interviewId, userId, transcript, feedbackId } = params;

  if (!interviewId) {
    console.error("createFeedback ERROR: No interviewId provided");
    return { success: false, error: "Missing interviewId parameter" };
  }

  if (!userId) {
    console.error("createFeedback ERROR: No userId provided");
    return { success: false, error: "Missing userId parameter" };
  }

  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    console.error("createFeedback ERROR: Invalid transcript", transcript);
    return { success: false, error: "Invalid transcript data" };
  }

  try {
    console.log("createFeedback: Processing transcript...");
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");
    console.log(`createFeedback: Transcript processed. Length: ${formattedTranscript.length} chars`);

    // Use the OpenRouter API directly instead of relying on AI SDK
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("createFeedback ERROR: OpenRouter API key not set");
      throw new Error("OpenRouter API key is not set");
    }

    console.log("createFeedback: Preparing OpenRouter API call...");
    // Format the API request
    const apiRequest = {
      model: "anthropic/claude-3-haiku",
      messages: [
        {
          role: "system",
          content: `You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. 
          
Your output should be a JSON object with the following structure:
{
  "totalScore": number between 0-100,
  "categoryScores": [
    {
      "name": "Communication Skills",
      "score": number between 0-100,
      "comment": "detailed comment"
    },
    {
      "name": "Technical Knowledge",
      "score": number between 0-100,
      "comment": "detailed comment"
    },
    {
      "name": "Problem Solving",
      "score": number between 0-100,
      "comment": "detailed comment"
    },
    {
      "name": "Cultural Fit",
      "score": number between 0-100,
      "comment": "detailed comment"
    },
    {
      "name": "Confidence and Clarity",
      "score": number between 0-100,
      "comment": "detailed comment"
    }
  ],
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2", "area3"],
  "finalAssessment": "overall assessment text"
}

You must follow this exact schema with these exact field names and types.`,
        },
        {
          role: "user",
          content: `
            You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
            Transcript:
            ${formattedTranscript}

            Please score the candidate from 0 to 100 in the following areas:
            - Communication Skills: Clarity, articulation, structured responses.
            - Technical Knowledge: Understanding of key concepts for the role.
            - Problem Solving: Ability to analyze problems and propose solutions.
            - Cultural Fit: Alignment with company values and job role.
            - Confidence and Clarity: Confidence in responses, engagement, and clarity.

            Then provide a list of strengths, areas for improvement, and a final assessment.
            
            Respond with a JSON object exactly matching the structure described in the system message.
          `,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    };

    console.log("createFeedback: Calling OpenRouter API...");
    try {
      // Call OpenRouter API directly with updated headers
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL || "https://prepwise-interview.vercel.app",
          "X-Title": "Prepwise AI Interview App",
          "User-Agent": "Next.js Server Action",
          "OR-PREFER-CACHED": "true" // Allow using cached responses for faster results
        },
        cache: "no-store",
        next: { revalidate: 0 },
        body: JSON.stringify(apiRequest),
      });
      
      console.log(`createFeedback: OpenRouter API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`createFeedback ERROR: OpenRouter API error ${response.status}`, errorText);
        return { 
          success: false, 
          error: `OpenRouter API error (${response.status}): ${errorText}` 
        };
      }

      const result = await response.json();
      console.log("createFeedback: Full OpenRouter API response:", JSON.stringify(result));
      
      // Use a different approach to check for choices - more resilient to different response formats
      // First check if we have a complete response in any of the supported formats
      if (!result) {
        console.error("createFeedback ERROR: Empty response from OpenRouter API");
        return { 
          success: false, 
          error: "Empty response from OpenRouter API" 
        };
      }
      
      // OpenRouter might return different formats depending on the model
      let content = '';
      
      // Try to handle different response formats
      if (result.choices && Array.isArray(result.choices) && result.choices.length > 0) {
        // Standard OpenAI-like format
        content = result.choices[0]?.message?.content;
      } else if (result.content) {
        // Direct content format
        content = result.content;
      } else if (result.response) {
        // Alternative format
        content = result.response;
      } else {
        // Log the full response for debugging
        console.error("createFeedback ERROR: Unexpected response format from OpenRouter", result);
        return { 
          success: false, 
          error: "Unexpected response format from OpenRouter API" 
        };
      }
      
      // Add this check for the content
      if (!content) {
        console.error("createFeedback ERROR: No content in OpenRouter API response", result);
        return { 
          success: false, 
          error: "Invalid response from OpenRouter API (missing content)" 
        };
      }

      // Replace the object declaration with a properly typed one
      let object: {
        totalScore: number;
        categoryScores: Array<{
          name: string;
          score: number;
          comment: string;
        }>;
        strengths: string[];
        areasForImprovement: string[];
        finalAssessment: string;
      };
      
      try {
        console.log("createFeedback: Parsing content JSON...");
        const parsedContent = JSON.parse(content);
        object = parsedContent as typeof object;
        console.log("createFeedback: Successfully parsed response content");
        
        // Validate that the object has the required properties
        const requiredProperties = [
          'totalScore', 
          'categoryScores', 
          'strengths', 
          'areasForImprovement', 
          'finalAssessment'
        ];
        
        const missingProperties = requiredProperties.filter(prop => !(prop in object));
        
        if (missingProperties.length > 0) {
          console.error(`createFeedback ERROR: Parsed object is missing required properties: ${missingProperties.join(', ')}`, object);
          return { 
            success: false, 
            error: `Invalid response format: Missing ${missingProperties.join(', ')}` 
          };
        }
        
        // Validate that categoryScores has the expected structure
        if (!Array.isArray(object.categoryScores) || object.categoryScores.length !== 5) {
          console.error('createFeedback ERROR: categoryScores is not an array or has wrong length', object.categoryScores);
          return { 
            success: false, 
            error: 'Invalid response format: categoryScores must be an array with 5 items' 
          };
        }
        
        // Check for categoryScores properties
        for (let i = 0; i < object.categoryScores.length; i++) {
          const category = object.categoryScores[i];
          if (!category.name || !('score' in category) || !category.comment) {
            console.error(`createFeedback ERROR: Category at index ${i} is missing required properties`, category);
            return { 
              success: false, 
              error: `Invalid response format: Category ${i+1} is missing required properties` 
            };
          }
        }
        
        // Log all validated properties for debugging
        console.log("createFeedback: Validated object properties", {
          totalScore: object.totalScore,
          categoryNames: object.categoryScores.map(c => c.name),
          strengthsCount: object.strengths.length,
          areasForImprovementCount: object.areasForImprovement.length,
          finalAssessmentLength: object.finalAssessment.length
        });
      } catch (parseError) {
        console.error("createFeedback ERROR: Failed to parse content JSON", parseError, content);
        return { 
          success: false, 
          error: "Failed to parse response from OpenRouter API" 
        };
      }

      console.log("createFeedback: Creating feedback document...");
      const feedback = {
        interviewId: interviewId,
        userId: userId,
        totalScore: object.totalScore,
        categoryScores: object.categoryScores,
        strengths: object.strengths,
        areasForImprovement: object.areasForImprovement,
        finalAssessment: object.finalAssessment,
        createdAt: new Date().toISOString(),
      };

      let feedbackRef;

      if (feedbackId) {
        console.log(`createFeedback: Updating existing feedback ${feedbackId}`);
        feedbackRef = db.collection("feedback").doc(feedbackId);
      } else {
        console.log("createFeedback: Creating new feedback document");
        feedbackRef = db.collection("feedback").doc();
      }

      try {
        await feedbackRef.set(feedback);
        console.log(`createFeedback: Feedback saved with ID ${feedbackRef.id}`);
        return { success: true, feedbackId: feedbackRef.id };
      } catch (dbError) {
        console.error("createFeedback ERROR: Firebase operation failed:", dbError);
        return { 
          success: false, 
          error: `Database error: ${dbError instanceof Error ? dbError.message : "Failed to save feedback to database"}`
        };
      }
    } catch (fetchError) {
      console.error("createFeedback ERROR during API call:", fetchError);
      
      // If it's the second attempt or a serious error, try to use the fallback
      if (params.retryCount && params.retryCount > 0) {
        console.log("createFeedback: Using fallback mock feedback generator after API failures");
        
        try {
          // Generate a mock response as fallback
          const mockObject = generateMockFeedback(formattedTranscript);
          
          // Create a feedback document with the mock data
          const feedback = {
            interviewId: interviewId,
            userId: userId,
            totalScore: mockObject.totalScore,
            categoryScores: mockObject.categoryScores,
            strengths: mockObject.strengths,
            areasForImprovement: mockObject.areasForImprovement,
            finalAssessment: mockObject.finalAssessment,
            createdAt: new Date().toISOString(),
            isMockData: true // Flag to indicate this is mock data
          };
          
          // Save the mock feedback
          let feedbackRef = feedbackId 
            ? db.collection("feedback").doc(feedbackId)
            : db.collection("feedback").doc();
            
          await feedbackRef.set(feedback);
          console.log(`createFeedback: FALLBACK mock feedback saved with ID ${feedbackRef.id}`);
          
          return { 
            success: true, 
            feedbackId: feedbackRef.id,
            isMockData: true
          };
        } catch (mockError) {
          console.error("createFeedback ERROR: Even fallback generation failed", mockError);
        }
      }
      
      // If not using fallback or fallback failed, return the original error
      return { 
        success: false, 
        error: `Error calling OpenRouter API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}` 
      };
    }
  } catch (error) {
    console.error("createFeedback ERROR:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
