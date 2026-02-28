const fs = require('fs');
const path = require('path');
const movieArt = require('movie-art');

const moviesFile = path.join(__dirname, 'data', 'movies.json');
const movies = require(moviesFile);

async function fetchImages() {
  console.log(`Fetching images for ${movies.length} movies...`);
  
  for (const movie of movies) {
    if (!movie.image) {
      try {
        console.log(`Fetching banner for: ${movie.title}`);
        const url = await movieArt(movie.title);
        if (url && typeof url === 'string' && url.startsWith('http')) {
          movie.image = url;
          console.log(` Found: ${url}`);
        } else {
          console.log(` Not found for ${movie.title}`);
        }
      } catch (err) {
        console.log(` Error fetching for ${movie.title}: ${err.message}`);
      }
      
      // small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 200)); 
    }
  }

  // write back
  fs.writeFileSync(moviesFile, JSON.stringify(movies, null, 2));
  console.log('Finished updating movies.json!');
}

fetchImages();
