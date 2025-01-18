int push_btn_pin = 8;
int pushBTN_state;
int lastBTN_state = LOW;

void setup() {
  Serial.begin(9600);
  pinMode(push_btn_pin, INPUT);
}

void loop() {
  pushBTN_state = digitalRead(push_btn_pin);

  // Check if the button state has changed
  if (pushBTN_state == HIGH && lastBTN_state == LOW) {
    Serial.println("BUTTON_PRESS");
    delay(50); // Debounce delay
  }

  lastBTN_state = pushBTN_state;
  delay(5);
}
