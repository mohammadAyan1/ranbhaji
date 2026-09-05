import wave
import struct
import math
import os

os.makedirs("assets/sounds", exist_ok=True)

def generate_sound(filename, frequency, duration=60.0, volume=0.5):
    sample_rate = 44100.0
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        for i in range(int(sample_rate * duration)):
            # Create a simple pulsing effect
            pulse = math.sin(2.0 * math.pi * 5.0 * (i / sample_rate))
            value = int(volume * 32767.0 * math.sin(2.0 * math.pi * frequency * (i / sample_rate)) * (0.5 + 0.5 * pulse))
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

if __name__ == "__main__":
    generate_sound("assets/sounds/alarm1.wav", 440.0) # A4
    generate_sound("assets/sounds/alarm2.wav", 523.25) # C5
    generate_sound("assets/sounds/alarm3.wav", 659.25) # E5
    generate_sound("assets/sounds/alarm4.wav", 783.99) # G5
    generate_sound("assets/sounds/alarm5.wav", 987.77) # B5
    print("5 alarm sounds generated.")
