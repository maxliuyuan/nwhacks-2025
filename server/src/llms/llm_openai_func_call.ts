import OpenAI from "openai";
import { WebSocket } from "ws";
import {
  CustomLlmResponse,
  FunctionCall,
  ReminderRequiredRequest,
  ResponseRequiredRequest,
  Utterance,
} from "../types";

// Initial greeting and introduction for the rubber ducky assistant.
const beginSentence = "Quack quack! How can I help you debug your code today?";

// Main task definition for the rubber ducky assistant.
const task = `
As a rubber ducky debugging assistant, your primary role is to help the user write, debug, and understand their code. 
You are equipped with a deep understanding of computer science concepts, algorithms, and programming languages, so you can easily assist with problems related to coding, debugging, and computer science theory.
Whenever the user describes an issue or shares a piece of code, you attentively help them troubleshoot it. You should also guide them through the thought process to help them better understand the problem and solution.
Additionally, if the user mentions something related to programming but it’s unclear (like a misheard "Fizzbuzz" as "thisbuzz"), you should be able to recognize the intended term or problem and gently guide them in the right direction.
Your goal is to offer assistance, clarification, and reassurance in a friendly and approachable way.
`;

// Conversational style description.
const conversationalStyle = `
You, the rubber ducky debugging assistant, have a polite, patient, and friendly conversational style. 
You encourage the user to keep trying and celebrate their progress. You are approachable and make it easy to engage in an ongoing conversation.
`;

// Personality description for the rubber ducky assistant.
const personality = `
You are positive, supportive, patient, and understanding. You never get frustrated and are always calm, no matter how tricky the problem might be. 
You offer thoughtful responses and adapt your tone based on the user's needs. Your goal is to make debugging and learning about computer science fun and stress-free.
`;

// Objective of the rubber ducky assistant.
const objective = `
Your primary objective is to assist the user with their code by debugging issues, explaining concepts, and offering solutions to coding problems. 
You are also there to help them understand computer science concepts and guide them in solving coding challenges like those found on coding platforms (e.g., LeetCode, HackerRank, etc.).
You should be familiar with many common coding patterns, data structures, algorithms, and core computer science topics that might come up during discussions.
`;

// Style guardrails for maintaining proper tone.
const styleGuardrails = `
## Style Guardrails
Your responses should always be polite, clear, and patient. 
Be friendly, calm, and encouraging—never show frustration or negativity.
If the user makes an error or expresses confusion, gently help them understand the problem in a supportive way. 
Never mock or criticize the user for asking questions or struggling. Instead, praise their efforts and offer helpful advice. 
`;

// Response guideline for how to respond to the user.
const responseGuideline = `
## Response Guideline
When responding, aim to break down technical concepts into digestible chunks. 
Use simple language, and if needed, provide examples to clarify your explanation.
Make sure to guide the user step-by-step, encouraging them as they work through their code. 
Provide code suggestions or explanations that lead them to the solution, and help them understand what went wrong in their code.
If the user is stuck, offer advice that motivates them to keep trying and reminds them that debugging is part of the learning process.
`;

// Examples of friendly and fun ending messages.
const endingExamples = `
## Ending Messages:

(Note: Feel free to be creative with these, while maintaining the friendly, rubber ducky persona)
- Quack quack, well done! Keep going!
- You’re doing great! Quack quack!
- Hooray! Debugging complete! Keep it up, quack!
`;

// The role of the rubber ducky assistant summarized for system prompt.
const systemPrompt = `
You are a friendly rubber duck debugging assistant, specially trained to help users with their code and computer science concepts.
You have a broad knowledge of computer science topics such as algorithms, data structures, and fundamental coding challenges like FizzBuzz, sorting algorithms, recursion, and more. 
You can handle coding problems in various programming languages, and you're particularly adept at helping users understand why their code isn't working and guiding them towards a solution.
Your ability to recognize when a user is talking about programming, even if they mispronounce or mistype certain terms, allows you to better assist them. For example, if they say "thisbuzz" instead of "FizzBuzz," you immediately recognize it as a common LeetCode problem and provide relevant assistance.
You are always positive, patient, and easy to talk to. Your responses should be clear, concise, and encouraging, helping users feel confident in their coding journey.
`;

// The assistant's system-level prompt to tie everything together.
const agentPrompt = `
Task:
${task}

Conversational Style:
${conversationalStyle}

Personality:
${personality}

System Instructions:
${systemPrompt}

Objective:
${objective}

Response Guideline:
${responseGuideline}

Ending Examples:
${endingExamples}
`;

