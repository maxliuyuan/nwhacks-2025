import React, { useEffect, useState } from "react";
import "./App.css";
import { RetellWebClient } from "retell-client-js-sdk";

const agentId = "agent_326df6ce5685fb8e6f66ab9ab5";

interface RegisterCallResponse {
  access_token: string;
  call_id: string;
}

const retellWebClient = new RetellWebClient();

const App = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [transcriptContent, setTranscriptContent] = useState<string>("");
  const [callId, setCallId] = useState<string>("");

  // Initialize RetellWebClient event handlers
  useEffect(() => {
    retellWebClient.on("call_started", () => {
      console.log("Call started");
    });

    retellWebClient.on("call_ended", () => {
      console.log("Call ended");
      setIsCalling(false);
    });

    retellWebClient.on("agent_start_talking", () => {
      console.log("Agent started talking");
    });

    retellWebClient.on("agent_stop_talking", () => {
      console.log("Agent stopped talking");
    });

    retellWebClient.on("update", (update) => {
      if (update.transcript.length > 0) {
        const latestContent = update.transcript[update.transcript.length - 1]?.content;
        setTranscriptContent(latestContent);
      }
    });

    retellWebClient.on("error", (error) => {
      console.error("Error:", error);
      retellWebClient.stopCall();
    });
  }, []);

  // Register and start a call
  const toggleConversation = async () => {
    if (isCalling) {
      retellWebClient.stopCall();
    } else {
      const registerCallResponse = await registerCall(agentId);
      if (registerCallResponse.access_token) {
        retellWebClient
          .startCall({
            accessToken: registerCallResponse.access_token,
          })
          .then(() => {
            setIsCalling(true);
            setCallId(registerCallResponse.call_id);
          })
          .catch(console.error);
      }
    }
  };

  // Register a call with the backend
  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    try {
      const response = await fetch("/api/create-web-call", {
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

      const data: RegisterCallResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error registering call:", error);
      throw new Error("Failed to register call");
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={toggleConversation}>
          {isCalling ? "Stop" : "Start"}
        </button>
        {isCalling && (
          <div>
            <p>Transcript:</p>
            <div
              className="transcript-box"
              style={{
                maxWidth: "40rem",
                margin: "0 auto",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                border: "1px solid #ccc",
                padding: "10px",
              }}
            >
              {transcriptContent || "Listening..."}
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default App;