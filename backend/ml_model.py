import numpy as np
from sklearn.ensemble import RandomForestClassifier

class DisasterModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=10, random_state=42)
        # Dummy Training Data
        # Features: [rainfall (mm), seismic_activity (Richter scale)]
        X = np.array([
            [10, 0.5], [50, 1.2], [150, 2.0], [250, 1.5], # Flood scenarios
            [0, 3.0], [5, 5.5], [0, 7.2], [10, 8.5]       # Earthquake scenarios
        ])
        # Labels: 0 = Low, 1 = Medium, 2 = High
        y = np.array([0, 1, 2, 2, 0, 1, 2, 2])
        self.model.fit(X, y)

    def predict(self, rainfall, seismic_activity):
        # returns 'Low', 'Medium', or 'High'
        features = np.array([[rainfall, seismic_activity]])
        pred = self.model.predict(features)[0]
        mapping = {0: "Low", 1: "Medium", 2: "High"}
        return mapping.get(pred, "Unknown")

disaster_model = DisasterModel()
