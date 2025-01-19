import express, { Request, Response } from "express";
import expressWs from "express-ws";
import { RawData, WebSocket } from "ws";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import { Retell } from "retell-sdk";
import { CustomLlmRequest, CustomLlmResponse } from "./types";
// Any one of these following LLM clients can be used to generate responses.
import { FunctionCallingLlmClient } from "./llms/llm_openai_func_call";
// import { DemoLlmClient } from "./llms/llm_openai";
// import { DemoLlmClient } from "./llms/llm_azure_openai";
// import { FunctionCallingLlmClient } from "./llms/llm_azure_openai_func_call_end_call";
// import { FunctionCallingLlmClient } from "./llms/llm_azure_openai_func_call";
// import { DemoLlmClient } from "./llms/llm_openrouter";


const client = new Retell({
  apiKey: process.env.RETELL_API_KEY, // Make sure to store the API key in an environment variable
});

/**
 * Fetches the feedback text from the analysis of a call using the Retell API.
 * @param {string} callId - The ID of the call to retrieve the analysis for.
 * @returns {Promise<string>} - The feedback text from the call analysis.
 */
export async function getCallAnalysis(callId: string): Promise<string> {
  try {
    // Retrieve the call analysis from Retell using the provided callId
    const callResponse = await client.call.retrieve(callId);

    // Extract and return only the feedback from the custom_analysis_data
    const feedback = (callResponse.call_analysis?.custom_analysis_data as { feedback?: string })?.feedback;

    if (feedback) {
      return feedback; // Return the feedback text
    } else {
      throw new Error('No feedback available in the call analysis.');
    }
  } catch (error) {
    console.error('Error fetching call analysis:', error);
    throw error; // Rethrow the error to be handled by the caller function
  }
}

export class Server {
  private httpServer: HTTPServer;
  public app: expressWs.Application;

  constructor() {
    this.app = expressWs(express()).app;
    this.httpServer = createServer(this.app);
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));

    this.handleRetellLlmWebSocket();
    this.handleWebhook();
  }

  listen(port: number): void {
    this.app.listen(port);
    console.log("Listening on " + port);
  }

  /* Handle webhook from Retell server. This is used to receive events from Retell server.
     Including call_started, call_ended, call_analyzed */
  handleWebhook() {
    this.app.post("/webhook", async (req: Request, res: Response) => {
      if (
        !Retell.verify(
          JSON.stringify(req.body),
          process.env.RETELL_API_KEY,
          req.headers["x-retell-signature"] as string
        )
      ) {
        console.error("Invalid signature");
        return;
      }
      const content = req.body;
      switch (content.event) {
        case "call_started":
          console.log("Call started event received", content.data.call_id);
          break;
        case "call_ended":
          console.log("Call ended event received", content.data.call_id);
          break;
        case "call_analyzed":
          console.log("Call analyzed event received", content.data.call_id);

          // Once the call is analyzed, fetch the analysis for the call
          const callId = content.data.call_id;
          try {
            const analysis = await getCallAnalysis(callId); // Call the function to fetch analysis
            console.log("Call analysis:", analysis);
            // Optionally, you could send this analysis back to the client or store it for later use
          } catch (err) {
            console.error("Error fetching call analysis:", err);
          }

          break;
        default:
          console.log("Received an unknown event:", content.event);
      }
      // Acknowledge the receipt of the event
      res.json({ received: true });
    });
  }

  /* Start a websocket server to exchange text input and output with Retell server. Retell server 
     will send over transcriptions and other information. This server here will be responsible for
     generating responses with LLM and send back to Retell server.*/
  handleRetellLlmWebSocket() {
    this.app.ws(
      "/llm-websocket/:call_id",
      async (ws: WebSocket, req: Request) => {
        try {
          const callId = req.params.call_id;
          console.log("Handle llm ws for: ", callId);

          // Send config to Retell server
          const config: CustomLlmResponse = {
            response_type: "config",
            config: {
              auto_reconnect: true,
              call_details: true,
            },
          };
          ws.send(JSON.stringify(config));

          // Start sending the begin message to signal the client is ready.
          const llmClient = new FunctionCallingLlmClient();

          ws.on("error", (err) => {
            console.error("Error received in LLM websocket client: ", err);
          });
          ws.on("close", (err) => {
            console.error("Closing llm ws for: ", callId);
          });

          ws.on("message", async (data: RawData, isBinary: boolean) => {
            if (isBinary) {
              console.error("Got binary message instead of text in websocket.");
              ws.close(1007, "Cannot find corresponding Retell LLM.");
            }
            const request: CustomLlmRequest = JSON.parse(data.toString());

            // There are 5 types of interaction_type: call_details, ping_pong, update_only,response_required, and reminder_required.
            // Not all of them need to be handled, only response_required and reminder_required.
            if (request.interaction_type === "call_details") {
              // print call details
              console.log("call details: ", request.call);
              // Send begin message to start the conversation
              llmClient.BeginMessage(ws);
            } else if (
              request.interaction_type === "reminder_required" ||
              request.interaction_type === "response_required"
            ) {
              console.clear();
              console.log("req", request);
              llmClient.DraftResponse(request, ws);
            } else if (request.interaction_type === "ping_pong") {
              let pingpongResponse: CustomLlmResponse = {
                response_type: "ping_pong",
                timestamp: request.timestamp,
              };
              ws.send(JSON.stringify(pingpongResponse));
            } else if (request.interaction_type === "update_only") {
              // process live transcript update if needed
            }
          });
        } catch (err) {
          console.error("Encountered error:", err);
          ws.close(1011, "Encountered error: " + err);
        }
      },
    );
  }
}
