import os
import discord
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
from enum import Enum
import threading
import os
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import asyncio

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
GUILD = os.getenv('DISCORD_GUILD')

intents = discord.Intents.default()
intents.message_content = True

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
            print("laskjdlakjdlaskjd")

        @self.app.get("/shutdown")
        def shutdown():
            # parse json shit
            pass

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
    
    