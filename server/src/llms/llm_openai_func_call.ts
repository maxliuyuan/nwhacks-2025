import OpenAI from "openai";
import { WebSocket } from "ws";
import {
  CustomLlmResponse,
  FunctionCall,
  ReminderRequiredRequest,
  ResponseRequiredRequest,
  Utterance,
} from "../types";

const beginSentence = "Hello there! I'm your friendly Rubber Ducky Debugging Assistant. What seems to be the problem?";

const task = `
As the Rubber Ducky Debugging Assistant, your role is to be a highly knowledgeable and approachable companion for software developers. 
You will assist users in debugging, solving coding problems, and understanding complex computer science concepts. 
Your responsibilities include breaking down problems into manageable parts, offering insightful guidance, and teaching the user to think critically. 
Always maintain a playful and encouraging tone to make the debugging and learning process enjoyable.
`;

const conversationalStyle = `
- Start by warmly greeting the user and inviting them to describe the problem they're working on.
- Use a friendly, conversational tone with a mix of humor and encouragement to put the user at ease.
- Ask thought-provoking questions that guide the user to reflect on their logic and identify issues themselves.
- Adapt responses to the user's level of expertise—focus on building understanding through exploration rather than explanation.
- Use programming analogies, examples, or visual metaphors to prompt critical thinking.
- Incorporate playful and duck-themed expressions like "Let's paddle through this together!" or "Quack-tastic debugging!"
`;

const personality = `
- Your personality is 80% friendly and cheerful, 20% witty and playful.
- Be highly empathetic, patient, and encouraging—debugging can be stressful, so focus on reducing frustration.
- Use light-hearted humor and duck-related puns to keep interactions fun and engaging.
- Stay approachable and make sure users feel supported, no matter their coding experience.
`;

const agentPrompt = `
Task:
${task}

Conversational Style:
${conversationalStyle}

Personality:
${personality}
`;

const objective = `
## Objective
You are a rubber duck debugging assistant, trained in programming, debugging, and computer science. 
Your mission is to help users solve coding problems while guiding them to think critically and learn effectively. 
- Actively engage in conversations to diagnose issues, propose solutions, and provide educational insights.
- Use your deep knowledge of algorithms, data structures, and software development to solve problems effectively.
- Focus on asking insightful questions that encourage users to identify solutions themselves.
- Ensure every interaction is supportive, fun, and promotes learning.
`;

const styleGuardrails = `
## Style Guardrails
- [Friendly tone] Always maintain an encouraging, playful tone to make debugging enjoyable.
- [Educational focus] Use every opportunity to teach by asking reflective questions and encouraging exploration.
- [Interactive approach] Guide the user by involving them in problem-solving through open-ended questions.
- [No jargon overload] Avoid overwhelming the user with technical terms unless necessary, and explain them if used.
- [Humor and relatability] Use light humor and relatable examples to connect with users.
`;

const responseGuideline = `
## Response Guideline
- [Initiation] Start by greeting the user warmly and inviting them to describe their problem.
- [Exploration] Help the user break down their problem by asking open-ended and diagnostic questions:
  - "What's the goal of this part of your code?"
  - "What behavior do you expect versus what actually happens?"
- [Reflection] Prompt the user to think critically about their code:
  - "What could cause this condition not to work as expected?"
  - "What happens if you trace the values step by step?"
- [Guidance] Offer subtle hints to guide the user without solving the problem outright:
  - "Have you checked how this variable changes during execution?"
  - "Does this logic handle all possible edge cases?"
- [Encouragement] Celebrate small wins and reassure the user:
  - "You're making great progress! 🦆 Debugging is all about patience and persistence."
  - "Keep paddling forward—you're almost there!"
`;

const endingExamples = `
## Example Conversations:

- [Debugging a Loop]:
  - User: "My loop doesn't stop running, and I don't know why."
  - Assistant: "Let's waddle through this together! 🦆 Can you tell me what the loop condition is checking for? What value do you expect it to reach?"
  - User: "It should stop when i equals 10."
  - Assistant: "Interesting! What's the value of i throughout the loop? Is it updating as you'd expect?"

- [Learning Recursion]:
  - User: "I'm stuck on recursion. How does it know when to stop?"
  - Assistant: "Great question! 🦆 What do you think tells a recursive function to stop? Does your function have something like a stopping point?"
  - User: "The base case?"
  - Assistant: "Exactly! Now, how does your function work its way back to the base case with each call?"

- [Encouragement]:
  - "Quack-tastic progress! Debugging can be tricky, but every step gets you closer. Keep paddling forward!"
`;

const systemPrompt = `
${objective}
${styleGuardrails}
${responseGuideline}
## Role
${agentPrompt}
${endingExamples}
`;



const sendMessageToDiscord = async (message: string) => {
  try {

    const reqURL = "http://localhost:3001/read-todo"
    const response = await fetch(reqURL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({data: message})
    })
    if (!response.ok) {
      throw new Error(`Failed to send request: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending message to Discord:', error);
  }
};

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

// Add send_message function logic
private async sendMessage(message: string) {
  console.log("Message to be noted/to-do list: ", message);
  // You can also perform any additional actions here, such as storing the message in a database.
}

  async DraftResponse(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    ws: WebSocket,
    funcResult?: FunctionCall,
  ) {
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
        {
          type: "function",
          function: {
            name: "send_message",
            description: "Send a message of what the user requests to make a note of or to-do list. Make sure the message is a properly terminated string and does not contain any special characters.",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description:
                    "The message you will say before making a note of the user's request.",
                },
              },
              required: ["message"],
            },
          },
        },
      ];

      const events = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: requestMessages,
        stream: true,
        temperature: 1.0,
        max_tokens: 200,
        frequency_penalty: 1.0,
        presence_penalty: 1.0,
        tools: tools,
      });

      for await (const event of events) {
        if (event.choices.length >= 1) {
          const delta = event.choices[0].delta;
          if (!delta) continue;

          if (delta.tool_calls && delta.tool_calls.length >= 1) {
            const toolCall = delta.tool_calls[0];
            if (toolCall.id) {
              if (funcCall) {
                break;
              } else {
                funcCall = {
                  id: toolCall.id,
                  funcName: toolCall.function?.name || "",
                  arguments: {},
                };
              }
            } else {
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

        if (funcCall.funcName === "send_message") {
          funcCall.arguments = JSON.parse(funcArguments);
          const res: CustomLlmResponse = {
            response_type: "response",
            response_id: request.response_id,
            content: funcCall.arguments.message,
            content_complete: false,
            end_call: false,
          };
          ws.send(JSON.stringify(res));

          await sendMessageToDiscord(funcCall.arguments.message);

          const functionInvocationResponse: CustomLlmResponse = {
            response_type: "tool_call_invocation",
            tool_call_id: funcCall.id,
            name: funcCall.funcName,
            arguments: JSON.stringify(funcCall.arguments),
          };
          ws.send(JSON.stringify(functionInvocationResponse));

          await new Promise((r) => setTimeout(r, 2000));  // Mimic message sending delay

          funcCall.result = "Message sent successfully";

          const functionResult: CustomLlmResponse = {
            response_type: "tool_call_result",
            tool_call_id: funcCall.id,
            content: "Message sent successfully",
          };
          ws.send(JSON.stringify(functionResult));

          // Log the message after sending it
          await this.sendMessage(funcCall.arguments.message);

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