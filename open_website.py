import serial
import webbrowser

# Set the serial port and baud rate
# Change this to the correct port
SERIAL_PORT = "COM3"
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






## without arduino (for testing)
# import webbrowser
# import time

# # URL of the website
# # Replace with website's URL
# URL = "http://www.harrypotter.com"

# def main():
#     try:
#         print("Testing website opening...")
#         # Simulate the button press by adding a delay before opening the website
#         time.sleep(2)  # Wait for 2 seconds (simulating button press delay)
#         print("Opening website...")
#         webbrowser.open(URL)
#     except Exception as e:
#         print(f"Error: {e}")
#     except KeyboardInterrupt:
#         print("Exiting program.")

# if __name__ == "__main__":
#     main()
