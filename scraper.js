const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Set the URL of the website you want to visit
const url = 'https://www.andriycraft.page';

// Use axios to make a GET request to the website
axios.get(url)
  .then(response => {
    // Save the response data (HTML content) into a file named index.html
    fs.writeFile('index.html', response.data, (error) => {
      if (error) throw error;
      console.log('Main page saved to index.html');

      // Load the HTML content into Cheerio
      const $ = cheerio.load(response.data);

      // Extract all links from the HTML content
      const links = [];
      $('a').each((i, element) => {
        const href = $(element).attr('href');
        if (href) links.push(href);
      });

      // Download and save the HTML/CSS content of each link
      const downloadPromises = links.map(link => {
        const filename = link.replace(/[^\w\s]/gi, '').replace(/ /g, '_').toLowerCase();
        const parsedUrl = new URL(link);
        const directory = parsedUrl.pathname.split('/').filter(part => part !== '').join('/');
        const dirpath = path.join(__dirname, directory);
        const filepath = path.join(dirpath, `${filename}.html`);

        return axios.get(link)
          .then(response => {
            fs.mkdirSync(dirpath, { recursive: true });
            fs.writeFile(filepath, response.data, (error) => {
              if (error) throw error;
              console.log(`Saved ${filepath}`);
            });
          })
          .catch(error => {
            console.error(`Failed to download ${link}: ${error}`);
          });
      });

      // Wait for all downloads to finish before exiting the script
      Promise.all(downloadPromises)
        .then(() => {
          console.log(`Downloaded and saved content for ${links.length} links`);
        })
        .catch(error => {
          console.error(`Failed to download some links: ${error}`);
        });
    });
  })
  .catch(error => {
    console.error(error);
  });
