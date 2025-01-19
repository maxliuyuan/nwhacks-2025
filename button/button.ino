#include <Servo.h>

// object setup
Servo myServo;
int incoming = 0;


// pin setup
const int BTN_PIN = 8;
const int SERVO_PIN = 9;
const int LED_PIN = 10;


// button shit
const int LATENCY = 50;
int STATE = 0;               
int PREV_BUTTON_STATE = LOW;        
int BUTTON_STATE;           
unsigned long last_changed = 0;

// servo shit
int servoAngle = 0;
int servoAngleInc = 180;
int servoDirection = 0;
const unsigned long servoInterval = 500; // Servo update interval in milliseconds
unsigned long lastServoMoveTime = 0;


// LED shit
int nxtLEDState = HIGH;

void setup() {
  myServo.attach(SERVO_PIN);
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP); 
}

void toggleLED() {
  digitalWrite(LED_PIN, nxtLEDState);
  if(nxtLEDState == HIGH) {
    nxtLEDState = LOW;
  } else {
    nxtLEDState = HIGH;
  }
}

void run_servo() {
  // Check if it's time to move the servo
  unsigned long currentTime = millis();
  if (currentTime - lastServoMoveTime >= servoInterval) {
    lastServoMoveTime = currentTime;

    // Update servo direction if at limits
    if (servoAngle >= 180) {
      servoDirection = 1;
    } else if (servoAngle <= 0) {
      servoDirection = 0;
    }

    // Change the angle based on direction
    if (servoDirection == 0) {
      servoAngle += servoAngleInc;
    } else {
      servoAngle -= servoAngleInc;
    }
    myServo.write(servoAngle); // Move the servo to the new angle
  }
}

void read() {
  incoming = Serial.read();
  if (incoming != -1) Serial.println(incoming);
  if (incoming == '1') {
    STATE = 1;
  } else if (incoming == '0') {
    STATE = 0;
  }
}


void button_handler() {
  BUTTON_STATE = digitalRead(BTN_PIN);

  // check if the button state has changed
  if (BUTTON_STATE != PREV_BUTTON_STATE && millis() - last_changed > LATENCY) {
    last_changed = millis();

    if (BUTTON_STATE == LOW) {
      Serial.println("BUTTON_PRESS");
      toggleLED();
      STATE ^= 1;
    }
  }

  PREV_BUTTON_STATE = BUTTON_STATE;
}

void loop() {
  button_handler();
  read();
  if (STATE) {
    run_servo();
  }

}