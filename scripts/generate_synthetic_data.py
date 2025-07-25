import json
import random
import string
from datetime import datetime, timedelta
import os

def generate_random_string(length=10):
    """Generating random string for synthetic data."""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for _ in range(length))

def generate_synthetic_data(config_path):
    """Generating synthetic data based on configuration."""
    with open(config_path, 'r') as f:
        config = json.load(f)

    synthetic_data = {}
    for data_type, settings in config["data_generation"].items():
        data_list = []
        for _ in range(settings["count"]):
            record = {}
            for field in settings["fields"]:
                if field == "name":
                    record[field] = generate_random_string(8)
                elif field == "email":
                    record[field] = f"{generate_random_string(5)}@{random.choice(settings['constraints']['email']['domain'])}"
                elif field == "age":
                    record[field] = random.randint(settings["constraints"]["age"]["min"], settings["constraints"]["age"]["max"])
                elif field == "location":
                    record[field] = generate_random_string(6)
                elif field == "transaction_id":
                    record[field] = generate_random_string(12)
                elif field == "amount":
                    record[field] = round(random.uniform(settings["constraints"]["amount"]["min"], settings["constraints"]["amount"]["max"]), 2)
                elif field == "date":
                    start_date = datetime(2023, 1, 1)
                    random_days = random.randint(0, 365)
                    record[field] = (start_date + timedelta(days=random_days)).isoformat()
                elif field == "status":
                    record[field] = random.choice(settings["constraints"]["status"])
            data_list.append(record)
        synthetic_data[data_type] = data_list

    output_dir = config["output_path"]
    os.makedirs(output_dir, exist_ok=True)
    with open(f"{output_dir}synthetic_data.json", 'w') as f:
        json.dump(synthetic_data, f, indent=2)

if __name__ == "__main__":
    generate_synthetic_data("src/config/synthetic_data_config.json")