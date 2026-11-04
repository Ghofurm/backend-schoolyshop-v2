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

app.get('/docs', swaggerUi.setup(openapiDocument, swaggerOptions));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, swaggerOptions));
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);
