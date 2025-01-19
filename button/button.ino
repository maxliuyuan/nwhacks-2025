#include <Servo.h>

// button shit
const int BTN_PIN = 8;
int STATE = 0;               
int PREV_STATE = LOW;        
int BUTTON_STATE;           
unsigned long last_changed = 0; 
const int LATENCY = 50;

// servo shit
Servo servo;
int pos = 0;
const int SERVO_PIN = 9;

void setup() {
  servo.attach(SERVO_PIN);
  Serial.begin(9600);
  pinMode(BTN_PIN, INPUT_PULLUP); 
}

void button_handler() {
  BUTTON_STATE = digitalRead(BTN_PIN);

  // check if the button state has changed
  if (BUTTON_STATE != PREV_STATE && millis() - last_changed > LATENCY) {
    last_changed = millis();

    if (BUTTON_STATE == LOW) {
      STATE ^= 1;
    }
  }

  PREV_STATE = BUTTON_STATE;
}

void get_sound() {

}

void run_servo() {
  for (pos = 0; pos <= 10; pos += 2) {
    servo.write(pos);

  }
}



void loop() {
  button_handler();
  if (STATE) {
    get_sound();
    run_servo();

  }

}
