/**
* -> index.js: El punto de entrada de la aplicación donde se configura Express y se conecta con las rutas y middleware.
* routes: Define las rutas y utiliza los controladores correspondientes para manejar las solicitudes.
* controllers: Contiene controladores que manejan la lógica de la aplicación para cada ruta.

* middleware: Almacena middleware personalizados, como la autenticación y el manejo de errores.
* models: Define modelos de datos para interactuar con la base de datos u otras fuentes de datos.
* utils: Contiene utilidades compartidas que pueden ser utilizadas en diferentes partes de la aplicación.
* config: Almacena archivos de configuración, como configuraciones de base de datos o claves secretas.
*/

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");

//IMPORTAR RUTAS
const scrapingRoutes = require("./src/scrapingOlimpica");

const app = express();

// Configurar body-parser para aumentar el límite de tamaño de las solicitudes
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const { configureCORS } = require("./src/corsMiddleware");

// Middleware for parsing JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow all the incoming IP addresses
//app.use(cors());
app.use(configureCORS);
app.use(scrapingRoutes);

// Iniciar el servidor
app.listen(9000, () => {
	console.log("Servidor Express.js en ejecución en localhost:9000");
});
