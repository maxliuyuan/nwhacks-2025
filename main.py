import serial
from enum import Enum

class Listening(Enum):
    OFF = 0
    ON = 1

class ButtonListener:
    def __init__(self, port, baud_rate):
        self.ser = serial.Serial(port, baud_rate)
        self.listening_state = Listening.OFF

    def toggle_listening(self):
        if self.listening_state == Listening.OFF:
            self.listening_state = Listening.ON
        else:
            self.listening_state = Listening.OFF

    def listen(self):
        print("Listening for button presses...")
        try:
            while True:
                if self.ser.in_waiting > 0:
                    line = self.ser.readline().decode('utf-8').strip()
                    print(f"Received: {line}")
                    if line == "BUTTON_PRESS":
                        self.toggle_listening()
                        print("Listening:", self.listening_state.name)
        except KeyboardInterrupt:
            print("\nExiting...")
        finally:
            self.ser.close()

# Usage
arduino_port = 'COM3'  # Change this to your Arduino's port
baud_rate = 9600
listener = ButtonListener(arduino_port, baud_rate)
listener.listen()
