import serial
from fastapi import FastAPI
import uvicorn
from enum import Enum
import threading
import os
import signal


class Listening(Enum):
    OFF = 0
    ON = 1

class Ducky:
    def __init__(self, port, baud_rate):
        self.terminate = False
        self.ser = serial.Serial(port, baud_rate)
        self.listening_state = Listening.OFF
        self.app = FastAPI()
        self.setup_routes()

    def setup_routes(self):
        @self.app.get("/")
        def read_root():
            print("Ducky says hi")
            return

        @self.app.get("/move-ducky")
        def move_ducky(state: str):
            print("move state:", state)
            self.ser.write(state.encode())
                
    def toggle_listening(self):
        if self.listening_state == Listening.OFF:
            self.listening_state = Listening.ON
        else:
            self.listening_state = Listening.OFF

    def listen(self):
        print("Listening for button presses...")
        while True:
            if self.ser.in_waiting > 0:
                line = self.ser.readline().decode('utf-8').strip()
                print(f"Received: {line}")
                if line == "BUTTON_PRESS":
                    self.toggle_listening()
                    print("Listening:", self.listening_state.name)
            if (self.terminate):
                self.ser.write('0'.encode())
                print("\nExiting...")
                self.ser.close()
                break

    def userInput(self):
        while (True):
            try:
                user_input = input()
                if (user_input == "shutdown"):  # add sigint
                    self.terminate = True
                    break
            except:
                self.terminate = True
                break
    
    def kms(self):
        os.kill(os.getpid(), signal.SIGINT)

    
    def run(self):
        listen_thread = threading.Thread(target=self.listen)
        uvicorn_thread = threading.Thread(target=lambda : uvicorn.run(self.app, host="127.0.0.1", port=8000))
        input_thread = threading.Thread(target=self.userInput)

        listen_thread.start()
        uvicorn_thread.start()
        input_thread.start()


        listen_thread.join()
        input_thread.join()
        self.kms()

# Usage
arduino_port = 'COM3'  # Change this to your Arduino's port
baud_rate = 9600
ducky = Ducky(arduino_port, baud_rate)
app = ducky.app

# Run the application (if runninrg the script directly)
if __name__ == "__main__":
    ducky.run()