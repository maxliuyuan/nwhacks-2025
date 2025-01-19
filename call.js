import { RetellWebClient } from "retell-client-js-sdk";

const retellWebClient = new RetellWebClient();

await retellWebClient.startCall({
  accessToken: createCallResponse.access_token,
});

retellWebClient.on("call_started", () => {
  console.log("call started");
});

retellWebClient.on("call_ended", () => {
  console.log("call ended");
  setIsCallActive(false);
});

// When agent starts talking for the utterance
// useful for animation
retellWebClient.on("agent_start_talking", () => {
  console.log("agent_start_talking");
});

// When agent is done talking for the utterance
// useful for animation
retellWebClient.on("agent_stop_talking", () => {
  console.log("agent_stop_talking");
});

// Real time pcm audio bytes being played back, in format of Float32Array
// only available when emitRawAudioSamples is true
retellWebClient.on("audio", (audio) => {
  // console.log(audio);
});

// Update message such as transcript
// You can get transcrit with update.transcript
// Please note that transcript only contains last 5 sentences to avoid the payload being too large
retellWebClient.on("update", (update) => {
  // console.log(update);
});

retellWebClient.on("metadata", (metadata) => {
  // console.log(metadata);
});

retellWebClient.on("error", (error) => {
  console.error("An error occurred:", error);
  // Stop the call
  retellWebClient.stopCall();
});
