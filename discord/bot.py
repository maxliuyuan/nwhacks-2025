import os
import discord
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
import threading
import asyncio
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
GUILD = os.getenv('DISCORD_GUILD')

intents = discord.Intents.default()
intents.message_content = True

# This class is used to send messages to Discord through FastAPI
class Message(BaseModel):
    content: str

class Bot:
    def __init__(self):
        self.client = discord.Client(intents=intents)
        self.terminate = False
        self.app = FastAPI()
        self.setup_routes()
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000"],  # Allow frontend to access
            allow_credentials=True,
            allow_methods=["*"],  # Allow all HTTP methods
            allow_headers=["*"],  # Allow all headers
        )

        @self.client.event
        async def on_ready():
            print(f'We have logged in as {self.client.user}')

        @self.client.event
        async def on_message(message):
            if message.author == self.client.user:
                return
            if message.content.startswith('penis'):
                await message.channel.send('cock')

    def setup_routes(self):
        @self.app.get("/")
        def read_root():
            return {"message": "Bot is running!"}

        @self.app.post("/send_message/")
        async def send_message(message: Message):
            # This route will send a message to Discord channel
            channel = self.client.get_channel(int(os.getenv('DISCORD_CHANNEL_ID')))  # Your channel ID here
            await channel.send(message.content)
            return {"status": "Message sent successfully"}

    async def runClient(self):
        await self.client.start(TOKEN)

    async def runApp(self):
        config = uvicorn.Config(self.app, host="127.0.0.1", port=3001, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()

async def main():
    bot = Bot()

    # Run both FastAPI and Discord bot concurrently
    await asyncio.gather(
        bot.runApp(),
        bot.runClient()
    )

if __name__ == "__main__":
    asyncio.run(main())