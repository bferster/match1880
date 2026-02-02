import csv

files = ['ALB_CN_1870.csv', 'ALB_CN_1880.csv']

for f in files:
    try:
        with open(f, 'r') as csvfile:
            reader = csv.reader(csvfile)
            headers = next(reader)
            print(f"Headers for {f}:")
            print(headers)
            print("-" * 20)
    except Exception as e:
        print(f"Error reading {f}: {e}")
