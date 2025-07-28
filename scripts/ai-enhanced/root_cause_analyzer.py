import pandas as pd

def analyze(log_file):
    df = pd.read_csv(log_file)
    print(df.describe())
    # Add Root Cause Analysis logic here

if __name__ == "__main__":
    analyze("../data/chaos/fault-patterns/serviceA_faults.csv")
