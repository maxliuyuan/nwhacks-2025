import os
import discord
from dotenv import load_dotenv
from fastapi import FastAPI, Request
import uvicorn
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

    def setup_discord_events(self):
        @self.client.event
        async def on_ready():
            print(f'We have logged in as {self.client.user}')
            channel = self.client.get_channel(channel_id)
            if channel:
                await channel.send("=========================Session: " + str(datetime.datetime.now())[:19] + "===========================")

        @self.client.event
        async def on_message(message):
            if message.author == self.client.user:
                return
            if message.content.startswith('penis'):
                await message.channel.send('cock')

    def setup_routes(self):
        @self.app.post("/read-analysis")
        async def read_analysis(request: Request):
            channel = self.client.get_channel(channel_id)
            body = await request.json()
            feedback = body.get("data")
            if channel:
                print("good morning gang")
                await channel.send(f"feedback analysis: {feedback}")
            return {"status": "ok"}

        @self.app.get("/shutdown")
        async def shutdown():
            channel = self.client.get_channel(channel_id)
            if channel:
                await channel.send("================================Session Ended================================")
            await self.client.close()
            await asyncio.sleep(5)
            self.kms()
            return {"status": "shutting down"}

    def kms(self):
        os.kill(os.getpid(), signal.SIGINT)

    async def start_discord(self):
        await self.client.start(TOKEN)

    async def run_fastapi(self):
        # Start FastAPI app in the same event loop
        config = uvicorn.Config(self.app, host="127.0.0.1", port=3001)
        server = uvicorn.Server(config)
        await server.serve()

    async def run(self):
        # Create a task to run FastAPI and the discord bot concurrently
        fastapi_task = asyncio.create_task(self.run_fastapi())
        discord_task = asyncio.create_task(self.start_discord())
        
        try:
            await asyncio.gather(fastapi_task, discord_task)
        except KeyboardInterrupt:
            await self.client.close()

if __name__ == "__main__":
    bot = Bot()
    asyncio.run(bot.run())
