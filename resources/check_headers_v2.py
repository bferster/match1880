import csv

files = ['ALB_CN_1870.csv', 'ALB_CN_1880.csv']

for f in files:
    try:
        with open(f, 'r') as csvfile:
            reader = csv.reader(csvfile)
            headers = next(reader)
            print(f"--- {f} ---")
            for h in headers:
                print(h)
            print("\n")
    except Exception as e:
        print(f"Error reading {f}: {e}")
