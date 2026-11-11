import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { UPLOAD_DIR } from './config/uploads.js';
import { openapiDocument } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { routes } from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
// Render terminates TLS in front of the app, so trust its forwarding headers for req.ip.
app.set('trust proxy', 1);

if (env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

app.use(cors({ origin: env.FRONTEND_ORIGINS, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.get('/docs/openapi.json', (_req, res) => {
  res.json(openapiDocument);
});

const swaggerOptions = {
  customSiteTitle: 'Schoolyshop API',
  swaggerOptions: {
    withCredentials: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
};

// Keep one canonical documentation URL: /docs. A <base> tag makes the
// swagger-ui-express assets resolve under /docs even without a trailing slash.
const swaggerHtml = swaggerUi
  .generateHTML(openapiDocument, swaggerOptions)
  .replace('<head>', '<head>\n  <base href="/docs/">');
app.get('/docs', (_req, res) => {
  res.type('html').send(swaggerHtml);
});
app.get('/docs/api', (_req, res) => {
  res.redirect(301, '/docs');
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, swaggerOptions));
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);
