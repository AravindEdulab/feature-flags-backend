const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "featureflags.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    await createFeatureFlagsTable();

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

const createFeatureFlagsTable = async () => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL
    )
  `);

  const count = await db.get("SELECT COUNT(*) AS count FROM feature_flags");
  if (count.count === 0) {
    const featureFlags = [
      { name: "New UI", enabled: true },
      { name: "Beta Feature", enabled: false },
      { name: "Dark Mode", enabled: true },
      { name: "Email Notifications", enabled: false },
      { name: "Multi-language Support", enabled: true },
      { name: "Analytics Dashboard", enabled: false },
      { name: "In-App Messaging", enabled: true },
      { name: "Admin Panel Access", enabled: false },
      { name: "Payment Gateway", enabled: true },
      { name: "Advanced Search", enabled: false },
    ];

    const insertQuery =
      "INSERT INTO feature_flags (name, enabled) VALUES (?, ?)";
    for (const feature of featureFlags) {
      await db.run(insertQuery, feature.name, feature.enabled);
    }
  }
};

app.use(express.json());

app.get("/feature-flags", async (req, res) => {
  try {
    const featureFlags = await db.all("SELECT * FROM feature_flags");
    res.json({ featureFlags });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch feature flags" });
  }
});

app.put("/feature-flags/update", async (req, res) => {
  const { id, name, enabled } = req.body;

  try {
    if (id) {
      const result = await db.run(
        "UPDATE feature_flags SET enabled = ? WHERE id = ?",
        enabled,
        id
      );
      if (result.changes === 0) {
        return res
          .status(404)
          .json({ error: "Feature flag with given ID not found" });
      }
    } else if (name) {
      const result = await db.run(
        "UPDATE feature_flags SET enabled = ? WHERE name = ?",
        enabled,
        name
      );
      if (result.changes === 0) {
        return res
          .status(404)
          .json({ error: "Feature flag with given name not found" });
      }
    } else {
      return res.status(400).json({
        error:
          "Please provide either 'id' or 'name' to update the feature flag",
      });
    }

    res.json({ message: "Feature flag updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update feature flag" });
  }
});

initializeDBAndServer();
