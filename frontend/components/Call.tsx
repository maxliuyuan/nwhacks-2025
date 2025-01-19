import dotenv from "dotenv";
// Load up env file which contains credentials
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import React, { useEffect, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import Link from "next/link";
import Retell from "retell-sdk";

// CHANGE THIS TO YOUR OWN AGENT ID!!
const agentId = "agent_110ec14f030bee9043e4e971e7";

interface RegisterCallResponse {
  access_token: string;
  call_id: string;
}

const retellWebClient = new RetellWebClient();

const Call = ({
  startCall,
  onAgentTalkingChange,
}: {
  startCall: boolean;
  onAgentTalkingChange: (isTalking: boolean, userTranscript: string) => void;
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [transcriptContent, setTranscriptContent] = useState<string>("");
  const [callId, setCallId] = useState<string>("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  const url = "http://127.0.0.1:8000";
  const url2 = "http://127.0.0.1:3001"

  // CHANGE YOUR API KEY HERE
  const retellClient = new Retell({
    apiKey: "key_d6554601d8036dcdc45f43fa0214",
  });

  console.log("apiKey", retellClient.apiKey);

  // Handle start call and register the call
  useEffect(() => {
    const handleCall = async () => {
      const registerCallResponse = await registerCall(agentId);
      if (registerCallResponse.access_token) {
        retellWebClient
          .startCall({
            accessToken: registerCallResponse.access_token,
          })
          .catch(console.error);
        setIsCalling(true);
        setCallId(registerCallResponse.call_id);  // Store the call ID
      }
    };

    if (startCall) {
      handleCall();
    }

    async function endCall() {
      try {
        console.log(`${url}/shutdown`);
        const response = await fetch(`${url}/shutdown`, {
          method: "GET"
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
      } catch (err) {
        console.error("Error registering call:", err);
        throw new Error("Failed to register call");
      }

      try {
        console.log(`${url2}/shutdown`);
        const response = await fetch(`${url2}/shutdown`, {
          method: "GET"
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
      } catch (err) {
        console.error("Error registering call:", err);
        throw new Error("Failed to register call");
      }
    }

    async function processCall() {
      try {
        console.log(`${url2}/`);
        const response = await fetch(`${url}/`, {
          method: "GET"
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
      } catch (err) {
        console.error("Error registering call:", err);
        throw new Error("Failed to register call");
      }
    }

    retellWebClient.on("call_started", () => {
      processCall()
      console.log("call started");
    });

    retellWebClient.on("call_ended", async () => {
      console.log("call ended");
      setIsCalling(false);
      onAgentTalkingChange(false, "");
      endCall();
    });

    async function toggleMove(state: number) {
      try {
        console.log(`${url}/move-ducky/?state=${state}`);
        const response = await fetch(`${url}/move-ducky/?state=${state}`, {
          method: "GET"
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

      } catch (err) {
        console.error("Error registering call:", err);
        throw new Error("Failed to register call");
      }
    }
    
    retellWebClient.on("agent_start_talking", () => {
      console.log("agent_start_talking");
      toggleMove(1);
      onAgentTalkingChange(true, transcriptContent);
    });

    retellWebClient.on("agent_stop_talking", () => {
      console.log("agent_stop_talking");
      toggleMove(0);
      onAgentTalkingChange(false, "");
    });

    retellWebClient.on("update", (update) => {
      console.log("update", update);
    });

    retellWebClient.on("error", (error) => {
      console.error("An error occurred:", error);
      retellWebClient.stopCall();
    });
  }, [startCall]);

  //Fetch the call analysis once the callId is set and the call has ended
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (callId && !isCalling) { // Check if the call has ended and the callId is set
        await delay(5000); // Delay before fetching analysis
        const callAnalysis = await getCallAnalysis(callId);
        console.log("Call analysis:", callAnalysis);
      }
    };
  
    if (callId && !isCalling) {
      fetchAnalysis();
    }
  }, [callId, isCalling]);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    try {
      const response = await fetch("api/create-web-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const responseBody = await response.text();
      if (!responseBody) {
        throw new Error("Empty response body");
      }

      const data: RegisterCallResponse = JSON.parse(responseBody);
      return data;
    } catch (err) {
      console.error("Error registering call:", err);
      throw new Error("Failed to register call");
    }
  }

  async function getCallAnalysis(callId: string) {
    try {
      const response = await retellClient.call.retrieve(callId);
      if (response.call_analysis && response.call_analysis.custom_analysis_data) {
        const customAnalysisData: { feedback?: string } = response.call_analysis.custom_analysis_data;
        if (customAnalysisData.feedback) {
          return customAnalysisData.feedback;
        } else {
          throw new Error("Analysis not found in custom analysis data");
        }
      } else {
        throw new Error("No call analysis or custom analysis data available");
      }
    } catch (err) {
      console.error("Error fetching call analysis:", err);
      return "Error retrieving results";
    }
  }

  return (
    <h1>Rubber Ducky Debugging Assistant</h1>
  );
};

export default Call;