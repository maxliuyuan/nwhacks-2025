from retell import Retell

client = Retell(
    api_key="key_ce6b06ad98cb7b99a09d84a5f733",
)

# agent_response = client.agent.create(
#     response_engine={
#         "llm_id": "llm_0c9987db66e562a8e43d99a09591",
#         "type": "retell-llm",
#     },
#     voice_id="11labs-Adrian",
# )
# print(agent_response.agent_id)

web_call_response = client.call.create_web_call(
    agent_id="agent_326df6ce5685fb8e6f66ab9ab5",
)
print(web_call_response.agent_id)