const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const edgeConfigGet = require("@vercel/edge-config").get;
const envConfig = require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, "data", "movies.json");

console.log(process.env.EDGE_CONFIG);
app.use(cors());
app.use(express.json());

async function updateEdgeConfig(key, value){

  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const accessToken = process.env.VERCEL_ACCESS_TOKEN;

  const apiURL = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`;

  try{

      console.log(key);
      console.log(value);
      const response = await fetch(apiURL, {
          method: "PATCH",
          headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              items: [
                  {
                      operation: "upsert",
                      key: key,
                      value: value
                  }
              ]
          })
      });

      const json = await response.json();
      console.log(json);
  } catch (error) {
      console.log(error);
  }
}

// Helper to read data
async function readData() {
  try {
    const moviesList = await edgeConfigGet("moviesList");
    return moviesList;
  } catch (error) {
    console.error("Error reading data file:", error);
    return [];
  }
}

// Helper to write data
async function writeData(data) {
  try {
    await updateEdgeConfig("moviesList", data);
  } catch (error) {
    console.error("Error writing data file:", error);
    throw error;
  }
}

// Get all movies
app.get("/movies", async (req, res) => {
  try {
    const movies = await readData();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// Add a new movie
app.post("/movies", async (req, res) => {
  try {
    const { title, image, actors, director } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const movies = await readData();
    const newMovie = {
      id: Date.now().toString(),
      title,
      watched: false,
      rating: 0,
      image: image || "",
      actors: actors || "",
      director: director || "",
    };

    movies.push(newMovie);
    await writeData(movies);
    res.status(201).json(newMovie);
  } catch (error) {
    res.status(500).json({ error: "Failed to add movie" });
  }
});

// Update a movie (watched status, rating, etc)
app.put("/movies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const movies = await readData();
    const index = movies.findIndex((m) => m.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Movie not found" });
    }

    movies[index] = { ...movies[index], ...updates };
    await writeData(movies);

    res.json(movies[index]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update movie" });
  }
});

// Delete a movie
app.delete("/movies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const movies = await readData();

    const filteredMovies = movies.filter((m) => m.id !== id);

    if (movies.length === filteredMovies.length) {
      return res.status(404).json({ error: "Movie not found" });
    }

    await writeData(filteredMovies);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

app.listen(PORT, () => {
  console.log(`Movie API running on http://localhost:${PORT}`);
});
