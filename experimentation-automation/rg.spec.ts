import { test } from "@playwright/test";

const iterationCount = 200;

const setup = (test: any) => test.setTimeout(90000);
setup(test);

for (let iteration = 0; iteration < iterationCount; iteration++) {
  test(`iteration: ${iteration}`, async ({ page }) => {

    // await page.goto("http://localhost:3000/api/airports")
  
    // await page.goto("http://localhost:3000/");

    await page.goto("http://localhost:3000/")
  
    await page.click('button.signin')

    console.log("signin clicked")

    // Wait for products to load
    await page.waitForSelector('.flightstatus', { timeout: 60000 });

    // Check if any products have the "to-label"
    const labeledProduct = await page.$('.flightstatus');

    if (!labeledProduct) {
      console.log(`Iteration: ${iteration}, No labels present. Exiting iteration.`);
      return; // Exit the current iteration of the test if no labeled products are found
    }

  
    await page.click('div.flightstatus')
    await page.waitForTimeout(1000)
    // Logging to see the actions taken
    console.log(`Iteration: ${iteration}`);
  })
}