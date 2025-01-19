import serial
import webbrowser

# Set the serial port and baud rate
# Change this to the correct port (e.g., "/dev/ttyUSB0" on Linux/Mac)
SERIAL_PORT = "/dev/tty.usbmodem1101"
BAUD_RATE = 9600

# URL of the website
# Replace with website's URL
URL = "www.harrypotter.com"

def main():
    try:
        # Initialize serial connection
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser:
            print("Listening for button presses...")
            while True:
                if ser.in_waiting > 0:
                    line = ser.readline().decode("utf-8").strip()
                    if line == "Button Pressed":
                        print("Opening website...")
                        webbrowser.open(URL)
    except serial.SerialException as e:
        print(f"Error: {e}")
    except KeyboardInterrupt:
        print("Exiting program.")

if __name__ == "__main__":
    main()
