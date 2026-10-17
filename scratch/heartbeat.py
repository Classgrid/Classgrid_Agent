import time, datetime
i = 0
while True:
    i += 1
    print(f"heartbeat #{i} at {datetime.datetime.now().isoformat()}", flush=True)
    time.sleep(2)
