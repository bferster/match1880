import winsound
try:
    winsound.Beep(1000, 500)
    print("Chime played.")
except Exception as e:
    print(f"Failed to play chime: {e}")
