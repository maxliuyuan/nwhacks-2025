import os
import discord
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
from enum import Enum
import threading
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import datetime
import signal

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
GUILD = os.getenv('DISCORD_GUILD')

intents = discord.Intents.default()
intents.message_content = True
channel_id = 1330484653852725258

class Bot:
    def __init__(self):
        self.terminate = False
        self.app = FastAPI()
        self.client = discord.Client(intents=intents)
        self.setup_routes()
        self.setup_discord_events()
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def setup_discord_events(self):
        @self.client.event
        async def on_ready():
            print(f'We have logged in as {self.client.user}')
            channel = self.client.get_channel(channel_id)
            if channel:
                await channel.send("bot initialized at: " + str(datetime.datetime.now()))

        @self.client.event
        async def on_message(message):
            if message.author == self.client.user:
                return
            if message.content.startswith('penis'):
                await message.channel.send('cock')

    def setup_routes(self):
        @self.app.get("/")
        async def read_root():
            channel = self.client.get_channel(channel_id)
            if channel:
                print("good morning gang")
                await channel.send("endpoint accessed at: " + str(datetime.datetime.now()))
            return {"status": "ok"}

        @self.app.get("/shutdown")
        async def shutdown():
            await self.client.close()
            await asyncio.sleep(5)
            self.kms()
            return {"status": "shutting down"}

    def kms(self):
        os.kill(os.getpid(), signal.SIGINT)

    async def start_discord(self):
        await self.client.start(TOKEN)

    def run_fastapi(self):
        uvicorn.run(self.app, host="127.0.0.1", port=3001)

    def run(self):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        fastapi_thread = threading.Thread(target=self.run_fastapi)
        fastapi_thread.start()
        
        try:
            loop.run_until_complete(self.start_discord())
        except KeyboardInterrupt:
            loop.run_until_complete(self.client.close())
        finally:
            loop.close()

if __name__ == "__main__":
    bot = Bot()
    bot.run()