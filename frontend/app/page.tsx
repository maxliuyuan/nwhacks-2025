"use client";

import React, { useEffect, useState } from "react";
import Call from "@/components/Call";

export default function Home() {
  const [startCall, setStartCall] = useState(false);
    const [isAgentTalking, setIsAgentTalking] = useState(false);
  
    useEffect(() => {
      setStartCall(true); // Trigger call start when the page loads
    }, []);
  
    // Function to update the agent talking state and analyze rizz
    const handleAgentTalkingChange = async (isTalking: boolean, updateObject: any) => {
      setIsAgentTalking(isTalking);
  
      // Get the user's transcript from the updateObject
      const userTranscript = updateObject.transcript?.find((item: any) => item.role === 'user')?.content;
  
      // Ensure userTranscript exists before analyzing
      if (isTalking && userTranscript) {
        console.log("Analyzing user transcript:", userTranscript);
      }
    };
  
  return (
    <main className="relative bg-[#18181B] flex justify-center items-center flex-col overflow-hidden mx-auto sm:px-10 px-5 min-h-screen">
      <div className="max-w-7xl w-full">
        <div className="relative bg-gray-900 text-white min-h-screen flex flex-col justify-center">
          <div className="mt-1 mb-4 flex items-center space-x-6 justify-center">
            <Call
              startCall={startCall}
              onAgentTalkingChange={handleAgentTalkingChange} // Pass the handler
            />
          </div>
        </div>
      </div>
    </main>
  );
}
