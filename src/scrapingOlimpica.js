const express = require("express");
const router = express.Router();
const { chromium } = require("playwright");

const maxTimeToWait = 500000;

router.get("/scraping_olimpica", async (req, res) => {
	const searchTerm = req.query.search;

	if (!searchTerm) {
		return res.status(400).json({ error: "Search term is required" });
	}

	const browser = await chromium.launch();
	const page = await browser.newPage();

	const url = `https://www.olimpica.com/${searchTerm}?_q=${searchTerm}&map=ft`;

	try {
		// Navegar a la página principal
		await page.goto(url);
		// Buscar el input y escribir el término de búsqueda
		//await page.fill('input[placeholder="Busca por nombre, categoría…"]', searchTerm);

		// Hacer clic en el botón de búsqueda
		//await page.press('input[placeholder="Busca por nombre, categoría…"]', "Enter");

		// Esperar a que cargue la página de resultados
		await page.waitForSelector("div#gallery-layout-container", { timeout: maxTimeToWait });

		async function waitForProducts(page) {
			while (true) {
				const productsCount = await page.evaluate(() => {
					return document.querySelectorAll(
						"div.vtex-search-result-3-x-galleryItem.vtex-search-result-3-x-galleryItem--normal.vtex-search-result-3-x-galleryItem--grid-3.pa4"
					).length;
				});

				if (productsCount >= 10) {
					break;
				}

				// Scroll to the bottom to load more products
				await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
				await page.waitForTimeout(2000); // Wait a bit for the new products to load
			}
		}

		// Esperar hasta que al menos 10 productos se hayan cargado
		await waitForProducts(page);

		await page.waitForTimeout(3000);

		// Extraer los datos de los productos
		const products = await page.evaluate(() => {
			const items = Array.from(
				document.querySelectorAll(
					"div.vtex-search-result-3-x-galleryItem.vtex-search-result-3-x-galleryItem--normal.vtex-search-result-3-x-galleryItem--grid-3.pa4"
				)
			);
			return items.slice(0, 30).map((item) => {
				// NOMBRE DEL PRODUCTO
				const name = item
					.querySelector(
						"span.vtex-product-summary-2-x-productBrand.vtex-product-summary-2-x-brandName.t-body"
					)
					?.textContent.trim();

				// MARCA DEL PRODUCTO
				const brandName = item
					.querySelector("span.vtex-product-summary-2-x-productBrandName")
					?.textContent.trim();

				// Extraer la cantidad total en mililitros y el precio por mililitro
				const totalMeasurementUnit = item
					.querySelector("div.olimpica-calculate-pum-0-x-unitInfo")
					?.textContent.trim();
				const priceMeasurement = item
					.querySelector("div.olimpica-calculate-pum-0-x-PUMInfo")
					?.textContent.trim();

				// PRECIO
				const priceContainer = item.querySelector(
					"span.olimpica-dinamic-flags-0-x-currencyContainer"
				);
				const priceParts = priceContainer
					? Array.from(priceContainer.querySelectorAll("span")).map((span) =>
							span.textContent.trim()
					  )
					: [];
				const priceDiscounted = priceParts.join("");
				const numericPrice = parseInt(priceDiscounted.replace(/[^0-9]/g, ""), 10);

				//URL DE LA IMAGEN
				const imageUrl = item.querySelector(
					"img.vtex-product-summary-2-x-imageNormal.vtex-product-summary-2-x-image"
				)?.src;

				// LINK PRODUCTO
				const productLink = item.querySelector(
					"a.vtex-product-summary-2-x-clearLink.vtex-product-summary-2-x-clearLink--product-summary"
				)?.href;

				const originalPriceContainer = item.querySelector(
					"div.olimpica-dinamic-flags-0-x-strikePrice.false span.olimpica-dinamic-flags-0-x-currencyContainer"
				);
				const originalPriceParts = originalPriceContainer
					? Array.from(originalPriceContainer.querySelectorAll("span")).map((span) =>
							span.textContent.trim()
					  )
					: [];
				const originalPrice = originalPriceParts.join("");

				const numericOriginalPrice = originalPrice
					? parseInt(originalPrice.replace(/[^0-9]/g, ""), 10)
					: null;

				const discount = originalPrice
					? (
							((parseFloat(originalPrice.replace(/[^\d.-]/g, "")) -
								parseFloat(priceDiscounted.replace(/[^\d.-]/g, ""))) /
								parseFloat(originalPrice.replace(/[^\d.-]/g, ""))) *
							100
					  ).toFixed(0)
					: null;

				return {
					name,
					brandName,
					totalMeasurementUnit,
					priceMeasurement,
					imageUrl,
					productLink,
					priceDiscounted: numericPrice,
					priceWithoutDiscount: numericOriginalPrice || null,
					discount: parseFloat(discount) || null,
				};
			});
		});

		res.json(products);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Error during scraping", message: error });
	} finally {
		await browser.close();
	}
});

module.exports = router;
