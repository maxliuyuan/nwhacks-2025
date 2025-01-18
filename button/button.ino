#include <Servo.h>

int BTN_PIN = 8;
int STATE = 0;               
int PREV_STATE = LOW;        
int BUTTON_STATE;           
unsigned long last_changed = 0; 
const int LATENCY = 50;
Servo servo;


void setup() {
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
      Serial.print("state: ");
      Serial.println(STATE);
    }
  }

  PREV_STATE = BUTTON_STATE;
}

void get_sound() {

}

void run_servo() {
  
}



void loop() {
  button_handler();
  if (STATE) {
    get_sound();
    run_servo();

  }

}