export class FunctionCallingLlmClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_APIKEY,
    });
  }

  // First sentence requested
  BeginMessage(ws: WebSocket) {
    const res: CustomLlmResponse = {
      response_type: "response",
      response_id: 0,
      content: beginSentence,
      content_complete: true,
      end_call: false,
    };
    ws.send(JSON.stringify(res));
  }

  private ConversationToChatRequestMessages(conversation: Utterance[]) {
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    for (const turn of conversation) {
      result.push({
        role: turn.role === "agent" ? "assistant" : "user",
        content: turn.content,
      });
    }
    return result;
  }

  private PreparePrompt(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    funcResult?: FunctionCall,
  ) {
    const transcript = this.ConversationToChatRequestMessages(
      request.transcript,
    );
    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        {
          role: "system",
          content: systemPrompt,
        },
      ];
    for (const message of transcript) {
      requestMessages.push(message);
    }

    // Populate func result to prompt so that GPT can know what to say given the result
    if (funcResult) {
      // add function call to prompt
      requestMessages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: funcResult.id,
            type: "function",
            function: {
              name: funcResult.funcName,
              arguments: JSON.stringify(funcResult.arguments),
            },
          },
        ],
      });
      // add function call result to prompt
      requestMessages.push({
        role: "tool",
        tool_call_id: funcResult.id,
        content: funcResult.result || "",
      });
    }

    if (request.interaction_type === "reminder_required") {
      requestMessages.push({
        role: "user",
        content: "(Now the user has not responded in a while, you would say:)",
      });
    }
    return requestMessages;
  }

  // Step 2: Prepare the function calling definition to the prompt
  // Done in tools import

  async DraftResponse(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    ws: WebSocket,
    funcResult?: FunctionCall,
  ) {
    // If there are function call results, add it to prompt here.
    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      this.PreparePrompt(request, funcResult);

    let funcCall: FunctionCall | undefined;
    let funcArguments = "";

    try {
      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "end_call",
            description: "End the call only when the user explicitly requests it.",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description:
                    "The message you will say before ending the call with the customer.",
                },
              },
              required: ["message"],
            },
          },
        },
      ];

      const events = await this.client.chat.completions.create({
        model: "gpt-4o",
        // model: "gpt-4o-mini",
        messages: requestMessages,
        stream: true,
        temperature: 1.0,
        max_tokens: 200,
        frequency_penalty: 1.0,
        presence_penalty: 1.0,
        // Step 3: Add the  function into your requests
        tools: tools,
      });

      for await (const event of events) {
        if (event.choices.length >= 1) {
          const delta = event.choices[0].delta;
          //if (!delta || !delta.content) continue;
          if (!delta) continue;

          // Step 4: Extract the functions
          if (delta.tool_calls && delta.tool_calls.length >= 1) {
            const toolCall = delta.tool_calls[0];
            // Function calling here
            if (toolCall.id) {
              if (funcCall) {
                // Another function received, old function complete, can break here
                // You can also modify this to parse more functions to unlock parallel function calling
                break;
              } else {
                funcCall = {
                  id: toolCall.id,
                  funcName: toolCall.function?.name || "",
                  arguments: {},
                };
              }
            } else {
              // append argument
              funcArguments += toolCall.function?.arguments || "";
            }
          } else if (delta.content) {
            const res: CustomLlmResponse = {
              response_type: "response",
              response_id: request.response_id,
              content: delta.content,
              content_complete: false,
              end_call: false,
            };
            ws.send(JSON.stringify(res));
          }
        }
      }
    } catch (err) {
      console.error("Error in gpt stream: ", err);
    } finally {
      if (funcCall != null) {
        // Step 5: Call the functions

        // If it's to end the call, simply send a lst message and end the call
        if (funcCall.funcName === "end_call") {
          funcCall.arguments = JSON.parse(funcArguments);
          const res: CustomLlmResponse = {
            response_type: "response",
            response_id: request.response_id,
            content: funcCall.arguments.message,
            content_complete: true,
            end_call: true,
          };
          ws.send(JSON.stringify(res));
        }

        // If it's to book appointment, say something and book appointment at the same time
        // and then say something after booking is done
        if (funcCall.funcName === "book_appointment") {
          funcCall.arguments = JSON.parse(funcArguments);
          const res: CustomLlmResponse = {
            response_type: "response",
            response_id: request.response_id,
            // LLM will return the function name along with the message property we define
            // In this case, "The message you will say while setting up the appointment like 'one moment' "
            content: funcCall.arguments.message,
            // If content_complete is false, it means AI will speak later.
            // In our case, agent will say something to confirm the appointment, so we set it to false
            content_complete: false,
            end_call: false,
          };
          ws.send(JSON.stringify(res));

          // To make the tool invocation show up in transcript
          const functionInvocationResponse: CustomLlmResponse = {
            response_type: "tool_call_invocation",
            tool_call_id: funcCall.id,
            name: funcCall.funcName,
            arguments: JSON.stringify(funcCall.arguments)
          };
          ws.send(JSON.stringify(functionInvocationResponse));

          // Sleep 2s to mimic the actual appointment booking
          // Replace with your actual making appointment functions
          await new Promise((r) => setTimeout(r, 2000));
          funcCall.result = "Appointment booked successfully";

          // To make the tool result show up in transcript
          const functionResult: CustomLlmResponse = {
            response_type: "tool_call_result",
            tool_call_id: funcCall.id,
            content: "Appointment booked successfully",
          };
          ws.send(JSON.stringify(functionResult));

          this.DraftResponse(request, ws, funcCall);
        }
      } else {
        const res: CustomLlmResponse = {
          response_type: "response",
          response_id: request.response_id,
          content: "",
          content_complete: true,
          end_call: false,
        };
        ws.send(JSON.stringify(res));
      }
    }
  }
}
