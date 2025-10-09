#!/usr/bin/env node

/**
 * Test du scraper - Mode debug
 */

const ComprehensiveN8nScraper = require('./scrape-all-n8n-nodes');

async function test() {
  const scraper = new ComprehensiveN8nScraper();

  console.log('🔍 Découverte des nodes...\n');
  await scraper.discoverAllNodes();

  console.log(`\n📊 ${scraper.nodes.length} nodes découverts\n`);

  // Afficher les 10 premiers
  console.log('📄 Premiers nodes:');
  scraper.nodes.slice(0, 10).forEach((node, i) => {
    console.log(`${i + 1}. ${node.name}`);
    console.log(`   URL: ${node.url}`);
    console.log(`   Category: ${node.category}\n`);
  });

  // Tester le scraping d'UN node
  if (scraper.nodes.length > 0) {
    console.log('\n🧪 Test scraping du premier node...\n');

    const testNode = scraper.nodes[0];
    console.log(`Testing: ${testNode.name}`);
    console.log(`URL: ${testNode.url}\n`);

    try {
      const result = await scraper.scrapeNode(testNode);

      if (result) {
        console.log('\n✅ Scraping réussi !');
        console.log(`Title: ${result.title}`);
        console.log(`Description: ${result.description.substring(0, 100)}...`);
        console.log(`Content length: ${result.content.length} chars`);
        console.log(`Operations: ${result.operations.length}`);
        console.log(`Examples: ${result.examples.length}`);
      } else {
        console.log('\n❌ Scraping échoué (null result)');

        // Afficher les erreurs du scraper
        if (scraper.errors.length > 0) {
          console.log('\nErreurs:');
          scraper.errors.forEach(err => {
            console.log(`- ${err.node}: ${err.error}`);
          });
        }
      }
    } catch (error) {
      console.log('\n❌ Exception:', error.message);
      console.log(error.stack);
    }
  }
}

test().catch(console.error);
