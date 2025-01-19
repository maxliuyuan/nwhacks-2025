#include <Servo.h>

Servo myServo;

int BTN_PIN = 8;
int SERVO_PIN = 9;
int LED_PIN = 10;

// servo vars
int servoAngle = 0;
int servoAngleInc = 45;
int servoDirection = 0;

// btn vars
int btnState;
int lastBtnState = LOW;

// led vars
int nxtLEDState = HIGH;

void rotateServo() {
  if (servoAngle >= 180) {
    servoDirection = 1;
  } else if (servoAngle <= 0) {
    servoDirection = 0;
  }

  if (servoDirection == 0) {
    servoAngle += servoAngleInc;
  } else {
    servoAngle -= servoAngleInc;
  }
  myServo.write(servoAngle);  // Move the servo to the new angle
  delay(300);                 // Delay to debounce the button (prevents multiple triggers)
}

void toggleLED() {
  digitalWrite(LED_PIN, nxtLEDState);
  if(nxtLEDState == HIGH) {
    nxtLEDState = LOW;
  } else {
    nxtLEDState = HIGH;
  }
}

void setup() {
  Serial.begin(9600);
  // button
  pinMode(BTN_PIN, INPUT);
  // servo
  myServo.attach(SERVO_PIN);
  myServo.write(servoAngle);
  // led
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  btnState = digitalRead(BTN_PIN);

  

  // Check if the button state has changed
  if (btnState == HIGH && lastBtnState == LOW) {
    // Push message to serial port
    Serial.println("BUTTON_PRESS");

    // rotate servo
    rotateServo();
    Serial.println(servoAngle);

    toggleLED();
  }

  lastBtnState = btnState;
  delay(5);
}
