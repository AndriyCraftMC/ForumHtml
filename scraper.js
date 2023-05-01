const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Set the URL of the website you want to visit
const url = 'https://www.andriycraft.page';

// Create output directory
fs.mkdirSync("out", { recursive: true });
fs.mkdirSync("out/forum", { recursive: true });

// Create a set to keep track of visited links
const visitedLinks = new Set();

// Define a function to recursively download links
function downloadLinks(links) {
  // Filter out visited links and invalid links
  const filteredLinks = links.filter(link => {
    if (visitedLinks.has(link) || link === '#' || link === '/' || link === 'javascript:void(0)') {
      return false;
    }
    return true;
  });

  // If there are no more links to download, return
  if (filteredLinks.length === 0) {
    return;
  }

  console.log(`Downloading ${filteredLinks.length} links`);

  // Download and save the HTML/CSS content of each link
  const downloadPromises = filteredLinks.map(link => {
    console.log('Downloading ' + link);
    const filename = link.replace(/[^\w\s]/gi, '').replace(/ /g, '_').toLowerCase();
    const parsedUrl = new URL(url + link);
    const directory = parsedUrl.pathname.split('/').filter(part => part !== '').join('/');

    let l_ = url + '/' + link;
    let dirpath = path.join(__dirname, 'out', directory);

    if (link.includes(".php")) {
      l_ = url + '/forum/' + link;
      dirpath = path.join(__dirname, 'out', 'forum', directory);
    }

    const filepath = path.join(dirpath, `${filename}.html`);

    return axios.get(l_)
      .then(response => {
        fs.mkdirSync(dirpath, { recursive: true });
        fs.writeFile(filepath, response.data, (error) => {
          if (error) throw error;
          console.log(`Saved ${filepath}`);

          // Load the HTML content into Cheerio and extract links
          const $ = cheerio.load(response.data);
          const newLinks = [];
          $('a').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
              newLinks.push(href);
            }
          });

          // Recursively download new links
          downloadLinks(newLinks);
        });
      })
      .catch(error => {
        console.error(`Failed to download ${link}: ${error}`);
      });
  });

  // Wait for all downloads to finish before exiting the script
  Promise.all(downloadPromises)
    .then(() => {
      console.log(`Downloaded and saved content for ${filteredLinks.length} links`);
    })
    .catch(error => {
      console.error(`Failed to download some links: ${error}`);
    });

  // Add downloaded links to the visited set
  filteredLinks.forEach(link => visitedLinks.add(link));
}

// Use axios to make a GET request to the website
axios.get(url)
  .then(response => {
    // Save the response data (HTML content) into a file named index.html
    fs.writeFile('./out/index.html', response.data, (error) => {
      if (error) throw error;
      console.log('Main page saved to ./out/index.html');

      // Load the HTML content into Cheerio and extract links
      const $ = cheerio.load(response.data);
      const links = [];
      $('a').each((i, element) => {
        const href = $(element).attr('href');
        if (href) links.push(href);
      });

      // Download initial links
      downloadLinks(links);
    });
  })
  .catch(error => {
    console.error(error);
  });
